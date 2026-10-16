import { supabase } from './supabase'
import { CREI_PROMPT_BANK } from './crei-prompts'

type Message = { role: 'system' | 'user' | 'assistant'; content: string }

export async function callLLM(messages: Message[], temperature = 0.9): Promise<string> {
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
      body: JSON.stringify({ messages, temperature }),
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

// The proxy already forces JSON output (responseMimeType), so this line and the
// code-fence stripping above are a safety net rather than the main guarantee.
const JSON_ONLY = 'Always respond with valid JSON only — no markdown, no backticks, no extra text.'

const newSeed = () => Math.random().toString(36).slice(2, 8)

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

const styleGuide: Record<GenerationStyle, string> = {
  formal: 'Professional/academic contexts. Use precise, formal language suitable for business writing or academic papers.',
  casual: 'Everyday casual conversation. Use natural, relaxed language as spoken between friends.',
  daily: 'Common daily life situations. Use practical, accessible language for everyday scenarios.',
  ielts: 'IELTS Academic exam preparation. Use band 7-9 academic vocabulary with complex sentence structures and contexts commonly tested in IELTS Writing/Speaking.',
};

// --- Auto-generate a word suggestion ---
export async function generateWord(
  hint: string,
  style: GenerationStyle,
  exclude: string[] = [],
): Promise<string> {
  const seed = newSeed()
  const content = await callLLM([
    {
      role: 'system',
      content: `You are a vocabulary coach. Suggest a single English word for a learner to study.
Style context: ${styleGuide[style]}
${JSON_ONLY}
Vary your suggestions widely — do not default to common or obvious words.`,
    },
    {
      role: 'user',
      content: `Style: ${style}
${hint.trim() ? `Topic / hint: ${hint.trim()}` : 'No specific topic — pick an interesting, useful word.'}
${exclude.length > 0 ? `Do NOT suggest any of these already-used words: ${exclude.join(', ')}` : ''}
Variation seed (for uniqueness): ${seed}

Suggest one English vocabulary word well-suited to the ${style} style.

Respond ONLY with this JSON:
{
  "word": "the suggested word"
}`,
    },
  ])

  const parsed = parseLLMJson<{ word: string }>(content, 'generateWord')
  return parsed.word
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

  const hardRules = `CRITICAL RULES — the feedback has three separate jobs. Do not blur them together:

1. "mistake" = DIAGNOSIS. Name the exact, concrete error and nothing else — the specific word, phrase, or grammar point that's wrong, and why. Point at it like a doctor naming a symptom, not a vague summary.
   BAD (vague): "The grammar could be better."
   GOOD (concrete): "'Audacious' is an adjective, but you used it like a verb — it can't take an object the way you wrote it."
   If the sentence has no real mistake (score 8+), set "mistake" to null. Never invent a nitpick just to fill the field.

2. "what_worked" = STRENGTH. Name ONE specific, real thing the learner did right — a word choice, a structure, a natural phrasing — and say why it works. Never generic praise ("good job", "nice sentence").
   BAD (vague): "Good use of the word."
   GOOD (concrete): "Placing 'audacious' right after the subject gives the sentence a strong, direct rhythm."
   If there is genuinely nothing to praise, write "Nothing yet — see the fix below." Never output the literal string "null" for this field.

3. "fix" = ACTION. The one specific change to make, stated as an instruction, not a re-diagnosis of the mistake. This is what the learner should DO differently next time — not what went wrong (that's "mistake"'s job).
   The learner is practicing the TARGET WORD — "fix" must teach them to use THAT WORD correctly, never suggest abandoning it. If the word doesn't fit the context they wrote, suggest a different context where it does fit — keep the word, change the sentence around it.

4. "better_example" MUST contain the target word (or a natural inflection: plural, past tense, -ing, -ly, etc.). NEVER replace the target word with a synonym. If the learner used the wrong part of speech, show the correct part of speech of the SAME WORD (e.g. "rhetoric" → "rhetorical", "decide" → "decision") — not a different word.`;

  const systemCoach = `You are an expert English language coach. A learner is practicing vocabulary by writing sentences.
Evaluate their sentence briefly and naturally — like a friendly native speaker coach, not a grammar robot.
Be honest but encouraging. ${JSON_ONLY}

Scoring rubric (use this to calibrate, do not add to response):
- 1–3: Wrong word use, or sentence is broken / incomprehensible.
- 4–5: Understandable but unnatural; likely a direct translation pattern.
- 6–7: Correct grammar, natural-ish, but a native speaker might phrase it differently.
- 8: Good — natural, correct, and clear. Minor polish possible.
- 9: Very good — a native speaker might say exactly this; only a stylistic tweak separates it from perfect.
- 10: Perfect — idiomatic, precise, and could appear in published writing. Award 10 when it is genuinely earned; do not withhold it to "leave room to improve."

${hardRules}`;

  const systemRoast = `You are a brutal IELTS Speaking & Writing examiner with 20 years of experience. You do not soften feedback.
Style:
- Address the learner directly. Use second person.
- If their sentence is a direct Bengali/Hindi calque ("because of that", "do the needful", "discuss about"), name it as such — say it sounds like translation, not English.
- If they used a connector incorrectly, say which band that mistake costs them.
- If they used the wrong part of speech of the target word, name that explicitly (e.g. "'rhetoric' is a noun; you used it as an adjective — the adjective is 'rhetorical'") in "mistake".
- "fix" must be an instruction, not a diagnosis: tell them what to DO, not what they got wrong again.
- The "better_example" must be one band higher than what the learner wrote.
- Never use exclamation marks. Never call the learner "you" warmly — clinical, not friendly.
${JSON_ONLY}

${hardRules}`;

  const topicLine = topic
    ? `Topic context: today's session is about ${topic}. If the learner's sentence is on-topic, that is a plus; if off-topic, that is fine — judge the language only.`
    : '';

  const content = await callLLM([
    {
      role: 'system',
      content: roast ? systemRoast : systemCoach,
    },
    {
      role: 'user',
      content: `Word: ${word}
Definition: ${definition}
Learner sentence: ${sentence}
${topicLine}

Respond ONLY with this JSON:
{
  "verdict": "natural" | "unnatural" | "close",
  "score": 1-10,
  "mistake": "one short sentence naming the exact error, or null if there genuinely isn't one",
  "what_worked": "one short sentence naming something specific that was done right",
  "fix": "one short sentence — the specific action to take, or null",
  "better_example": "a better sentence or null"
}`,
    },
  ], 0.2)

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
  const seed = newSeed()
  const content = await callLLM([
    {
      role: 'system',
      content: `You are a vocabulary teacher. Generate example sentences for English learners.
Style context: ${styleGuide[style]}
${JSON_ONLY}
Each call must produce a fresh sentence — never repeat previously generated ones.`,
    },
    {
      role: 'user',
      content: `Word: ${word}
Definition: ${definition}
Style: ${style}
Variation seed (ensure uniqueness): ${seed}
${exclude.length > 0 ? `Do NOT reuse or closely paraphrase these sentences: ${exclude.map(s => `"${s}"`).join(', ')}` : ''}

Generate 1 natural example sentence that clearly shows the meaning of this word in a ${style} context.

Respond ONLY with this JSON:
{
  "sentence": "the example sentence"
}`,
    },
  ])

  const parsed = parseLLMJson<{ sentence?: unknown }>(content, 'generateExampleSentence')
  if (typeof parsed.sentence !== 'string' || !parsed.sentence.trim()) {
    throw new Error('generateExampleSentence: model returned no sentence')
  }
  return parsed.sentence
}

// --- Auto-generate collocations ---
export async function generateCollocations(word: string, definition: string, style: GenerationStyle = 'daily', exclude: string[] = []): Promise<string[]> {
  const seed = newSeed()
  const content = await callLLM([
    {
      role: 'system',
      content: `You are a vocabulary coach. Generate common collocations for English learners.
Style context: ${styleGuide[style]}
${JSON_ONLY}
Each call must produce fresh collocations — never repeat previously generated ones.`,
    },
    {
      role: 'user',
      content: `Word: ${word}
Definition: ${definition}
Style: ${style}
Variation seed (ensure uniqueness): ${seed}
${exclude.length > 0 ? `Do NOT include any of these already-shown collocations: ${exclude.join(', ')}` : ''}

Generate 5 natural collocations (common phrases or word pairings) for this word in a ${style} context.

Respond ONLY with this JSON:
{
  "collocations": ["phrase 1", "phrase 2", "phrase 3", "phrase 4", "phrase 5"]
}`,
    },
  ])

  const parsed = parseLLMJson<{ collocations?: unknown }>(content, 'generateCollocations')
  return requireStringList(parsed.collocations, 'generateCollocations')
}

// --- Auto-generate synonyms ---
export async function generateSynonyms(word: string, definition: string, style: GenerationStyle = 'daily', exclude: string[] = []): Promise<string[]> {
  const seed = newSeed()
  const content = await callLLM([
    {
      role: 'system',
      content: `You are a vocabulary depth coach. Your job is to expand a learner's understanding of a word — not just replace it.
Style context: ${styleGuide[style]}
${JSON_ONLY}
Each call must produce fresh synonyms — never repeat previously generated ones.`,
    },
    {
      role: 'user',
      content: `Word: ${word}
Definition: ${definition}
Style: ${style}
Variation seed (ensure uniqueness): ${seed}
${exclude.length > 0 ? `Do NOT include any of these already-shown synonyms: ${exclude.join(', ')}` : ''}

Generate 4-5 synonyms that reveal the full character of this word.

STRICT RULES:
- At least 3 out of 5 must be words a regular English speaker uses in daily conversation
- The remaining 1-2 can be slightly more expressive — but still words you'd hear in a news article or casual book, NOT academic or rare
- Cover different shades: intensity, formality, connotation — but stay grounded
- Each synonym should make the learner think "oh, so this word leans THAT way too"
- NO obscure, archaic, literary, or dictionary-only words

Respond ONLY with this JSON:
{
  "synonyms": ["synonym1", "synonym2", "synonym3", "synonym4", "synonym5"]
}`,
    },
  ])

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
  const seed = newSeed()
  const posLabel = pos ?? 'all parts of speech'
  const content = await callLLM([
    {
      role: 'system',
      content: `You are a dark, analytical vocabulary intelligence system. You give cold, data-driven insights about language learning strategy — no fluff, no encouragement, just sharp analysis. ${JSON_ONLY}`,
    },
    {
      role: 'user',
      content: `Part of speech: ${posLabel}
CEFR level: ${cefr}
Variation seed: ${seed}

Analyze why a learner should focus on ${posLabel} at the ${cefr} level. Be blunt, specific, and insightful — reference real language acquisition data or patterns where relevant.

Respond ONLY with this JSON:
{
  "headline": "a sharp 8-12 word headline that frames why this matters",
  "why": "2-3 sentences explaining the strategic value of learning ${posLabel} at ${cefr}",
  "strategy": "2-3 sentences on the most effective method to learn this combination",
  "power_insight": "one striking, unexpected fact or pattern about ${posLabel} at ${cefr} level that most learners don't know",
  "focus_score": a number 1-10 rating how critical this POS+CEFR combo is for fluency
}`,
    },
  ], 0.85)

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
  const seed = newSeed()
  const content = await callLLM([
    {
      role: 'system',
      content: `You are helping someone practice using vocabulary in real spoken conversation. Generate a short, natural two-line exchange between two people — the kind of thing that could actually happen in conversation or a text thread. ${JSON_ONLY}`,
    },
    {
      role: 'user',
      content: `Word: ${word}
Definition: ${definition}
Variation seed (for uniqueness): ${seed}
${exclude.length > 0 ? `Do NOT reuse or closely paraphrase these existing lines:\n${exclude.map(s => `"${s}"`).join('\n')}` : ''}

Write a short, casual two-line exchange between two people — contractions, everyday phrasing, no textbook language. The FIRST line sets up a situation or asks something. The SECOND line is a natural reply that uses "${word}" clearly, so its meaning is obvious from context and the learner could reuse the phrasing themselves in real life.

Respond ONLY with this JSON:
{
  "setup": "the first person's line",
  "response": "the second person's line, using \\"${word}\\""
}`,
    },
  ])

  return parseLLMJson<{ setup: string; response: string }>(content, 'generateClozeSentence')
}

// --- Generate a memory trick (structured mnemonic with 7 techniques) ---
export async function generateMemoryTrick(word: string, definition: string): Promise<{
  technique: string;
  breakdown: string;
  clarification: string;
}> {
  const seed = newSeed()
  const content = await callLLM([
    {
      role: 'system',
      content: `You are an expert vocabulary mnemonics coach. For every word you ALWAYS find the best memory trick using exactly one of these 7 techniques. Your goal: make the word's meaning impossible to forget.

TECHNIQUE 1 — phonetic_split
Break the word into 2–3 parts that look or sound like familiar everyday words. Use "+" for the split and "→" to show the connection to the meaning.
✅ adept → "a + dept → like a department expert — totally skilled at their job 🎯"
✅ eloquent → "el + o + quent → like 'a queen speaking' — expresses ideas beautifully"
✅ relevant → "re + levan → re-elevates the topic — brings it back to what matters"

TECHNIQUE 2 — root_hook
Use a recognizable Latin, Greek, French, or Old English root, prefix, or suffix.
✅ benevolent → "bene (like benefit, beneficial) + vol (wanting) → wanting good things for others 💚"
✅ malevolent → "male (like malware, malfunction) + vol → actively wanting harm for others"
✅ credible → "cred (like credit, credentials) → worthy of being believed 🔑"

TECHNIQUE 3 — sound_alike
Find a familiar word that sounds similar and build a sharp, memorable link or contrast.
✅ arid → "sounds like 'a-rid' — rid of ALL moisture, bone dry ☀️"
✅ fiscal → "sounds like 'physical' — the physical body of your money situation"
✅ morose → "sounds like 'more-ose' — MORE than just sad, deeply gloomy"

TECHNIQUE 4 — micro_story
A single vivid sentence: a real character + specific action that perfectly encodes the meaning.
✅ ostentatious → "He parks a gold Ferrari at his kid's school just so everyone stares 👀"
✅ lethargic → "After a huge meal you sink into the sofa — heavy, slow, can't lift a finger"
✅ meticulous → "The surgeon checks every millimeter three times before making a single cut"

TECHNIQUE 5 — formula
Express the word as a simple equation or logical structure.
✅ ambivalent → "ambivalent = 'yes' + 'no' running in the same brain simultaneously ⚡"
✅ procrastinate → "procrastinate = task + (tomorrow × ∞)"
✅ bittersweet → "bittersweet = joy + sadness, inseparable"

TECHNIQUE 6 — contrast_anchor
Define sharply by what the word is NOT — the contrast locks in the exact meaning.
✅ taciturn → "NOT shy — they simply choose not to talk 🤐"
✅ frugal → "NOT broke — they have money, they just refuse to waste it"
✅ assertive → "NOT aggressive — they speak up firmly without attacking anyone"

TECHNIQUE 7 — analogy_bridge
"Like [something familiar] but [the exact distinction that makes this word specific]."
✅ renovate → "Like cleaning your house — except you're replacing walls, not just wiping them 🔨"
✅ mentor → "Like a teacher — but personal, they chose YOU and guide you one-on-one"
✅ collaborate → "Like working — but every decision is made together, not handed down"

---
After the trick line always add a clarification in this format:
"👉 [One natural sentence that uses the word correctly in context.]"

Selection rules:
- You MUST choose the technique that makes the meaning most memorable — not the easiest one
- phonetic_split is NOT the default. Only use it if the word has parts that genuinely sound like real familiar words and the link is strong and accurate — otherwise skip it entirely
- Rank all 7 techniques mentally for this specific word, then pick the highest-ranked one; use the variation seed in the request to push toward a less obvious technique
- The trick MUST match the given definition exactly — never invent or bend a meaning to fit a trick
- Breakdown ≤ 18 words. Clarification ≤ 16 words. One emoji in the breakdown, max.

${JSON_ONLY}`,
    },
    {
      role: 'user',
      content: `Word: ${word}
Definition: ${definition}
Variation seed: ${seed}

Choose the best technique for "${word}" and create a trick that perfectly matches the definition above.

Respond ONLY with this JSON:
{
  "technique": "phonetic_split | root_hook | sound_alike | micro_story | formula | contrast_anchor | analogy_bridge",
  "breakdown": "the mnemonic line (the actual trick)",
  "clarification": "👉 natural sentence using the word in context"
}`,
    },
  ], 0.85)

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
  const seed = newSeed()

  const content = await callLLM(
    [
      {
        role: 'system',
        content: `You are a plain-English dictionary. Your only job is to make the reader instantly understand what a word means — nothing more.
Style context: ${styleGuide[style]}
${JSON_ONLY}

DEFINITION RULE:
- One simple, clear sentence (or a short clause) that states what the word means — plain dictionary meaning, not a riddle, metaphor, joke, or creative flourish.
- Use plain, everyday words to explain it. Avoid using rarer synonyms of the word itself to define it.
- No gimmicks: no "Not X — Y" contrast tricks, no forced analogies, no "Basically:" prefixes, no root-word breakdowns. Just say what it means.
- Keep it short — roughly 4–14 words. Long enough to be accurate, short enough to read in one glance.
- Each call must produce a fresh phrasing — never repeat or closely paraphrase a previous one.

REGISTER DETECTION RULE:
Classify how this word is actually used in real English, independent of the style context above:
- "formal" — professional, academic, or written register (e.g. "commence", "utilize")
- "casual" — everyday spoken conversation (e.g. "grab", "awesome")
- "literary" — poetic, old-fashioned, or found mainly in literature (e.g. "forsooth", "beguile")
- "slang" — informal/colloquial, often region- or generation-specific (e.g. "lit", "sus")
Pick the ONE register that best matches how people actually use this word most of the time.`,
      },
      {
        role: 'user',
        content: `Word: ${word}
Style: ${style}
Variation seed (ensure uniqueness): ${seed}
${excludeDefinition ? `Do NOT reuse or closely paraphrase this definition: "${excludeDefinition}"` : ''}

Respond ONLY with this JSON — no extra fields, no markdown:
{
  "definition": "a simple, plain-English sentence stating what the word means",
  "register": "formal | casual | literary | slang"
}`,
      },
    ],
    0.5
  )

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
  const seed = newSeed()

  const content = await callLLM(
    [
      {
        role: 'system',
        content: `You are a vocabulary coach building a complete study card for one English word.
Style context: ${styleGuide[style]}
${JSON_ONLY}

Fill the fields IN ORDER. Write the definition first; every later field must match that exact meaning.

1. definition — one plain-English sentence, roughly 4–14 words, stating what the word means. No metaphors, no "Not X — Y" tricks, no root breakdowns, no rarer synonyms of the word itself.
2. register — how the word is actually used in real English, independent of the style context: "formal" (commence), "casual" (grab), "literary" (beguile), or "slang" (sus). Pick ONE.
3. example_sentence — one natural sentence that makes the meaning obvious from context, in the ${style} style.
4. synonyms — 4–5 synonyms covering different shades (intensity, formality, connotation). At least 3 must be everyday conversational words; none obscure, archaic, or dictionary-only.
5. collocations — 5 natural, common phrases or word pairings using the word, in the ${style} style.
6. memory_trick — choose the ONE technique that makes the meaning most memorable for THIS word:
   - root_hook: a recognizable Latin/Greek/French root ("bene (like benefit) + vol (wanting) → wanting good for others 💚")
   - sound_alike: a familiar similar-sounding word with a sharp link ("arid → 'a-rid' — rid of ALL moisture ☀️")
   - micro_story: one vivid sentence with a character + action ("He parks a gold Ferrari at his kid's school just so everyone stares 👀")
   - formula: a simple equation ("ambivalent = 'yes' + 'no' in the same brain ⚡")
   - contrast_anchor: define by what it is NOT ("taciturn → NOT shy — they simply choose not to talk 🤐")
   - analogy_bridge: "Like [familiar thing] but [exact distinction]"
   - phonetic_split: split into parts that sound like real everyday words — ONLY if the link is genuinely strong; never the default.
   Breakdown ≤ 18 words, max one emoji. Clarification starts with "👉 " and is one natural sentence (≤ 16 words) using the word. The trick must match the definition exactly — never bend the meaning.`,
      },
      {
        role: 'user',
        content: `Word: ${word}
Style: ${style}
Variation seed (ensure uniqueness): ${seed}

Respond ONLY with this JSON:
{
  "definition": "...",
  "register": "formal | casual | literary | slang",
  "example_sentence": "...",
  "synonyms": ["...", "...", "...", "..."],
  "collocations": ["...", "...", "...", "...", "..."],
  "memory_trick": {
    "technique": "root_hook | sound_alike | micro_story | formula | contrast_anchor | analogy_bridge | phonetic_split",
    "breakdown": "the mnemonic line",
    "clarification": "👉 natural sentence using the word"
  }
}`,
      },
    ],
    0.7
  )

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
  const wordCount = userText.trim().split(/\s+/).filter(Boolean).length;

  const system = `You are a 20-year veteran IELTS Writing examiner. You grade with Band 9 honesty — no softening, no congratulating mediocrity, no false encouragement. Your only loyalty is to the learner's score on exam day.

CONTEXT:
The learner is practicing Drill 6 (CREI) — writing a single IELTS Task 2 body paragraph that follows this structure:
  C — Claim: a clear position that answers the prompt
  R — Reason: why the claim holds
  E — Real-life Example: concrete, specific, named (not abstract)
  I — Insight: a sharp implication that ties back to the claim

You will receive the prompt the learner answered and the paragraph they wrote. Grade it.

GRADING — four IELTS criteria on the 9-band scale (half-bands allowed: 5.0, 5.5, 6.0…). Calibrate for paragraph-level work, not whole essay:
  • task_response — Clear claim defended throughout? Claim relevant to the prompt? Example concrete and named?
  • coherence — Does the paragraph follow CREI flow? Are connectors used ACCURATELY (not just frequently)?
  • lexical — Precise, varied vocabulary. Repeating "good" three times = Band 5. Three shades ("substantial / considerable / significant") = Band 7+.
  • grammar — Variety of structures (simple + compound + complex). Articles, subject-verb agreement, tense consistency.

Overall band = average of the four, rounded to nearest 0.5.

LEARNER-SPECIFIC WEAK SPOTS — scan for these every time. If found, add an entry to flagged_issues with the matching code:
  • for_that_calque — "for that" used as a connector (Bengali translation artifact; should be "as a result" or "consequently")
  • missing_article — definite/indefinite article dropped (e.g. "government must invest" → "the government must invest")
  • where_misuse — "where" used for a non-place clause
  • sv_agreement — subject-verb agreement slip
  • off_thesis — body sentence drifts away from the claim stated at the top of the paragraph
  • other — any other concrete issue worth flagging

HARD CALIBRATION RULE — your sub-band scores must reflect your diagnostics. A diagnostic that names "multiple errors" followed by a Band 6.5+ score is a contradiction. Resolve the contradiction by LOWERING the score, never by softening the diagnostic. Specifically:
  • Grammar: if you name 2+ high-frequency errors (SV-agreement, missing articles, tense slips), grammar CANNOT exceed 6.0. 3+ errors = 5.5 max.
  • Lexical: if you name ANY Band-5 phrasing ("good," "bad," "big problem," "a lot of," "very important"), lexical CANNOT exceed 6.0 — regardless of how sophisticated the rest of the vocabulary is.
  • Coherence: if you name a misused connector (e.g. "For that" used as causal link), coherence CANNOT exceed 6.5.
  • Task Response: if you name "drift," "off-thesis," or partial answering, task_response CANNOT exceed 6.5.

HEDGE WORDS DO NOT REDUCE CAPS. The phrases "slightly," "somewhat," "a little," "minor," "mild," or any other softener do not lower these caps. The presence of the flaw triggers the cap, not its severity. If you write "you drift slightly," task_response is still capped at 6.5.

WORKED EXAMPLE — drift cap is binary, not graded by severity.
  Scenario: A paragraph argues clearly that cities need better public transport, supports the claim with a specific named example (Singapore MRT), but the closing sentence pivots to mention pedestrian safety.
  WRONG scoring: task_response = 7.0 with rationale "the drift is small."
  CORRECT scoring: task_response = 6.5. The drift is named, so the cap fires. The size of the drift is irrelevant — even one drifting sentence triggers the cap. The cap is binary: named drift → 6.5 ceiling.

Band 7 requires CLEAN across all four. A single named flaw in any criterion blocks Band 7 overall.

RULES:
  1. Quote the exact offending fragment in line_reference. Do not paraphrase.
  2. Be specific. NEVER write "grammar needs work." Write: "'students is happy' — subject-verb agreement, should be 'students are happy'."
  3. If the paragraph is Band 5, say Band 5. If the example is generic ("pollution is bad"), call it generic and demand a named, specific one.
  4. Pick ONE sentence with the highest upgrade potential (not necessarily the worst — the one where a Band 9 rewrite teaches the most). Rewrite it at Band 9. Explain why it is better.
  5. VOICE — ALL diagnostics MUST be in second person. NEVER use "the paragraph," "the argument," "the claim," "the example." Use "your paragraph," "your argument," "your claim," "your example."
     CORRECT: "Your example is specific and named."
     FORBIDDEN: "The example is specific and named."
     This rule applies to every text field in the JSON: verdict, per_criterion diagnoses, flagged_issues explanations, and band9_rewrite.why_better. No exceptions.

     ABSOLUTE FIRST-PERSON BAN for band9_rewrite.why_better:
     The pronouns "I", "me", "my", "mine" must NOT appear anywhere in this field. If your first draft starts with "I" or contains "my," REWRITE before returning the response.

     FORBIDDEN: "I replaced 'good' with 'indispensable'..."
     FORBIDDEN: "My rewrite uses a subordinate clause..."
     REQUIRED: "Your sentence used 'good'; the rewrite swaps it for 'indispensable'..."
     REQUIRED: "The rewrite uses a subordinate clause for complexity..."
  6. Verdict is one short sentence — the brutal one-line you would give walking out of the exam hall.
  7. If no issues found, return flagged_issues as an empty array [], never null and never omitted.

OUTPUT: valid JSON only. No markdown, no backticks, no prose outside the JSON.

Respond with EXACTLY this shape:
{
  "bands": {
    "task_response": <number 1.0-9.0>,
    "coherence":     <number 1.0-9.0>,
    "lexical":       <number 1.0-9.0>,
    "grammar":       <number 1.0-9.0>,
    "overall":       <number 1.0-9.0, average rounded to nearest 0.5>
  },
  "verdict": "<one short sentence>",
  "per_criterion": {
    "task_response": { "diagnosis": "<one or two sentences naming the specific problem>", "example_fix": "<short concrete fix, or null>" },
    "coherence":     { "diagnosis": "...", "example_fix": "..." },
    "lexical":       { "diagnosis": "...", "example_fix": "..." },
    "grammar":       { "diagnosis": "...", "example_fix": "..." }
  },
  "flagged_issues": [
    {
      "code": "for_that_calque|missing_article|where_misuse|sv_agreement|off_thesis|other",
      "line_reference": "<exact quoted fragment from the learner's text>",
      "explanation": "<why this costs band score>",
      "fix": "<the corrected fragment>"
    }
  ],
  "band9_rewrite": {
    "original_sentence": "<exact sentence from learner's text>",
    "rewritten": "<Band 9 version of that same sentence>",
    "why_better": "<one or two sentences naming the specific upgrade — lexical, structural, or rhetorical>"
  }
}`;

  const user = `IELTS Task 2 prompt:
${prompt}

Question type: ${questionType}

Learner's body paragraph (${wordCount} words):
${userText}

Grade per the rubric above. Return JSON only.`;

  // Low temperature: without few-shot calibration, this is our only knob for
  // band-score stability across submissions.
  const content = await callLLM(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    0.2,
  );

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

  const system = `You are an IELTS Task 2 examiner with 15 years of experience coaching learners. You are given a fixed exam prompt — do not alter, paraphrase, or repeat it. Your only job is to write ONE sharp framing tip for the learner.

TIP — teaches the learner how to score higher on THIS specific prompt. Voice contract:
  • Imperative, not advisory.
  • Tied to a Band consequence where possible.
  • Concrete, not abstract.

  WRONG (advisory): "Consider naming a real institution or country."
  RIGHT (imperative + consequence): "Name a specific country, institution, or recent policy. Generic 'students' or 'schools' caps your example at Band 6."

  FORBIDDEN openers: "Consider", "Try to", "It might help to", "You should think about", "Make sure to"
  REQUIRED: open with an imperative verb (Name, Cite, Anchor, Replace, Pick, Frame, Avoid, etc.)

OUTPUT: valid JSON only — no markdown, no backticks, no extra prose.

Respond with EXACTLY this shape:
{
  "tip": "<one sharp framing tip in imperative voice with a Band consequence>"
}`;

  const user = `Prompt: ${prompt}
Question type: ${questionType}
Domain: ${domain}

Write one sharp framing tip for this exact prompt, per the voice contract. Return JSON only.`;

  const content = await callLLM(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    0.85,
  );

  const raw = parseLLMJson<{ tip?: unknown }>(content, 'generateCREIPrompt');
  const tip = typeof raw?.tip === 'string' ? raw.tip.trim() : '';

  if (!tip) throw new Error('generateCREIPrompt: empty tip from model');

  return { prompt, questionType, domain, tip };
}
