import { supabase } from './supabase'
import { CREI_PROMPT_BANK } from './crei-prompts'

// Prompts live in the llm-proxy edge function (supabase/functions/llm-proxy/
// tasks.ts). The client names a task and sends its inputs; the server adds
// what it knows about the learner, builds the prompt and calls the model.
// Everything below a call — parsing, clamping, guarding against bad output —
// stays here, next to the UI that depends on it.

type TaskParams = Record<string, string | string[] | boolean | null | undefined>

export async function callTask(task: string, params: TaskParams): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) throw new Error('Not authenticated')

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/llm-proxy`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ task, params }),
    }
  )

  if (!response.ok) {
    const errBody = await response.json().catch(() => null)
    const detail = errBody?.error?.message ?? errBody?.error
    throw new Error(`LLM request failed (HTTP ${response.status})${detail ? `: ${detail}` : ''}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

// Strip code fences and parse the model's JSON reply. If prose surrounds the
// JSON, fall back to the outermost {...} block. Throws a labelled error
// instead of a bare SyntaxError so failures are traceable per feature.
function parseLLMJson<T = unknown>(content: string, context: string): T {
  const clean = content.replace(/```json|```/gi, '').trim()
  try {
    return JSON.parse(clean) as T
  } catch {
    const start = clean.indexOf('{')
    const end = clean.lastIndexOf('}')
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(clean.slice(start, end + 1)) as T
      } catch { /* fall through */ }
    }
    throw new Error(`${context}: model returned malformed JSON`)
  }
}

// Keep only non-empty strings from a model-returned list.
function toStringList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string' && !!s.trim()) : []
}

// Same, but throw instead of handing the page an empty/undefined list.
function requireStringList(v: unknown, context: string): string[] {
  const list = toStringList(v)
  if (list.length === 0) throw new Error(`${context}: model returned no usable items`)
  return list
}

// Read a numeric field the model may send as 8, "8" or "8/10"; NaN if absent.
function toNumber(v: unknown): number {
  return typeof v === 'number' ? v : parseFloat(String(v))
}

function clampScore(v: unknown, min: number, max: number, context: string): number {
  const n = toNumber(v)
  if (!Number.isFinite(n)) throw new Error(`${context}: model returned no valid number`)
  return Math.min(max, Math.max(min, n))
}

export type GenerationStyle = 'formal' | 'casual' | 'daily' | 'ielts';

// --- Auto-generate a word suggestion ---
// The server skips words already in the learner's library.
export async function generateWord(
  hint: string,
  style: GenerationStyle,
  exclude: string[] = [],
): Promise<string> {
  const content = await callTask('suggest_word', { hint: hint.trim(), style, exclude })
  const parsed = parseLLMJson<{ word?: unknown }>(content, 'generateWord')
  if (typeof parsed.word !== 'string' || !parsed.word.trim()) {
    throw new Error('generateWord: model returned no word')
  }
  return parsed.word.trim()
}

// --- Sentence scoring ---
const SENTENCE_VERDICTS = ['natural', 'unnatural', 'close'] as const;

// Irregular forms a prefix check can't see (seek → sought). Short verbs only:
// longer words share a prefix with their forms (undertake → undertook).
const IRREGULAR_FORMS: Record<string, string[]> = {
  be: ['was', 'were', 'been', 'is', 'are', 'am'],
  bear: ['bore', 'borne'], begin: ['began', 'begun'], bind: ['bound'], bite: ['bit', 'bitten'],
  bring: ['brought'], build: ['built'], buy: ['bought'], catch: ['caught'], choose: ['chose', 'chosen'],
  cling: ['clung'], dig: ['dug'], do: ['did', 'done'], draw: ['drew', 'drawn'], drive: ['drove', 'driven'],
  eat: ['ate', 'eaten'], fall: ['fell', 'fallen'], feel: ['felt'], fight: ['fought'], find: ['found'],
  flee: ['fled'], fly: ['flew', 'flown'], forget: ['forgot', 'forgotten'], freeze: ['froze', 'frozen'],
  give: ['gave', 'given'], go: ['went', 'gone'], grind: ['ground'], grow: ['grew', 'grown'],
  hold: ['held'], keep: ['kept'], know: ['knew', 'known'], lay: ['laid'], lead: ['led'], leave: ['left'],
  lend: ['lent'], lie: ['lay', 'lain', 'lying'], lose: ['lost'], make: ['made'], mean: ['meant'],
  meet: ['met'], ride: ['rode', 'ridden'], rise: ['rose', 'risen'], run: ['ran'], say: ['said'],
  see: ['saw', 'seen'], seek: ['sought'], sell: ['sold'], send: ['sent'], shake: ['shook', 'shaken'],
  shine: ['shone'], shrink: ['shrank', 'shrunk'], sing: ['sang', 'sung'], sink: ['sank', 'sunk'],
  slay: ['slew', 'slain'], speak: ['spoke', 'spoken'], spend: ['spent'], spin: ['spun'],
  stand: ['stood'], steal: ['stole', 'stolen'], sting: ['stung'], stink: ['stank', 'stunk'],
  strike: ['struck'], strive: ['strove', 'striven'], swear: ['swore', 'sworn'], swim: ['swam', 'swum'],
  take: ['took', 'taken'], teach: ['taught'], tear: ['tore', 'torn'], tell: ['told'], think: ['thought'],
  throw: ['threw', 'thrown'], tread: ['trod', 'trodden'], wake: ['woke', 'woken'], wear: ['wore', 'worn'],
  weave: ['wove', 'woven'], weep: ['wept'], win: ['won'], wind: ['wound'], write: ['wrote', 'written'],
  die: ['dying'],
};

function containsWordForm(text: string, word: string): boolean {
  const lower = text.toLowerCase();
  const w = word.toLowerCase().trim();
  const stem = w.slice(0, Math.max(4, w.length - 3));
  if (lower.includes(stem)) return true;
  return (IRREGULAR_FORMS[w] ?? []).some(form => new RegExp(`\\b${form}\\b`).test(lower));
}

export interface ScoreOptions {
  roast?: boolean;
  topic?: string | null;
}

export async function scoreSentence(
  word: string,
  definition: string,
  sentence: string,
  options: ScoreOptions = {},
) {
  const { roast = false, topic = null } = options;

  const content = await callTask('score_sentence', { word, definition, sentence, roast, topic })

  const parsed = parseLLMJson<{
    verdict: string;
    score: number;
    mistake: string | null;
    what_worked: string;
    fix: string | null;
    better_example: string | null;
  }>(content, 'scoreSentence')

  // Score drives the trophy wall (>= 9), so never pass through "8/10", 11 or a missing value.
  parsed.score = Math.round(clampScore(parsed.score, 1, 10, 'scoreSentence'));
  if (!(SENTENCE_VERDICTS as readonly string[]).includes(parsed.verdict)) {
    parsed.verdict = parsed.score >= 8 ? 'natural' : parsed.score >= 5 ? 'close' : 'unnatural';
  }

  // Defensive: the better_example must actually contain the target word.
  // If the LLM ignored the constraint, drop the misleading suggestion rather
  // than show the learner a "better" sentence that abandons the word they're practicing.
  if (parsed.better_example && typeof parsed.better_example === 'string') {
    if (!containsWordForm(parsed.better_example, word)) {
      parsed.better_example = null;
    }
  }

  // Normalize literal "null" string and empty values
  if (typeof parsed.what_worked !== 'string' || parsed.what_worked.trim().toLowerCase() === 'null' || !parsed.what_worked.trim()) {
    parsed.what_worked = 'Nothing yet — see the fix below.';
  }
  if (typeof parsed.mistake !== 'string' || !parsed.mistake.trim() || parsed.mistake.trim().toLowerCase() === 'null') {
    parsed.mistake = null;
  }
  if (typeof parsed.fix === 'string' && parsed.fix.trim().toLowerCase() === 'null') {
    parsed.fix = null;
  }

  return parsed;
}

// --- Generate an example sentence ---
export async function generateExampleSentence(word: string, definition: string, style: GenerationStyle = 'daily', exclude: string[] = []): Promise<string> {
  const content = await callTask('example_sentence', { word, definition, style, exclude })
  const parsed = parseLLMJson<{ sentence?: unknown }>(content, 'generateExampleSentence')
  if (typeof parsed.sentence !== 'string' || !parsed.sentence.trim()) {
    throw new Error('generateExampleSentence: model returned no sentence')
  }
  return parsed.sentence
}

// --- Auto-generate collocations ---
export async function generateCollocations(word: string, definition: string, style: GenerationStyle = 'daily', exclude: string[] = []): Promise<string[]> {
  const content = await callTask('collocations', { word, definition, style, exclude })
  const parsed = parseLLMJson<{ collocations?: unknown }>(content, 'generateCollocations')
  return requireStringList(parsed.collocations, 'generateCollocations')
}

// --- Auto-generate synonyms ---
export async function generateSynonyms(word: string, definition: string, style: GenerationStyle = 'daily', exclude: string[] = []): Promise<string[]> {
  const content = await callTask('synonyms', { word, definition, style, exclude })
  const parsed = parseLLMJson<{ synonyms?: unknown }>(content, 'generateSynonyms')
  return requireStringList(parsed.synonyms, 'generateSynonyms')
}

// --- POS + CEFR learning intelligence ---
export async function generatePOSTips(pos: string | null, cefr: string): Promise<{
  headline: string;
  why: string;
  strategy: string;
  power_insight: string;
  focus_score: number;
}> {
  const content = await callTask('pos_tips', { pos, cefr })

  const parsed = parseLLMJson<{
    headline: string;
    why: string;
    strategy: string;
    power_insight: string;
    focus_score: unknown;
  }>(content, 'generatePOSTips')
  return { ...parsed, focus_score: Math.round(clampScore(parsed.focus_score, 1, 10, 'generatePOSTips')) }
}

// --- Generate a natural two-line conversational exchange for cloze practice ---
export async function generateClozeSentence(word: string, definition: string, exclude: string[] = []): Promise<{ setup: string; response: string }> {
  const content = await callTask('cloze_dialogue', { word, definition, exclude })
  return parseLLMJson<{ setup: string; response: string }>(content, 'generateClozeSentence')
}

// --- Generate a memory trick (structured mnemonic with 7 techniques) ---
export async function generateMemoryTrick(word: string, definition: string): Promise<{
  technique: string;
  breakdown: string;
  clarification: string;
}> {
  const content = await callTask('memory_trick', { word, definition })

  const parsed = parseLLMJson<{
    technique?: unknown;
    breakdown?: unknown;
    clarification?: unknown;
  }>(content, 'generateMemoryTrick')
  if (typeof parsed.breakdown !== 'string' || !parsed.breakdown.trim()) {
    throw new Error('generateMemoryTrick: model returned no trick')
  }
  return {
    technique: typeof parsed.technique === 'string' ? parsed.technique : '',
    breakdown: parsed.breakdown,
    clarification: typeof parsed.clarification === 'string' ? parsed.clarification : '',
  }
}

export type DetectedRegister = 'formal' | 'casual' | 'literary' | 'slang';

const REGISTERS: readonly DetectedRegister[] = ['formal', 'casual', 'literary', 'slang'] as const;

export async function generateDefinition(
  word: string,
  style: GenerationStyle = 'daily',
  excludeDefinition = ''
): Promise<{
  definition: string
  register: DetectedRegister
}> {
  const content = await callTask('definition', { word, style, exclude_definition: excludeDefinition })

  const parsed = parseLLMJson<{
    definition?: unknown;
    register?: unknown;
  }>(content, 'generateDefinition')

  if (typeof parsed.definition !== 'string' || !parsed.definition.trim()) {
    throw new Error('generateDefinition: model returned no definition')
  }

  return {
    definition: parsed.definition,
    register: REGISTERS.includes(parsed.register as DetectedRegister)
      ? (parsed.register as DetectedRegister)
      : 'formal',
  }
}

// --- Autofill: every field for a new word in ONE request ---
// Replaces the definition → (examples, synonyms, collocations, memory trick)
// fan-out (5 requests) to stay inside the Gemini per-minute/per-day request
// limits. The per-field generators above stay for the individual regenerate buttons.
export interface WordBundle {
  definition: string;
  register: DetectedRegister;
  example_sentence: string;
  synonyms: string[];
  collocations: string[];
  memory_trick: { technique: string; breakdown: string; clarification: string } | null;
}

export async function generateWordBundle(word: string, style: GenerationStyle = 'daily'): Promise<WordBundle> {
  const content = await callTask('word_bundle', { word, style })

  const parsed = parseLLMJson<{
    definition?: unknown;
    register?: unknown;
    example_sentence?: unknown;
    synonyms?: unknown;
    collocations?: unknown;
    memory_trick?: { technique?: unknown; breakdown?: unknown; clarification?: unknown } | null;
  }>(content, 'generateWordBundle')

  if (typeof parsed.definition !== 'string' || !parsed.definition.trim()) {
    throw new Error('generateWordBundle: model returned no definition')
  }

  const mt = parsed.memory_trick
  const memory_trick = mt && typeof mt.breakdown === 'string' && mt.breakdown.trim()
    ? {
        technique: typeof mt.technique === 'string' ? mt.technique : '',
        breakdown: mt.breakdown,
        clarification: typeof mt.clarification === 'string' ? mt.clarification : '',
      }
    : null

  return {
    definition: parsed.definition,
    register: REGISTERS.includes(parsed.register as DetectedRegister)
      ? (parsed.register as DetectedRegister)
      : 'formal',
    example_sentence: typeof parsed.example_sentence === 'string' ? parsed.example_sentence : '',
    synonyms: toStringList(parsed.synonyms),
    collocations: toStringList(parsed.collocations),
    memory_trick,
  }
}

// --- IELTS Writing Lab — Drill 6 (CREI body paragraph grading) ---
export type CREIFlaggedCode =
  | 'for_that_calque'
  | 'missing_article'
  | 'where_misuse'
  | 'sv_agreement'
  | 'off_thesis'
  | 'other';

export interface CREIFeedback {
  bands: {
    task_response: number;
    coherence: number;
    lexical: number;
    grammar: number;
    overall: number;
  };
  verdict: string;
  per_criterion: Record<
    'task_response' | 'coherence' | 'lexical' | 'grammar',
    { diagnosis: string; example_fix: string | null }
  >;
  flagged_issues: Array<{
    code: CREIFlaggedCode;
    line_reference: string;
    explanation: string;
    fix: string;
  }>;
  band9_rewrite: {
    original_sentence: string;
    rewritten: string;
    why_better: string;
  } | null;
}

const FLAGGED_CODES: readonly CREIFlaggedCode[] = [
  'for_that_calque',
  'missing_article',
  'where_misuse',
  'sv_agreement',
  'off_thesis',
  'other',
] as const;

// Throws on a missing band instead of defaulting — a silent Band 1 looks like a
// real (harsh) grade to the learner.
function clampBand(n: unknown, field: string): number {
  return Math.round(clampScore(n, 1, 9, `scoreCREI (${field})`) * 2) / 2;
}

// Whitespace-insensitive substring check — the model often re-wraps quotes
// or normalises spaces when echoing a sentence back.
function normaliseForMatch(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

export async function scoreCREI(
  prompt: string,
  questionType: string,
  userText: string,
): Promise<CREIFeedback> {
  const content = await callTask('score_writing', { prompt, question_type: questionType, user_text: userText });

  const raw = parseLLMJson<{
    bands?: Record<string, unknown>;
    verdict?: unknown;
    per_criterion?: Record<string, { diagnosis?: unknown; example_fix?: unknown } | undefined>;
    flagged_issues?: unknown;
    band9_rewrite?: { original_sentence?: unknown; rewritten?: unknown; why_better?: unknown } | null;
  }>(content, 'scoreCREI');

  // ── Defensive parsing ─────────────────────────────────────────────
  const tr = clampBand(raw?.bands?.task_response, 'task_response');
  const co = clampBand(raw?.bands?.coherence, 'coherence');
  const lx = clampBand(raw?.bands?.lexical, 'lexical');
  const gr = clampBand(raw?.bands?.grammar, 'grammar');
  // Recompute overall — never trust the model's arithmetic.
  const overall = Math.round(((tr + co + lx + gr) / 4) * 2) / 2;

  // flagged_issues — keep only entries with valid codes, coerce unknown to 'other',
  // drop entries with no fragment AND no explanation (model echoing back empty objects).
  const rawIssues = Array.isArray(raw?.flagged_issues) ? raw.flagged_issues : [];
  const flagged_issues = rawIssues
    .filter((it: unknown): it is Record<string, unknown> => !!it && typeof it === 'object')
    .map((it: Record<string, unknown>) => {
      const code = (FLAGGED_CODES as readonly string[]).includes(it.code as string)
        ? (it.code as CREIFlaggedCode)
        : ('other' as CREIFlaggedCode);
      return {
        code,
        line_reference: typeof it.line_reference === 'string' ? it.line_reference : '',
        explanation: typeof it.explanation === 'string' ? it.explanation : '',
        fix: typeof it.fix === 'string' ? it.fix : '',
      };
    })
    .filter((it: { line_reference: string; explanation: string }) => it.line_reference || it.explanation);

  // band9_rewrite — refuse to show a hallucinated "original". Drop the entire
  // block if original_sentence is not present in the learner's text.
  let band9_rewrite: CREIFeedback['band9_rewrite'] = null;
  const rw = raw?.band9_rewrite;
  if (rw && typeof rw === 'object') {
    const original = typeof rw.original_sentence === 'string' ? rw.original_sentence : '';
    const rewritten = typeof rw.rewritten === 'string' ? rw.rewritten : '';
    const why = typeof rw.why_better === 'string' ? rw.why_better : '';
    if (
      original &&
      rewritten &&
      normaliseForMatch(userText).includes(normaliseForMatch(original))
    ) {
      band9_rewrite = { original_sentence: original, rewritten, why_better: why };
    } else if (original || rewritten) {
      // Model returned a rewrite but validation failed — most often a hallucinated
      // "original_sentence" that isn't actually in the learner's text. Useful to see
      // during calibration so we know when the model is fabricating.
      console.warn('[scoreCREI] dropped band9_rewrite block', {
        hadOriginal: !!original,
        hadRewritten: !!rewritten,
        original,
      });
    }
  }

  // per_criterion — coerce empty/"null" strings to actual null on example_fix.
  const normaliseFix = (v: unknown): string | null => {
    if (typeof v !== 'string') return null;
    const t = v.trim();
    if (!t || t.toLowerCase() === 'null') return null;
    return t;
  };
  const pickCrit = (key: 'task_response' | 'coherence' | 'lexical' | 'grammar') => {
    const c = raw?.per_criterion?.[key];
    return {
      diagnosis: typeof c?.diagnosis === 'string' ? c.diagnosis : '',
      example_fix: normaliseFix(c?.example_fix),
    };
  };

  return {
    bands: { task_response: tr, coherence: co, lexical: lx, grammar: gr, overall },
    verdict: typeof raw?.verdict === 'string' ? raw.verdict : '',
    per_criterion: {
      task_response: pickCrit('task_response'),
      coherence: pickCrit('coherence'),
      lexical: pickCrit('lexical'),
      grammar: pickCrit('grammar'),
    },
    flagged_issues,
    band9_rewrite,
  };
}

// --- IELTS Writing Lab — Drill 6 (CREI prompt generation) ---
export type CREIQuestionType = 'opinion' | 'discussion' | 'problem-solution' | 'two-part';

const CREI_DOMAINS = [
  'education',
  'technology',
  'environment',
  'health',
  'urban planning',
  'work',
  'society',
] as const;

export type CREIDomain = typeof CREI_DOMAINS[number];

export interface CREIPromptOptions {
  questionType?: CREIQuestionType;
  exclude?: string[];
}

export interface CREIPrompt {
  prompt: string;
  questionType: CREIQuestionType;
  domain: CREIDomain;
  tip: string;
}

// Topics come from a fixed, curated bank (CREI_PROMPT_BANK) rather than being
// LLM-generated — real IELTS titles are more reliable than model-invented ones.
// The model's only job here is writing the per-prompt examiner tip.
export async function generateCREIPrompt(opts: CREIPromptOptions = {}): Promise<CREIPrompt> {
  const exclude = opts.exclude ?? [];

  const candidates = CREI_PROMPT_BANK.filter(p =>
    (!opts.questionType || p.questionType === opts.questionType) && !exclude.includes(p.prompt)
  );
  // Fall back to ignoring the exclude list (never the questionType filter) if
  // everything matching the requested type has been used recently.
  const pool = candidates.length > 0
    ? candidates
    : CREI_PROMPT_BANK.filter(p => !opts.questionType || p.questionType === opts.questionType);

  if (pool.length === 0) {
    throw new Error(`generateCREIPrompt: no prompts in the bank for question type "${opts.questionType}"`);
  }

  const fixture = pool[Math.floor(Math.random() * pool.length)];
  const { prompt, questionType, domain } = fixture;

  const content = await callTask('writing_tip', { prompt, question_type: questionType, domain });

  const raw = parseLLMJson<{ tip?: unknown }>(content, 'generateCREIPrompt');
  const tip = typeof raw?.tip === 'string' ? raw.tip.trim() : '';

  if (!tip) throw new Error('generateCREIPrompt: empty tip from model');

  return { prompt, questionType, domain, tip };
}
