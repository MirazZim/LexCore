import { dateKey } from './streak';

// A normal review session covers at most this many due words. Reviewed words
// get rescheduled and drop out of the due list, so the "next set" is simply
// the first REVIEW_CHUNK_SIZE words that are still due.
export const REVIEW_CHUNK_SIZE = 15;

/**
 * How much of today's due list is conquered. A word reviewed today counts as
 * done only while it isn't due again (an "Again" card comes back later the
 * same day), so done + remaining never double-counts a word.
 */
export function dayProgress(
  reviewEvents: { word_id: string; reviewed_at: string }[],
  dueWordIds: string[],
): { done: number; total: number; percent: number } {
  const today = dateKey(new Date());
  const due = new Set(dueWordIds);
  const done = new Set(
    reviewEvents
      .filter(e => dateKey(new Date(e.reviewed_at)) === today && !due.has(e.word_id))
      .map(e => e.word_id),
  ).size;
  const total = done + due.size;
  return { done, total, percent: total > 0 ? Math.round((done / total) * 100) : 0 };
}

/** Sizes of the sets `total` due words split into, e.g. 37 → [15, 15, 7]. */
export function chunkSizes(total: number): number[] {
  const sizes: number[] = [];
  for (let left = total; left > 0; left -= REVIEW_CHUNK_SIZE) {
    sizes.push(Math.min(REVIEW_CHUNK_SIZE, left));
  }
  return sizes;
}
