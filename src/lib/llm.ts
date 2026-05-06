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
