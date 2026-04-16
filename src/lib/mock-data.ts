import { Word, WordStats, WordContext, WordCollocation, SemanticConnection, ReviewSession } from './types';

const MOCK_USER_ID = 'demo-user-001';

const now = new Date();
const daysAgo = (d: number) => {
  const date = new Date(now);
  date.setDate(date.getDate() - d);
  return date.toISOString();
};
const hoursFromNow = (h: number) => {
  const date = new Date(now);
  date.setHours(date.getHours() + h);
  return date.toISOString();
};

export const mockWords: Word[] = [
  { id: 'w1', user_id: MOCK_USER_ID, word: 'ephemeral', definition: 'Lasting for a very short time', example_sentence: 'The ephemeral beauty of cherry blossoms draws millions of visitors each spring.', emotion_anchor: 'Morning dew disappearing in sunlight', source: 'user', register: 'literary', frequency_band: 3, created_at: daysAgo(14) },
  { id: 'w2', user_id: MOCK_USER_ID, word: 'meticulous', definition: 'Showing great attention to detail; very careful and precise', example_sentence: 'She was meticulous in her research, checking every source twice.', emotion_anchor: 'A watchmaker adjusting tiny gears', source: 'user', register: 'formal', frequency_band: 4, created_at: daysAgo(12) },
  { id: 'w3', user_id: MOCK_USER_ID, word: 'pernicious', definition: 'Having a harmful effect, especially in a gradual or subtle way', example_sentence: 'The pernicious influence of misinformation erodes public trust.', emotion_anchor: 'Rust slowly eating through metal', source: 'user', register: 'formal', frequency_band: 2, created_at: daysAgo(10) },
  { id: 'w4', user_id: MOCK_USER_ID, word: 'sanguine', definition: 'Optimistic or positive, especially in a difficult situation', example_sentence: 'Despite the setbacks, he remained sanguine about the project\'s success.', emotion_anchor: 'A warm sunrise after a storm', source: 'user', register: 'formal', frequency_band: 2, created_at: daysAgo(8) },
  { id: 'w5', user_id: MOCK_USER_ID, word: 'obfuscate', definition: 'To render obscure, unclear, or unintelligible', example_sentence: 'Politicians often obfuscate their true intentions with vague language.', emotion_anchor: 'Fog rolling over a road sign', source: 'user', register: 'formal', frequency_band: 2, created_at: daysAgo(6) },
  { id: 'w6', user_id: MOCK_USER_ID, word: 'ruminate', definition: 'To think deeply about something', example_sentence: 'She would ruminate on the problem for hours before finding a solution.', emotion_anchor: 'A person staring out a rainy window', source: 'user', register: 'formal', frequency_band: 3, created_at: daysAgo(4) },
  { id: 'w7', user_id: MOCK_USER_ID, word: 'pragmatic', definition: 'Dealing with things sensibly and realistically', example_sentence: 'We need a pragmatic approach to solve this budget crisis.', emotion_anchor: 'A toolbox — the right tool for each job', source: 'user', register: 'formal', frequency_band: 4, created_at: daysAgo(2) },
  { id: 'w8', user_id: MOCK_USER_ID, word: 'equanimity', definition: 'Mental calmness, composure, and evenness of temper, especially in a difficult situation', example_sentence: 'She handled the crisis with remarkable equanimity.', emotion_anchor: 'A still lake reflecting mountains', source: 'user', register: 'formal', frequency_band: 2, created_at: daysAgo(1) },
];

export const mockWordStats: WordStats[] = [
  { id: 'ws1', user_id: MOCK_USER_ID, word_id: 'w1', ease_factor: 2.6, interval_days: 10, repetitions: 5, next_review_at: hoursFromNow(-2), last_reviewed_at: daysAgo(10), times_correct: 5, times_incorrect: 1 },
  { id: 'ws2', user_id: MOCK_USER_ID, word_id: 'w2', ease_factor: 2.3, interval_days: 6, repetitions: 3, next_review_at: hoursFromNow(-5), last_reviewed_at: daysAgo(6), times_correct: 3, times_incorrect: 2 },
  { id: 'ws3', user_id: MOCK_USER_ID, word_id: 'w3', ease_factor: 1.6, interval_days: 1, repetitions: 1, next_review_at: hoursFromNow(1), last_reviewed_at: daysAgo(1), times_correct: 1, times_incorrect: 4 },
  { id: 'ws4', user_id: MOCK_USER_ID, word_id: 'w4', ease_factor: 2.1, interval_days: 3, repetitions: 2, next_review_at: hoursFromNow(-1), last_reviewed_at: daysAgo(3), times_correct: 2, times_incorrect: 2 },
  { id: 'ws5', user_id: MOCK_USER_ID, word_id: 'w5', ease_factor: 1.5, interval_days: 1, repetitions: 0, next_review_at: hoursFromNow(-3), last_reviewed_at: daysAgo(1), times_correct: 0, times_incorrect: 3 },
  { id: 'ws6', user_id: MOCK_USER_ID, word_id: 'w6', ease_factor: 2.5, interval_days: 6, repetitions: 2, next_review_at: hoursFromNow(24), last_reviewed_at: daysAgo(6), times_correct: 2, times_incorrect: 0 },
  { id: 'ws7', user_id: MOCK_USER_ID, word_id: 'w7', ease_factor: 2.8, interval_days: 15, repetitions: 6, next_review_at: hoursFromNow(48), last_reviewed_at: daysAgo(15), times_correct: 6, times_incorrect: 0 },
  { id: 'ws8', user_id: MOCK_USER_ID, word_id: 'w8', ease_factor: 2.0, interval_days: 1, repetitions: 1, next_review_at: hoursFromNow(-6), last_reviewed_at: daysAgo(1), times_correct: 1, times_incorrect: 1 },
];

export const mockWordContexts: WordContext[] = [
  { id: 'wc1', word_id: 'w1', sentence: 'Social media trends are ephemeral — here today, forgotten tomorrow.', source_label: 'NY Times', created_at: daysAgo(14) },
  { id: 'wc2', word_id: 'w1', sentence: 'The ephemeral nature of youth makes it all the more precious.', source_label: 'Reddit', created_at: daysAgo(14) },
  { id: 'wc3', word_id: 'w2', sentence: 'The architect was meticulous about every measurement in the blueprint.', source_label: 'Podcast', created_at: daysAgo(12) },
  { id: 'wc4', word_id: 'w2', sentence: 'Her meticulous note-taking paid off during the final exam.', source_label: 'Reddit', created_at: daysAgo(12) },
  { id: 'wc5', word_id: 'w3', sentence: 'The pernicious effects of sleep deprivation accumulate over weeks.', source_label: 'NY Times', created_at: daysAgo(10) },
  { id: 'wc6', word_id: 'w3', sentence: 'Gossip can be pernicious, destroying reputations without evidence.', source_label: 'Podcast', created_at: daysAgo(10) },
  { id: 'wc7', word_id: 'w4', sentence: 'Investors remain sanguine despite the market downturn.', source_label: 'NY Times', created_at: daysAgo(8) },
  { id: 'wc8', word_id: 'w4', sentence: 'Her sanguine personality lifted the mood of the entire team.', source_label: 'Reddit', created_at: daysAgo(8) },
  { id: 'wc9', word_id: 'w5', sentence: 'Complex jargon can obfuscate rather than clarify important issues.', source_label: 'Podcast', created_at: daysAgo(6) },
  { id: 'wc10', word_id: 'w5', sentence: 'The company tried to obfuscate the data breach from the public.', source_label: 'NY Times', created_at: daysAgo(6) },
  { id: 'wc11', word_id: 'w6', sentence: 'Don\'t just ruminate on your mistakes — learn from them and move on.', source_label: 'Reddit', created_at: daysAgo(4) },
  { id: 'wc12', word_id: 'w6', sentence: 'Scientists ruminate over their findings before publishing results.', source_label: 'Podcast', created_at: daysAgo(4) },
  { id: 'wc13', word_id: 'w7', sentence: 'A pragmatic leader focuses on solutions rather than ideology.', source_label: 'NY Times', created_at: daysAgo(2) },
  { id: 'wc14', word_id: 'w7', sentence: 'Being pragmatic doesn\'t mean giving up your values.', source_label: 'Reddit', created_at: daysAgo(2) },
  { id: 'wc15', word_id: 'w8', sentence: 'Meditation helps cultivate a sense of equanimity in daily life.', source_label: 'Podcast', created_at: daysAgo(1) },
  { id: 'wc16', word_id: 'w8', sentence: 'His equanimity in the face of criticism earned him respect.', source_label: 'NY Times', created_at: daysAgo(1) },
];

export const mockCollocations: WordCollocation[] = [
  { id: 'cl1', word_id: 'w1', collocation: 'ephemeral beauty', created_at: daysAgo(14) },
  { id: 'cl2', word_id: 'w1', collocation: 'ephemeral nature', created_at: daysAgo(14) },
  { id: 'cl3', word_id: 'w2', collocation: 'meticulous attention', created_at: daysAgo(12) },
  { id: 'cl4', word_id: 'w2', collocation: 'meticulous planning', created_at: daysAgo(12) },
  { id: 'cl5', word_id: 'w3', collocation: 'pernicious influence', created_at: daysAgo(10) },
  { id: 'cl6', word_id: 'w3', collocation: 'pernicious effects', created_at: daysAgo(10) },
  { id: 'cl7', word_id: 'w4', collocation: 'sanguine outlook', created_at: daysAgo(8) },
  { id: 'cl8', word_id: 'w4', collocation: 'remain sanguine', created_at: daysAgo(8) },
  { id: 'cl9', word_id: 'w5', collocation: 'obfuscate the truth', created_at: daysAgo(6) },
  { id: 'cl10', word_id: 'w5', collocation: 'deliberately obfuscate', created_at: daysAgo(6) },
  { id: 'cl11', word_id: 'w6', collocation: 'ruminate on', created_at: daysAgo(4) },
  { id: 'cl12', word_id: 'w6', collocation: 'ruminate over', created_at: daysAgo(4) },
  { id: 'cl13', word_id: 'w7', collocation: 'pragmatic approach', created_at: daysAgo(2) },
  { id: 'cl14', word_id: 'w7', collocation: 'pragmatic solution', created_at: daysAgo(2) },
  { id: 'cl15', word_id: 'w8', collocation: 'maintain equanimity', created_at: daysAgo(1) },
  { id: 'cl16', word_id: 'w8', collocation: 'sense of equanimity', created_at: daysAgo(1) },
];

export const mockSemanticConnections: SemanticConnection[] = [
  { id: 'sc1', word_id: 'w1', connected_word: 'transient', connection_type: 'synonym' },
  { id: 'sc2', word_id: 'w1', connected_word: 'permanent', connection_type: 'antonym' },
  { id: 'sc3', word_id: 'w2', connected_word: 'thorough', connection_type: 'synonym' },
  { id: 'sc4', word_id: 'w2', connected_word: 'careless', connection_type: 'antonym' },
  { id: 'sc5', word_id: 'w6', connected_word: 'ponder', connection_type: 'synonym' },
  { id: 'sc6', word_id: 'w7', connected_word: 'practical', connection_type: 'synonym' },
  { id: 'sc7', word_id: 'w7', connected_word: 'idealistic', connection_type: 'antonym' },
  { id: 'sc8', word_id: 'w8', connected_word: 'composure', connection_type: 'synonym' },
];

export const mockReviewSessions: ReviewSession[] = [
  { id: 'rs1', user_id: MOCK_USER_ID, started_at: daysAgo(7), ended_at: daysAgo(7), words_reviewed: 5, words_correct: 4, session_type: 'battle' },
  { id: 'rs2', user_id: MOCK_USER_ID, started_at: daysAgo(6), ended_at: daysAgo(6), words_reviewed: 4, words_correct: 3, session_type: 'battle' },
  { id: 'rs3', user_id: MOCK_USER_ID, started_at: daysAgo(5), ended_at: daysAgo(5), words_reviewed: 6, words_correct: 5, session_type: 'battle' },
  { id: 'rs4', user_id: MOCK_USER_ID, started_at: daysAgo(3), ended_at: daysAgo(3), words_reviewed: 3, words_correct: 2, session_type: 'battle' },
  { id: 'rs5', user_id: MOCK_USER_ID, started_at: daysAgo(2), ended_at: daysAgo(2), words_reviewed: 8, words_correct: 7, session_type: 'battle' },
  { id: 'rs6', user_id: MOCK_USER_ID, started_at: daysAgo(1), ended_at: daysAgo(1), words_reviewed: 5, words_correct: 4, session_type: 'battle' },
];

// Helper to get word with all relations
export function getWordWithStats(wordId: string): {
  word: Word;
  stats: WordStats | undefined;
  contexts: WordContext[];
  collocations: WordCollocation[];
  connections: SemanticConnection[];
} | undefined {
  const word = mockWords.find(w => w.id === wordId);
  if (!word) return undefined;
  return {
    word,
    stats: mockWordStats.find(s => s.word_id === wordId),
    contexts: mockWordContexts.filter(c => c.word_id === wordId),
    collocations: mockCollocations.filter(c => c.word_id === wordId),
    connections: mockSemanticConnections.filter(c => c.word_id === wordId),
  };
}

// Get words due for review
export function getDueWords(): { word: Word; stats: WordStats }[] {
  const now = new Date();
  return mockWordStats
    .filter(s => new Date(s.next_review_at) <= now)
    .sort((a, b) => new Date(a.next_review_at).getTime() - new Date(b.next_review_at).getTime())
    .slice(0, 20)
    .map(stats => ({
      word: mockWords.find(w => w.id === stats.word_id)!,
      stats,
    }))
    .filter(item => item.word);
}

export function getEaseColor(easeFactor: number): string {
  if (easeFactor < 1.8) return 'ease-struggling';
  if (easeFactor <= 2.4) return 'ease-learning';
  return 'ease-strong';
}

export function getEaseLabel(easeFactor: number): string {
  if (easeFactor < 1.8) return 'Struggling';
  if (easeFactor <= 2.4) return 'Learning';
  return 'Strong';
}
