export interface SM2Result {
  newEaseFactor: number;
  newInterval: number;
  newRepetitions: number;
  nextReviewAt: Date;
}

/**
 * SM-2 Spaced Repetition Algorithm
 * @param easeFactor - current ease factor (default 2.5)
 * @param interval - current interval in days (default 1)
 * @param repetitions - number of successful repetitions (default 0)
 * @param quality - user rating 0–5 (0=Again, 2=Hard, 4=Good, 5=Easy)
 */
export function calculateNextReview(
  easeFactor: number,
  interval: number,
  repetitions: number,
  quality: number
): SM2Result {
  let newEaseFactor = easeFactor;
  let newInterval: number;
  let newRepetitions: number;

  if (quality < 3) {
    // Failed recall — reset
    newRepetitions = 0;
    newInterval = 1;
  } else {
    // Successful recall
    if (repetitions === 0) {
      newInterval = 1;
    } else if (repetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * easeFactor);
    }

    newEaseFactor =
      easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

    if (newEaseFactor < 1.3) {
      newEaseFactor = 1.3;
    }

    newRepetitions = repetitions + 1;
  }

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);

  return {
    newEaseFactor,
    newInterval,
    newRepetitions,
    nextReviewAt,
  };
}
