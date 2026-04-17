import { supabase } from './supabase'

type Message = { role: 'system' | 'user' | 'assistant'; content: string }

export async function callLLM(messages: Message[]): Promise<string> {
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
      body: JSON.stringify({ messages }),
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
export async function scoreSentence(word: string, definition: string, sentence: string) {
  const content = await callLLM([
    {
      role: 'system',
      content: `You are an expert English language coach. A learner is practicing vocabulary by writing sentences.
Evaluate their sentence briefly and naturally — like a friendly native speaker coach, not a grammar robot.
Be honest but encouraging. Always respond with valid JSON only — no markdown, no backticks, no extra text.`,
    },
    {
      role: 'user',
      content: `Word: ${word}
Definition: ${definition}
Learner sentence: ${sentence}

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
  return JSON.parse(clean)
}

// --- Generate example sentences ---
export async function generateExampleSentences(word: string, definition: string, style: GenerationStyle = 'daily'): Promise<string[]> {
  const content = await callLLM([
    {
      role: 'system',
      content: `You are a vocabulary teacher. Generate example sentences for English learners.
Style context: ${styleGuide[style]}
Always respond with valid JSON only — no markdown, no backticks, no extra text.`,
    },
    {
      role: 'user',
      content: `Word: ${word}
Definition: ${definition}
Style: ${style}

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
export async function generateCollocations(word: string, definition: string, style: GenerationStyle = 'daily'): Promise<string[]> {
  const content = await callLLM([
    {
      role: 'system',
      content: `You are a vocabulary coach. Generate common collocations for English learners.
Style context: ${styleGuide[style]}
Always respond with valid JSON only — no markdown, no backticks, no extra text.`,
    },
    {
      role: 'user',
      content: `Word: ${word}
Definition: ${definition}
Style: ${style}

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

// --- Auto-generate definition ---
export async function generateDefinition(word: string, style: GenerationStyle = 'daily'): Promise<{
  definition: string
  emotion_anchor: string
  part_of_speech: string
}> {
  const content = await callLLM([
    {
      role: 'system',
      content: `You are a vocabulary coach helping people deeply learn new words.
Style context: ${styleGuide[style]}
Always respond with valid JSON only — no markdown, no backticks, no extra text.`,
    },
    {
      role: 'user',
      content: `Word: ${word}
Style: ${style}

Generate a learner-friendly entry for this word suited to a ${style} context.

Respond ONLY with this JSON:
{
  "definition": "clear definition in one sentence matching the style",
  "part_of_speech": "noun | verb | adjective | adverb | etc",
  "emotion_anchor": "a vivid one-sentence memory hook or emotional association to help remember this word"
}`,
    },
  ])

  const clean = content.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}
