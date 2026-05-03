// Tracks the last time a user wrote a production sentence for each word.
// Mature cards (high retrievability, many reps) don't need generation every
// review — 2-3 times a week is enough. Gate fires every 2 days.

const KEY = 'lexcore.gen-log.v1';
const MATURE_INTERVAL_DAYS = 2;

function read(): Record<string, string> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function write(log: Record<string, string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(log));
  } catch {
    // ignore
  }
}

export function markGenerated(wordId: string) {
  const log = read();
  log[wordId] = new Date().toISOString();
  write(log);
}

export function daysSinceGenerated(wordId: string): number | null {
  const log = read();
  const iso = log[wordId];
  if (!iso) return null;
  return (Date.now() - new Date(iso).getTime()) / 86_400_000;
}

// Returns true if the word needs generation this session.
// - Never generated before → always require it
// - Generated within 2 days → skip (diminishing returns)
// - 2+ days ago → require it again
export function matureNeedsGeneration(wordId: string): boolean {
  const days = daysSinceGenerated(wordId);
  if (days === null) return true;
  return days >= MATURE_INTERVAL_DAYS;
}
