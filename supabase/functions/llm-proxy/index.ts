import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { TASKS, assemblePrompt, pickNewWord, validateParams } from './tasks.ts'
import { knownWordSet, renderLearner } from './learner.ts'
import { extractNote } from './memory.ts'
import { loadLearnerRows, rememberNote } from './db.ts'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const GEMINI_MODEL = 'gemini-3.5-flash-lite'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Supabase's edge runtime keeps the worker alive for promises handed to
// waitUntil, so note-saving and compaction don't delay the learner's reply.
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void } | undefined

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

class UpstreamError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

async function callGemini(system: string, user: string, temperature: number): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: {
          temperature,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
      }),
    }
  )

  const raw = await response.text()
  let data: {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> }
      finishReason?: string
    }>
    error?: { message?: string }
  } | null = null
  try {
    data = JSON.parse(raw)
  } catch {
    // fall through — data stays null, handled below
  }

  // Surface the real upstream failure instead of forwarding a 200 with no
  // usable content — a swallowed error here used to show up to users as a
  // generic "malformed JSON" / "AI feedback unavailable" with no real cause.
  if (!response.ok) {
    console.error('[llm-proxy] Gemini request failed', response.status, raw)
    throw new UpstreamError(data?.error?.message ?? `Gemini request failed (HTTP ${response.status})`, response.status)
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (typeof text !== 'string' || !text) {
    const finishReason = data?.candidates?.[0]?.finishReason
    console.error('[llm-proxy] Gemini returned no usable content', finishReason, raw)
    throw new UpstreamError(`Gemini returned no content (finishReason: ${finishReason ?? 'unknown'})`, 502)
  }
  return text
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Unauthorized' }, 401)

  // Use the token from the request to verify the user; every later query runs
  // as this user, so row level security keeps it to their own data.
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return json({ error: 'Unauthorized', detail: error?.message }, 401)

  // Only named tasks are accepted — prompts are built here, never taken from
  // the client, so the Gemini key can't be used for arbitrary requests.
  const body = await req.json().catch(() => null)
  const def = typeof body?.task === 'string' ? TASKS[body.task] : undefined
  if (!def) return json({ error: { message: 'Bad request: unknown task' } }, 400)

  const checked = validateParams(def, body.params)
  if ('error' in checked) return json({ error: { message: `Bad request: ${checked.error}` } }, 400)
  const params = checked.params

  const word = def.wordParam && typeof params[def.wordParam] === 'string' ? params[def.wordParam] as string : ''
  // suggest_word also needs the library to filter out words already known
  const slices = def.candidates && !def.context.includes('level') ? [...def.context, 'level' as const] : def.context
  const rows = await loadLearnerRows(supabase, user.id, slices, word)
  const learnerBlock = renderLearner(rows, def.context, { word })

  const seed = Math.random().toString(36).slice(2, 8)
  const prompt = assemblePrompt(def, params, learnerBlock, seed)
  console.log('[llm-proxy]', body.task, {
    promptChars: prompt.system.length + prompt.user.length,
    learnerChars: learnerBlock.length,
  })

  let content: string
  try {
    content = await callGemini(prompt.system, prompt.user, prompt.temperature)
  } catch (e) {
    const status = e instanceof UpstreamError ? e.status : 500
    return json({ error: { message: e instanceof Error ? e.message : 'Gemini request failed' } }, status)
  }

  if (def.candidates) {
    const exclude = Array.isArray(params.exclude) ? params.exclude : []
    const picked = pickNewWord(content, knownWordSet(rows), exclude)
    if (picked) content = JSON.stringify({ word: picked })
  }

  if (def.note) {
    const note = extractNote(content)
    if (note) {
      const job = rememberNote(supabase, user.id, def.note, word || null, note, callGemini)
        .catch(e => console.warn('[llm-proxy] remembering note failed', e))
      if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(job)
      else await job
    }
  }

  // OpenAI-compatible shape the client already expects.
  return json({ choices: [{ message: { content } }] })
})
