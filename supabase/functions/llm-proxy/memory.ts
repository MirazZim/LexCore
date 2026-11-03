// Learner memory: scoring replies carry a one-line learner_note; every
// COMPACT_EVERY notes are merged into the learner's running summary, which is
// what later prompts read. Pure: shared with the unit tests.

export const COMPACT_EVERY = 10;
const MAX_NOTE = 200;
const MAX_SUMMARY = 1200;

// The learner_note from a model reply, or null when there is nothing worth keeping.
export function extractNote(content: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content.replace(/```json|```/gi, '').trim());
  } catch {
    return null;
  }
  const note = (parsed as { learner_note?: unknown })?.learner_note;
  if (typeof note !== 'string') return null;
  const t = note.trim();
  if (!t || t.toLowerCase() === 'null' || t.toLowerCase() === 'none') return null;
  return t.slice(0, MAX_NOTE);
}

// Merges the current summary with new notes. Tuned for recall first: a
// pattern that appears once is kept until later notes contradict it.
export function buildCompactionPrompt(summary: string | null, notes: string[]) {
  const system = `You maintain a short profile of one English learner for their AI coach. You will get the current profile (possibly empty) and new observations from recent practice. Write the updated profile.

Keep:
- Recurring error patterns, each with one short quoted example.
- Persistent strengths worth building on.
- Patterns that appear once — unless newer observations show they are fixed.
Drop:
- Anything newer observations contradict or show as fixed.
- Duplicates — merge them into one line and note it recurs.

Format: 3–8 lines, each starting with "- ", most important first, under 120 words in total. Plain statements about the learner, no advice to the coach.
Always respond with valid JSON only — no markdown, no backticks, no extra text.`;

  const user = `Current profile:
${summary?.trim() || '(empty — first profile)'}

New observations (newest last):
${notes.map(n => `- ${n}`).join('\n')}

Respond ONLY with this JSON:
{
  "summary": "- first line\\n- second line"
}`;

  return { system, user, temperature: 0.2 };
}

export function parseSummary(content: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content.replace(/```json|```/gi, '').trim());
  } catch {
    return null;
  }
  const summary = (parsed as { summary?: unknown })?.summary;
  if (typeof summary !== 'string' || !summary.trim()) return null;
  return summary.trim().slice(0, MAX_SUMMARY);
}
