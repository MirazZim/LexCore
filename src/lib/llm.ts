import { supabase } from './supabase'

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

  if (!response.ok) throw new Error('LLM request failed')

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

export type GenerationStyle = 'formal' | 'casual' | 'daily' | 'ielts';

const styleGuide: Record<GenerationStyle, string> = {
  formal: 'Professional/academic contexts. Use precise, formal language suitable for business writing or academic papers.',
  casual: 'Everyday casual conversation. Use natural, relaxed language as spoken between friends.',
  daily:  'Common daily life situations. Use practical, accessible language for everyday scenarios.',
  ielts:  'IELTS Academic exam preparation. Use band 7-9 academic vocabulary with complex sentence structures and contexts commonly tested in IELTS Writing/Speaking.',
};

// --- Auto-generate a word suggestion ---
export async function generateWord(
  hint: string,
  style: GenerationStyle,
  exclude: string[] = [],
): Promise<string> {
  const seed = Math.random().toString(36).slice(2, 8)
  const content = await callLLM([
    {
      role: 'system',
      content: `You are a vocabulary coach. Suggest a single English word for a learner to study.
Style context: ${styleGuide[style]}
Always respond with valid JSON only — no markdown, no backticks, no extra text.
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

  const clean = content.replace(/```json|```/g, '').trim()
  const parsed = JSON.parse(clean)
  return parsed.word
}

// --- Sentence scoring ---
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

  const hardRules = `CRITICAL RULES (apply to BOTH "fix" and "better_example"):
1. The learner is practicing the TARGET WORD. Your "better_example" MUST contain the target word (or a natural inflection: plural, past tense, -ing, -ly, etc.). NEVER replace the target word with a synonym in your better_example. If the learner used the wrong part of speech, show the correct part of speech of the SAME WORD (e.g. "rhetoric" → "rhetorical", "decide" → "decision") — not a different word.
2. "fix" must teach the learner how to use the TARGET WORD correctly. Do not suggest abandoning the word. If the word does not fit the context they wrote, suggest a different context where it does fit — keep the word, change the sentence around it.
3. "what_worked" must be a real short sentence. If there is genuinely nothing positive, write "Nothing yet — see the fix below." Never output the literal string "null" for this field.`;

  const systemCoach = `You are an expert English language coach. A learner is practicing vocabulary by writing sentences.
Evaluate their sentence briefly and naturally — like a friendly native speaker coach, not a grammar robot.
Be honest but encouraging. Always respond with valid JSON only — no markdown, no backticks, no extra text.

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
- If they used the wrong part of speech of the target word, name that explicitly (e.g. "'rhetoric' is a noun; you used it as an adjective — the adjective is 'rhetorical'").
- "fix" must be specific: name the exact word or pattern to change, not vague advice.
- The "better_example" must be one band higher than what the learner wrote.
- Never use exclamation marks. Never call the learner "you" warmly — clinical, not friendly.
Always respond with valid JSON only — no markdown, no backticks, no extra text.

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
  "what_worked": "one short sentence",
  "fix": "one short sentence or null",
  "better_example": "a better sentence or null"
}`,
    },
  ])

  const clean = content.replace(/```json|```/g, '').trim()
  const parsed = JSON.parse(clean)

  // Defensive: the better_example must actually contain the target word.
  // If the LLM ignored the constraint, drop the misleading suggestion rather
  // than show the learner a "better" sentence that abandons the word they're practicing.
  if (parsed.better_example && typeof parsed.better_example === 'string') {
    const stem = word.toLowerCase().slice(0, Math.max(4, word.length - 3));
    if (!parsed.better_example.toLowerCase().includes(stem)) {
      parsed.better_example = null;
    }
  }

  // Normalize literal "null" string and empty values
  if (typeof parsed.what_worked !== 'string' || parsed.what_worked.trim().toLowerCase() === 'null' || !parsed.what_worked.trim()) {
    parsed.what_worked = 'Nothing yet — see the fix below.';
  }
  if (typeof parsed.fix === 'string' && parsed.fix.trim().toLowerCase() === 'null') {
    parsed.fix = null;
  }

  return parsed;
}

// --- Generate example sentences ---
export async function generateExampleSentences(word: string, definition: string, style: GenerationStyle = 'daily', exclude: string[] = []): Promise<string[]> {
  const seed = Math.random().toString(36).slice(2, 8)
  const content = await callLLM([
    {
      role: 'system',
      content: `You are a vocabulary teacher. Generate example sentences for English learners.
Style context: ${styleGuide[style]}
Always respond with valid JSON only — no markdown, no backticks, no extra text.
Each call must produce fresh, distinct sentences — never repeat previously generated ones.`,
    },
    {
      role: 'user',
      content: `Word: ${word}
Definition: ${definition}
Style: ${style}
Variation seed (ensure uniqueness): ${seed}
${exclude.length > 0 ? `Do NOT reuse or closely paraphrase these sentences: ${exclude.map(s => `"${s}"`).join(', ')}` : ''}

Generate 3 natural example sentences that clearly show the meaning of this word in a ${style} context.

Respond ONLY with this JSON:
{
  "sentences": ["sentence 1", "sentence 2", "sentence 3"]
}`,
    },
  ])

  const clean = content.replace(/```json|```/g, '').trim()
  const parsed = JSON.parse(clean)
  return parsed.sentences
}

// --- Auto-generate collocations ---
export async function generateCollocations(word: string, definition: string, style: GenerationStyle = 'daily', exclude: string[] = []): Promise<string[]> {
  const seed = Math.random().toString(36).slice(2, 8)
  const content = await callLLM([
    {
      role: 'system',
      content: `You are a vocabulary coach. Generate common collocations for English learners.
Style context: ${styleGuide[style]}
Always respond with valid JSON only — no markdown, no backticks, no extra text.
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

  const clean = content.replace(/```json|```/g, '').trim()
  const parsed = JSON.parse(clean)
  return parsed.collocations
}

// --- Auto-generate synonyms ---
export async function generateSynonyms(word: string, definition: string, style: GenerationStyle = 'daily', exclude: string[] = []): Promise<string[]> {
  const seed = Math.random().toString(36).slice(2, 8)
  const content = await callLLM([
    {
      role: 'system',
      content: `You are a vocabulary coach helping English learners. Generate simple, everyday synonyms.
Style context: ${styleGuide[style]}
Always respond with valid JSON only — no markdown, no backticks, no extra text.
Each call must produce fresh synonyms — never repeat previously generated ones.`,
    },
    {
      role: 'user',
      content: `Word: ${word}
Definition: ${definition}
Style: ${style}
Variation seed (ensure uniqueness): ${seed}
${exclude.length > 0 ? `Do NOT include any of these already-shown synonyms: ${exclude.join(', ')}` : ''}

Generate 4-5 synonyms for this word. Each synonym must be very simple, common, and easy to understand — prefer short, familiar words that a learner already knows (e.g., "happy" instead of "elated").

Respond ONLY with this JSON:
{
  "synonyms": ["synonym1", "synonym2", "synonym3", "synonym4", "synonym5"]
}`,
    },
  ])

  const clean = content.replace(/```json|```/g, '').trim()
  const parsed = JSON.parse(clean)
  return parsed.synonyms
}

// --- POS + CEFR learning intelligence ---
export async function generatePOSTips(pos: string | null, cefr: string): Promise<{
  headline: string;
  why: string;
  strategy: string;
  power_insight: string;
  focus_score: number;
}> {
  const seed = Math.random().toString(36).slice(2, 8)
  const posLabel = pos ?? 'all parts of speech'
  const content = await callLLM([
    {
      role: 'system',
      content: `You are a dark, analytical vocabulary intelligence system. You give cold, data-driven insights about language learning strategy — no fluff, no encouragement, just sharp analysis. Always respond with valid JSON only — no markdown, no backticks, no extra text.`,
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

  const clean = content.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

// --- Generate a fresh cloze sentence ---
export async function generateClozeSentence(word: string, definition: string, exclude: string[] = []): Promise<string> {
  const seed = Math.random().toString(36).slice(2, 8)
  const content = await callLLM([
    {
      role: 'system',
      content: `You are a vocabulary teacher creating cloze (fill-in-the-blank) exercises. Generate a single natural sentence that uses the target word clearly and unambiguously. Always respond with valid JSON only — no markdown, no backticks, no extra text.`,
    },
    {
      role: 'user',
      content: `Word: ${word}
Definition: ${definition}
Variation seed (for uniqueness): ${seed}
${exclude.length > 0 ? `Do NOT reuse or closely paraphrase these existing sentences:\n${exclude.map(s => `"${s}"`).join('\n')}` : ''}

Write one natural sentence using "${word}" where the word's meaning is clear from context.

Respond ONLY with this JSON:
{
  "sentence": "the generated sentence"
}`,
    },
  ])

  const clean = content.replace(/```json|```/g, '').trim()
  const parsed = JSON.parse(clean)
  return parsed.sentence
}

// --- Generate a memory trick (structured mnemonic with 7 techniques) ---
export async function generateMemoryTrick(word: string, definition: string): Promise<{
  technique: string;
  breakdown: string;
  clarification: string;
}> {
  const seed = Math.random().toString(36).slice(2, 8)
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
- Try phonetic_split first. Only skip it if the split would MISLEAD the meaning — accuracy beats cleverness
- The trick MUST match the given definition exactly — never invent or bend a meaning to fit a trick
- Breakdown ≤ 18 words. Clarification ≤ 16 words. One emoji in the breakdown, max.

Always respond with valid JSON only — no markdown, no backticks, no extra text.`,
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

  const clean = content.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

// --- Auto-generate definition ---
export async function generateDefinition(word: string, style: GenerationStyle = 'daily', excludeDefinition = ''): Promise<{
  definition: string
  emotion_anchor: string
  part_of_speech: string
}> {
  const seed = Math.random().toString(36).slice(2, 8)
  const content = await callLLM([
    {
      role: 'system',
      content: `You are a vocabulary coach helping people deeply learn new words.
Style context: ${styleGuide[style]}
Always respond with valid JSON only — no markdown, no backticks, no extra text.
Each call must produce a fresh definition — never repeat a previously generated one.

DEFINITION RULE: Write the definition in the simplest plain English possible — as if explaining the word to a friend who has never heard it. Use short, common words. No formal dictionary phrasing, no complex grammar, no jargon. A 10-year-old should immediately understand it.`,
    },
    {
      role: 'user',
      content: `Word: ${word}
Style: ${style}
Variation seed (ensure uniqueness): ${seed}
${excludeDefinition ? `Do NOT reuse or closely paraphrase this definition: "${excludeDefinition}"` : ''}

Generate a learner-friendly entry for this word suited to a ${style} context.

Respond ONLY with this JSON:
{
  "definition": "the simplest possible one-sentence explanation — plain everyday words only, no dictionary language",
  "part_of_speech": "noun | verb | adjective | adverb | etc",
  "emotion_anchor": "a vivid one-sentence memory hook or emotional association to help remember this word"
}`,
    },
  ])

  const clean = content.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
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

function clampBand(n: unknown): number {
  const x = typeof n === 'number' && Number.isFinite(n) ? n : 1;
  const clamped = Math.max(1, Math.min(9, x));
  return Math.round(clamped * 2) / 2;
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

  const clean = content.replace(/```json|```/g, '').trim();
  const raw = JSON.parse(clean);

  // ── Defensive parsing ─────────────────────────────────────────────
  const tr = clampBand(raw?.bands?.task_response);
  const co = clampBand(raw?.bands?.coherence);
  const lx = clampBand(raw?.bands?.lexical);
  const gr = clampBand(raw?.bands?.grammar);
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

const CREI_QUESTION_TYPES: readonly CREIQuestionType[] = [
  'opinion',
  'discussion',
  'problem-solution',
  'two-part',
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

export async function generateCREIPrompt(opts: CREIPromptOptions = {}): Promise<CREIPrompt> {
  // Domain + (when omitted) question type are picked client-side via Math.random
  // BEFORE the API call. The model receives both as fixed inputs — it never
  // chooses the domain, which prevents topic bias.
  const domain: CREIDomain = CREI_DOMAINS[Math.floor(Math.random() * CREI_DOMAINS.length)];
  const questionType: CREIQuestionType = opts.questionType
    ?? CREI_QUESTION_TYPES[Math.floor(Math.random() * CREI_QUESTION_TYPES.length)];
  console.log('[generateCREIPrompt]', { domain, questionType, passedQuestionType: opts.questionType });
  const exclude = opts.exclude ?? [];
  const seed = Math.random().toString(36).slice(2, 8);

  const system = `You are an IELTS Task 2 question setter with 15 years of experience writing official-style exam prompts. Your prompts match the register, length, and structure of real IELTS Academic Writing Task 2 questions.

QUESTION TYPE FORMATS:
  • opinion — A statement followed by "To what extent do you agree or disagree?" OR "Do you think this is a positive or negative development?"
  • discussion — A statement presenting two contrasting views, followed by "Discuss both views and give your own opinion."
  • problem-solution — A trend or situation, followed by direct questions about its problems and/or solutions.
  • two-part — A statement followed by two related direct questions (e.g. "Why is this happening? What measures could address it?").

LENGTH: 35–60 words for the entire prompt. Match real exam length — never one-line, never essay-length.

TONE: formal, neutral, exam-register. No casual phrasing. No exclamation marks.

CONSTRAINTS:
  • The prompt must clearly fall within the given domain.
  • The prompt must match the given question type format exactly.
  • Do NOT name political parties, living individuals, or culturally inflammatory framings. Use general societal trends.

FORBIDDEN OPENERS — your generated prompt MUST NOT start with any of these stock phrases. Vary the opening style across calls:
  FORBIDDEN: "In many parts of the world..."
  FORBIDDEN: "Nowadays..."
  FORBIDDEN: "These days..."
  FORBIDDEN: "In the modern world..."
  FORBIDDEN: "In recent years..."
  FORBIDDEN: "Currently..."

Open instead with the topic noun, a statistic, a comparison, or a direct claim. Examples of acceptable opener styles (do NOT copy verbatim, just match the variety):
  "Electronic waste has become one of the fastest-growing waste streams..."
  "Plastic waste in the world's oceans has tripled since 2000..."
  "More children than ever are being diagnosed with type 2 diabetes..."

TIP — you must also produce ONE sharp framing tip for the learner. The tip teaches them how to score higher on THIS specific prompt. Voice contract:
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
  "prompt": "<the IELTS Task 2 prompt, 35-60 words>",
  "tip": "<one sharp framing tip in imperative voice with a Band consequence>"
}`;

  const user = `Domain: ${domain}
Question type: ${questionType}
Variation seed (ensure uniqueness): ${seed}
${exclude.length > 0 ? `Do NOT reuse or closely paraphrase these recent prompts:\n${exclude.map(p => `"${p}"`).join('\n')}` : ''}

Generate one fresh IELTS Task 2 prompt in the ${domain} domain, following the ${questionType} format exactly. Then write one sharp framing tip per the voice contract.

Return JSON only.`;

  // Higher temperature here than scoreCREI: we WANT variety in prompts, not stability.
  // Matches generateMemoryTrick / generatePOSTips which are similarly "creative but structured."
  const content = await callLLM(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    0.85,
  );

  const clean = content.replace(/```json|```/g, '').trim();
  const raw = JSON.parse(clean);

  const prompt = typeof raw?.prompt === 'string' ? raw.prompt.trim() : '';
  const tip = typeof raw?.tip === 'string' ? raw.tip.trim() : '';

  if (!prompt) throw new Error('generateCREIPrompt: empty prompt from model');
  if (!tip) throw new Error('generateCREIPrompt: empty tip from model');

  return { prompt, questionType, domain, tip };
}
