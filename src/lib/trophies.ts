// Sentence trophies: 10/10 AI-scored sentences are minted to a personal
// "Greatest Hits" wall. Stored in localStorage to avoid a schema migration —
// trophies are rare, small, and a per-device view is fine for the feature.

const KEY = 'lexcore.trophies.v1';
const MAX = 50;

export interface Trophy {
  word: string;
  wordId: string;
  sentence: string;
  topic: string | null;
  /** AI score at mint time; trophies minted before this field existed lack it. */
  score?: number;
  mintedAt: string; // ISO
}

function read(): Trophy[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Trophy[]) : [];
  } catch {
    return [];
  }
}

function write(list: Trophy[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    // localStorage full or disabled — silently skip; trophies are non-critical
  }
}

export function getTrophies(): Trophy[] {
  return read();
}

export function mintTrophy(t: Omit<Trophy, 'mintedAt'>): Trophy[] {
  const trophy: Trophy = { ...t, mintedAt: new Date().toISOString() };
  // Dedupe identical sentence for the same word so retries don't multi-mint
  const existing = read().filter(
    x => !(x.wordId === trophy.wordId && x.sentence.trim() === trophy.sentence.trim()),
  );
  const next = [trophy, ...existing];
  write(next);
  return next;
}
