// Turns the learner's raw rows into the short <learner> block a prompt carries.
// Pure: no database or network access, so it is shared with the unit tests.
// Every slice is a summary with a hard size cap — the prompt gets the few
// facts that change the output, never raw history.

export type Slice =
  | 'level'        // library size and register mix
  | 'known_words'  // a sample of words the learner already knows
  | 'struggling'   // words they keep forgetting
  | 'writing'      // recent Writing Lab bands and recurring issue codes
  | 'confusions'   // wrong collocation picks and cloze answers
  | 'techniques'   // which memory-trick techniques stick for them
  | 'notes'        // the coach's running summary plus recent observations
  | 'word_notes';  // past observations about the target word

export interface LearnerRows {
  words: { id: string; word: string; register: string | null; memory_technique: string | null }[] | null;
  stats: { word_id: string; lapses: number | null }[] | null;
  // Newest first
  writing: { flagged_issues: string[] | null; band_overall: number | null }[] | null;
  collocationMisses: { wrong_pick: string | null; word_id: string }[] | null;
  clozeMisses: { user_answer: string; word_id: string }[] | null;
  profile: string | null;
  // Newest first, not yet merged into the profile
  notes: { note: string; word: string | null }[] | null;
  wordNotes: { note: string }[] | null;
}

export const emptyRows = (): LearnerRows => ({
  words: null, stats: null, writing: null, collocationMisses: null,
  clozeMisses: null, profile: null, notes: null, wordNotes: null,
});

const MAX_LINE = 320;
const clip = (s: string, n = MAX_LINE) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export function knownWordSet(rows: LearnerRows): Set<string> {
  return new Set((rows.words ?? []).map(w => w.word.trim().toLowerCase()));
}

function lapsesByWord(rows: LearnerRows): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of rows.stats ?? []) m.set(s.word_id, s.lapses ?? 0);
  return m;
}

function levelLine(rows: LearnerRows): string | null {
  const words = rows.words ?? [];
  if (words.length === 0) return 'Library: empty — a brand-new learner.';
  const counts = new Map<string, number>();
  for (const w of words) counts.set(w.register ?? 'unknown', (counts.get(w.register ?? 'unknown') ?? 0) + 1);
  const mix = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([r, n]) => `${r} ${Math.round((n / words.length) * 100)}%`)
    .join(', ');
  return `Library: ${words.length} words (${mix}).`;
}

function knownWordsLine(rows: LearnerRows, exclude: string, random: () => number): string | null {
  // Sample from the 60 most recent so the anchors are words still fresh in mind
  const pool = (rows.words ?? []).slice(0, 60).map(w => w.word).filter(w => w.toLowerCase() !== exclude);
  if (pool.length === 0) return null;
  const picked: string[] = [];
  const copy = [...pool];
  while (picked.length < 12 && copy.length > 0) {
    picked.push(copy.splice(Math.floor(random() * copy.length), 1)[0]);
  }
  return clip(`Already knows: ${picked.join(', ')}.`);
}

function strugglingLine(rows: LearnerRows): string | null {
  const lapses = lapsesByWord(rows);
  const top = (rows.words ?? [])
    .map(w => ({ word: w.word, lapses: lapses.get(w.id) ?? 0 }))
    .filter(w => w.lapses >= 2)
    .sort((a, b) => b.lapses - a.lapses)
    .slice(0, 5);
  if (top.length === 0) return null;
  return `Keeps forgetting: ${top.map(w => `${w.word} (${w.lapses}×)`).join(', ')}.`;
}

function writingLines(rows: LearnerRows): string[] {
  const attempts = rows.writing ?? [];
  if (attempts.length === 0) return [];
  const lines: string[] = [];
  const bands = attempts
    .map(a => a.band_overall)
    .filter((b): b is number => typeof b === 'number')
    .slice(0, 5)
    .reverse();
  if (bands.length > 0) lines.push(`Recent writing bands (oldest → newest): ${bands.join(', ')}.`);
  const counts = new Map<string, number>();
  for (const a of attempts) for (const code of a.flagged_issues ?? []) counts.set(code, (counts.get(code) ?? 0) + 1);
  const top = [...counts.entries()].filter(([code]) => code !== 'other').sort((a, b) => b[1] - a[1]).slice(0, 4);
  if (top.length > 0) {
    lines.push(`Recurring writing issues (last ${attempts.length} paragraphs): ${top.map(([c, n]) => `${c} ×${n}`).join(', ')}.`);
  }
  return lines;
}

function confusionsLine(rows: LearnerRows): string | null {
  const byId = new Map((rows.words ?? []).map(w => [w.id, w.word]));
  const items: string[] = [];
  const seen = new Set<string>();
  for (const m of rows.collocationMisses ?? []) {
    const word = byId.get(m.word_id);
    if (!m.wrong_pick || !word) continue;
    const key = `c:${m.wrong_pick.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(`picked "${m.wrong_pick}" as a pairing for "${word}"`);
  }
  for (const m of rows.clozeMisses ?? []) {
    const word = byId.get(m.word_id);
    if (!word || !m.user_answer.trim()) continue;
    const key = `z:${m.user_answer.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(`wrote "${m.user_answer.trim()}" where "${word}" belonged`);
  }
  if (items.length === 0) return null;
  return clip(`Past confusions: ${items.slice(0, 4).join('; ')}.`);
}

function techniquesLine(rows: LearnerRows): string | null {
  const lapses = lapsesByWord(rows);
  const groups = new Map<string, number[]>();
  for (const w of rows.words ?? []) {
    if (!w.memory_technique || !lapses.has(w.id)) continue;
    const list = groups.get(w.memory_technique) ?? [];
    list.push(lapses.get(w.id) ?? 0);
    groups.set(w.memory_technique, list);
  }
  // Needs at least three words per technique, and two techniques to compare
  const ranked = [...groups.entries()]
    .filter(([, l]) => l.length >= 3)
    .map(([t, l]) => ({ t, avg: l.reduce((a, b) => a + b, 0) / l.length, n: l.length }))
    .sort((a, b) => a.avg - b.avg);
  if (ranked.length < 2) return null;
  const fmt = (r: { t: string; avg: number; n: number }) => `${r.t} (avg ${r.avg.toFixed(1)} forgets over ${r.n} words)`;
  return `Memory tricks that stick best: ${fmt(ranked[0])}; weakest: ${fmt(ranked[ranked.length - 1])}.`;
}

function notesLines(rows: LearnerRows): string[] {
  const lines: string[] = [];
  if (rows.profile?.trim()) lines.push(`Coach's summary of this learner:\n${clip(rows.profile.trim(), 900)}`);
  const recent = (rows.notes ?? []).slice(0, 6).map(n => `- ${clip(n.note, 160)}`);
  if (recent.length > 0) lines.push(`Recent observations:\n${recent.join('\n')}`);
  return lines;
}

function wordNotesLine(rows: LearnerRows, word: string): string | null {
  const notes = (rows.wordNotes ?? []).slice(0, 3).map(n => clip(n.note, 160));
  if (notes.length === 0) return null;
  return `Earlier notes on "${word}": ${notes.join(' | ')}`;
}

// The block that goes inside <learner>…</learner>, or '' when there is nothing to say.
export function renderLearner(
  rows: LearnerRows,
  slices: readonly Slice[],
  opts: { word?: string; random?: () => number } = {},
): string {
  const word = (opts.word ?? '').trim().toLowerCase();
  const random = opts.random ?? Math.random;
  const out: string[] = [];
  for (const slice of slices) {
    switch (slice) {
      case 'level': { const l = levelLine(rows); if (l) out.push(l); break; }
      case 'known_words': { const l = knownWordsLine(rows, word, random); if (l) out.push(l); break; }
      case 'struggling': { const l = strugglingLine(rows); if (l) out.push(l); break; }
      case 'writing': out.push(...writingLines(rows)); break;
      case 'confusions': { const l = confusionsLine(rows); if (l) out.push(l); break; }
      case 'techniques': { const l = techniquesLine(rows); if (l) out.push(l); break; }
      case 'notes': out.push(...notesLines(rows)); break;
      case 'word_notes': { const l = word ? wordNotesLine(rows, opts.word!.trim()) : null; if (l) out.push(l); break; }
    }
  }
  return out.join('\n');
}
