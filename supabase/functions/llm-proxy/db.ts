// Database side of learner memory. Runs with the learner's own token, so row
// level security limits every query to their rows. Every read degrades to
// null on error: missing context must never break an AI call.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { emptyRows, type LearnerRows, type Slice } from './learner.ts'
import { COMPACT_EVERY, buildCompactionPrompt, parseSummary } from './memory.ts'

type Result<T> = PromiseLike<{ data: T | null; error: unknown }>
type CallModel = (system: string, user: string, temperature: number) => Promise<string>

async function safe<T>(query: Result<T>, label: string): Promise<T | null> {
  try {
    const { data, error } = await query
    if (error) {
      console.warn(`[llm-proxy] learner context: ${label} unavailable`, error)
      return null
    }
    return data
  } catch (e) {
    console.warn(`[llm-proxy] learner context: ${label} failed`, e)
    return null
  }
}

async function loadWords(db: SupabaseClient, userId: string): Promise<LearnerRows['words']> {
  const recent = (columns: string) =>
    db.from('words').select(columns).eq('user_id', userId).order('created_at', { ascending: false }).limit(1000)
  // memory_technique arrives with the learner-memory migration; read without it until then
  return (await safe(recent('id, word, register, memory_technique') as Result<NonNullable<LearnerRows['words']>>, 'words'))
    ?? (await safe(recent('id, word, register') as Result<NonNullable<LearnerRows['words']>>, 'words (no technique)'))
}

export async function loadLearnerRows(
  db: SupabaseClient,
  userId: string,
  slices: readonly Slice[],
  word: string,
): Promise<LearnerRows> {
  const rows = emptyRows()
  if (slices.length === 0) return rows
  const has = (...s: Slice[]) => s.some(x => slices.includes(x))
  const jobs: Promise<void>[] = []

  if (has('level', 'known_words', 'struggling', 'confusions', 'techniques')) {
    jobs.push(loadWords(db, userId).then(d => { rows.words = d }))
  }
  if (has('struggling', 'techniques')) {
    jobs.push(safe(
      db.from('word_stats').select('word_id, lapses').eq('user_id', userId).limit(2000),
      'word_stats',
    ).then(d => { rows.stats = d }))
  }
  if (has('writing')) {
    jobs.push(safe(
      db.from('writing_attempts').select('flagged_issues, band_overall').eq('user_id', userId)
        .order('created_at', { ascending: false }).limit(10),
      'writing_attempts',
    ).then(d => { rows.writing = d }))
  }
  if (has('confusions')) {
    jobs.push(safe(
      db.from('collocation_attempts').select('wrong_pick, word_id').eq('user_id', userId).eq('was_correct', false)
        .order('created_at', { ascending: false }).limit(15),
      'collocation_attempts',
    ).then(d => { rows.collocationMisses = d }))
    jobs.push(safe(
      db.from('cloze_attempts').select('user_answer, word_id').eq('user_id', userId).eq('was_correct', false)
        .order('created_at', { ascending: false }).limit(15),
      'cloze_attempts',
    ).then(d => { rows.clozeMisses = d }))
  }
  if (has('notes')) {
    jobs.push(safe(
      db.from('learner_profiles').select('summary').eq('user_id', userId).maybeSingle(),
      'learner_profiles',
    ).then(d => { rows.profile = (d as { summary?: string } | null)?.summary ?? null }))
    jobs.push(safe(
      db.from('learner_notes').select('note, word').eq('user_id', userId).eq('compacted', false)
        .order('created_at', { ascending: false }).limit(6),
      'learner_notes',
    ).then(d => { rows.notes = d }))
  }
  if (has('word_notes') && word.trim()) {
    jobs.push(safe(
      db.from('learner_notes').select('note').eq('user_id', userId).ilike('word', word.trim())
        .order('created_at', { ascending: false }).limit(3),
      'learner_notes (word)',
    ).then(d => { rows.wordNotes = d }))
  }

  await Promise.all(jobs)
  return rows
}

// Saves a note, then merges notes into the profile once enough have piled up.
export async function rememberNote(
  db: SupabaseClient,
  userId: string,
  source: 'sentence' | 'writing',
  word: string | null,
  note: string,
  callModel: CallModel,
): Promise<void> {
  const { error } = await db.from('learner_notes').insert({ user_id: userId, source, word, note })
  if (error) {
    console.warn('[llm-proxy] could not save learner note', error)
    return
  }

  const pending = await safe(
    db.from('learner_notes').select('id, note').eq('user_id', userId).eq('compacted', false)
      .order('created_at', { ascending: true }).limit(30),
    'pending notes',
  ) as { id: string; note: string }[] | null
  if (!pending || pending.length < COMPACT_EVERY) return

  const current = await safe(
    db.from('learner_profiles').select('summary').eq('user_id', userId).maybeSingle(),
    'learner_profiles',
  ) as { summary?: string } | null

  const prompt = buildCompactionPrompt(current?.summary ?? null, pending.map(n => n.note))
  const summary = parseSummary(await callModel(prompt.system, prompt.user, prompt.temperature))
  if (!summary) {
    console.warn('[llm-proxy] compaction returned no summary; notes kept for next time')
    return
  }

  const { error: upsertError } = await db.from('learner_profiles')
    .upsert({ user_id: userId, summary, updated_at: new Date().toISOString() })
  if (upsertError) {
    console.warn('[llm-proxy] could not save learner profile', upsertError)
    return
  }
  await db.from('learner_notes').update({ compacted: true }).in('id', pending.map(n => n.id))
  console.log('[llm-proxy] compacted learner notes', { userId, merged: pending.length })
}
