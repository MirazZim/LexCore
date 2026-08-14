import type { Word, WordStats } from '@/lib/types';

export type ReviewPhase = 'battle' | 'memory_trick' | 'context' | 'collocation' | 'generation' | 'mature_examples' | 'synonyms' | 'summary';

export interface ReviewResult {
  wordId: string;
  word: string;
  quality: number;
  correct: boolean;
}

export interface DueWordItem {
  word: Word;
  stats: WordStats;
}

export interface AiFeedback {
  verdict: string;
  score: number;
  mistake: string | null;
  what_worked: string;
  fix: string | null;
  better_example: string | null;
}

export interface WordContext {
  id: string;
  sentence: string;
  source_label: string;
  /** Present on rows from the DB; absent on freshly generated cloze sentences. */
  created_at?: string;
}

/** A short two-line conversational exchange used for Context Theater's cloze practice. */
export interface ClozeDialogue {
  /** First speaker's line — shown in full, sets up the moment. */
  setup: string;
  /** Second speaker's reply — contains the target word, shown with it blanked out. */
  response: string;
}

export interface WordCollocation {
  id: string;
  collocation: string;
}
