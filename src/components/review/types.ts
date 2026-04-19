import type { Word, WordStats } from '@/lib/types';

export type ReviewPhase = 'battle' | 'context' | 'collocation' | 'generation' | 'synonyms' | 'summary';

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
  what_worked: string;
  fix: string | null;
  better_example: string | null;
}

export interface WordContext {
  id: string;
  sentence: string;
  source_label: string;
}

export interface WordCollocation {
  id: string;
  collocation: string;
}
