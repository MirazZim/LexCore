export type Register = 'formal' | 'casual' | 'literary' | 'slang';

export interface Word {
  id: string;
  user_id: string;
  word: string;
  definition: string;
  example_sentence: string | null;
  emotion_anchor: string | null;
  source: 'user' | 'native_pulse';
  register: Register;
  frequency_band: number;
  created_at: string;
}

export interface WordCollocation {
  id: string;
  word_id: string;
  collocation: string;
  created_at: string;
}

export interface WordContext {
  id: string;
  word_id: string;
  sentence: string;
  source_label: string;
  created_at: string;
}

export interface WordStats {
  id: string;
  user_id: string;
  word_id: string;
  stability: number;
  difficulty: number;
  state: number;           // 0=New 1=Learning 2=Review 3=Relearning
  elapsed_days: number;
  scheduled_days: number;
  lapses: number;
  repetitions: number;
  next_review_at: string;
  last_reviewed_at: string | null;
  times_correct: number;
  times_incorrect: number;
}

export interface ReviewSession {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string;
  words_reviewed: number;
  words_correct: number;
  session_type: 'battle' | 'context_theater' | 'generation_lab' | 'sleep_prep';
}

export interface SemanticConnection {
  id: string;
  word_id: string;
  connected_word: string;
  connection_type: 'synonym' | 'antonym' | 'collocation' | 'related';
}

export interface WordWithStats extends Word {
  word_stats: WordStats[];
  word_contexts: WordContext[];
  word_collocations: WordCollocation[];
  semantic_connections: SemanticConnection[];
}

export interface UserPreferences {
  user_id: string;
  request_retention: number;  // 0.70 – 0.97
  maximum_interval: number;   // days
  new_cards_per_day: number;
  updated_at: string;
}
