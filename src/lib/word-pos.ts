// Part-of-speech lookup for the Generation Lab.
// Primary source: Oxford 3000 list (covers most IELTS vocabulary).
// Fallback: morphological suffix inference for words not in the list.

import oxfordRaw from '@/data/oxford_words.json';

interface OxfordEntry { word: string; pos: string; cefr?: string }

// Build a lowercase → pos map once at module load (fast O(1) lookup)
const oxfordMap = new Map<string, string>(
  (oxfordRaw as OxfordEntry[]).map(e => [e.word.toLowerCase(), e.pos])
);

const POS_ABBR: Record<string, string> = {
  noun:         'n.',
  verb:         'v.',
  adjective:    'adj.',
  adverb:       'adv.',
  pronoun:      'pron.',
  preposition:  'prep.',
  conjunction:  'conj.',
  determiner:   'det.',
  article:      'art.',
  number:       'num.',
  exclamation:  'excl.',
};

// Ordered suffix rules — first match wins, longest suffixes first
const SUFFIX_RULES: [string, string][] = [
  ['tion',   'noun'],
  ['sion',   'noun'],
  ['ness',   'noun'],
  ['ment',   'noun'],
  ['ance',   'noun'],
  ['ence',   'noun'],
  ['ity',    'noun'],
  ['hood',   'noun'],
  ['ship',   'noun'],
  ['dom',    'noun'],
  ['ism',    'noun'],
  ['ation',  'noun'],
  ['able',   'adjective'],
  ['ible',   'adjective'],
  ['ious',   'adjective'],
  ['eous',   'adjective'],
  ['ous',    'adjective'],
  ['ful',    'adjective'],
  ['less',   'adjective'],
  ['ive',    'adjective'],
  ['ial',    'adjective'],
  ['ical',   'adjective'],
  ['al',     'adjective'],
  ['ic',     'adjective'],
  ['ish',    'adjective'],
  ['ent',    'adjective'],
  ['ant',    'adjective'],
  ['ize',    'verb'],
  ['ise',    'verb'],
  ['ate',    'verb'],
  ['ify',    'verb'],
  ['fy',     'verb'],
  ['en',     'verb'],
  ['ly',     'adverb'],
];

function inferFromSuffix(word: string): string | null {
  const w = word.toLowerCase();
  for (const [suffix, pos] of SUFFIX_RULES) {
    if (w.endsWith(suffix) && w.length > suffix.length + 2) return pos;
  }
  return null;
}

export interface PosResult {
  pos: string;
  abbr: string;
  source: 'oxford' | 'inferred';
}

export function getWordPos(word: string): PosResult | null {
  const key = word.toLowerCase();
  const fromOxford = oxfordMap.get(key);
  if (fromOxford) {
    return { pos: fromOxford, abbr: POS_ABBR[fromOxford] ?? fromOxford, source: 'oxford' };
  }
  const inferred = inferFromSuffix(key);
  if (inferred) {
    return { pos: inferred, abbr: POS_ABBR[inferred] ?? inferred, source: 'inferred' };
  }
  return null;
}
