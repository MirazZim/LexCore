// Daily clears: the day's trophy, earned when every due word is reviewed.
import { dateKey } from './streak';

export interface DailyClear {
  id: string;
  day: string; // YYYY-MM-DD local
  words_cleared: number;
  accuracy: number;
  quote: string;
  quote_author: string;
  created_at: string;
}

const QUOTES: { text: string; author: string }[] = [
  { text: 'Success is the sum of small efforts, repeated day in and day out.', author: 'Robert Collier' },
  { text: 'The limits of my language mean the limits of my world.', author: 'Ludwig Wittgenstein' },
  { text: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.', author: 'Will Durant' },
  { text: 'A journey of a thousand miles begins with a single step.', author: 'Lao Tzu' },
  { text: 'Small deeds done are better than great deeds planned.', author: 'Peter Marshall' },
  { text: 'Words are, of course, the most powerful drug used by mankind.', author: 'Rudyard Kipling' },
  { text: 'Motivation is what gets you started. Habit is what keeps you going.', author: 'Jim Ryun' },
  { text: 'One language sets you in a corridor for life. Two languages open every door along the way.', author: 'Frank Smith' },
  { text: 'Little by little, one travels far.', author: 'Spanish proverb' },
  { text: 'The expert in anything was once a beginner.', author: 'Helen Hayes' },
];

/** The quote for a given day — stable, so a re-render never swaps it. */
export function quoteForDay(day: string) {
  let h = 0;
  for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return QUOTES[h % QUOTES.length];
}

const dayMs = 86400000;
const toDate = (day: string) => new Date(`${day}T00:00:00`);

/** Current and best runs of consecutive cleared days. */
export function clearStreaks(days: string[]): { current: number; best: number } {
  const sorted = [...new Set(days)].sort();
  let best = 0;
  let run = 0;
  for (let i = 0; i < sorted.length; i++) {
    const gap = i === 0 ? 0 : Math.round((toDate(sorted[i]).getTime() - toDate(sorted[i - 1]).getTime()) / dayMs);
    run = gap === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  // The current run is alive if it ends today or yesterday (today not done yet)
  const last = sorted[sorted.length - 1];
  const yesterday = dateKey(new Date(Date.now() - dayMs));
  const current = last && (last === dateKey(new Date()) || last === yesterday) ? run : 0;
  return { current, best };
}
