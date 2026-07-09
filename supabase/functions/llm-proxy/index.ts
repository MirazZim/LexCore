import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const GEMINI_MODEL = 'gemini-3.1-flash-lite'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Use the token from the request to verify the user
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized', detail: error?.message }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const body = await req.json().catch(() => null)
  if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
    return new Response(JSON.stringify({ error: 'Bad request: messages[] required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Whitelist request fields — never spread the client body, or any signed-in
  // user could override the model / token limits and run up costs on this key.
  const temperature = typeof body.temperature === 'number'
    ? Math.min(Math.max(body.temperature, 0), 1)
    : 0.7

  const messages = body.messages as ChatMessage[]

  // Gemini splits system instructions out of the turn-by-turn conversation,
  // and uses "model" (not "assistant") as the role for prior assistant turns.
  const systemText = messages
    .filter(m => m.role === 'system')
    .map(m => m.content)
    .join('\n\n')
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

  const geminiPayload: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
    },
  }
  if (systemText) {
    geminiPayload.systemInstruction = { parts: [{ text: systemText }] }
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiPayload),
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
    return new Response(JSON.stringify({
      error: { message: data?.error?.message ?? `Gemini request failed (HTTP ${response.status})` },
    }), {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (typeof text !== 'string' || !text) {
    const finishReason = data?.candidates?.[0]?.finishReason
    console.error('[llm-proxy] Gemini returned no usable content', finishReason, raw)
    return new Response(JSON.stringify({
      error: { message: `Gemini returned no content (finishReason: ${finishReason ?? 'unknown'})` },
    }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Translate to the OpenAI-compatible shape the client already expects.
  return new Response(JSON.stringify({
    choices: [{ message: { content: text } }],
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
