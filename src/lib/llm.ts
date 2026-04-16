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

// --- Sentence scoring (existing feature) ---
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

// --- Generate example sentences (new feature) ---
export async function generateExampleSentences(word: string, definition: string): Promise<string[]> {
  const content = await callLLM([
    {
      role: 'system',
      content: `You are a vocabulary teacher. Generate example sentences for English learners.
Always respond with valid JSON only — no markdown, no backticks, no extra text.`,
    },
    {
      role: 'user',
      content: `Word: ${word}
Definition: ${definition}

Generate 3 natural example sentences that clearly show the meaning of this word.
Vary the context (e.g. formal, casual, narrative).

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

// --- Auto-generate definition (new feature) ---
export async function generateDefinition(word: string): Promise<{
  definition: string
  emotion_anchor: string
  part_of_speech: string
}> {
  const content = await callLLM([
    {
      role: 'system',
      content: `You are a vocabulary coach helping people deeply learn new words.
Always respond with valid JSON only — no markdown, no backticks, no extra text.`,
    },
    {
      role: 'user',
      content: `Word: ${word}

Generate a learner-friendly entry for this word.

Respond ONLY with this JSON:
{
  "definition": "clear, plain-English definition in one sentence",
  "part_of_speech": "noun | verb | adjective | adverb | etc",
  "emotion_anchor": "a vivid one-sentence memory hook or emotional association to help remember this word"
}`,
    },
  ])

  const clean = content.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}