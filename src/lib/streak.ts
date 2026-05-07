export const dateKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Normalizes keys stored in the old non-padded format ("2026-5-7" → "2026-05-07").
export function normalizeKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export interface StreakInfo {
  streak: number;
  /** True when there is a recoverable 1-day gap and no recovery has been used for it yet. */
  recoverable: boolean;
  /** The streak count that would result from clicking recover. */
  recoverableStreak: number;
}

/**
 * Calculates the current streak from an array of session start timestamps.
 *
 * @param recoveredDate  The missed date that was recovered (dateKey format), stored in
 *                       user_preferences.streak_recovery_date in Supabase.
 * @param extraDate      Inject an optimistic "today" before the DB save lands — used by
 *                       SummaryPhase so the streak shows correctly right after a session.
 */
export function calculateStreak(
  sessionStartedAts: string[],
  recoveredDate: string | null | undefined,
  extraDate?: string,
): StreakInfo {
  const today = new Date();
  const todayKey = dateKey(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = dateKey(yesterday);
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const twoDaysAgoKey = dateKey(twoDaysAgo);

  // Normalize the stored recovery date in case it was written in old non-padded format.
  const normalizedRecovery = recoveredDate ? normalizeKey(recoveredDate) : null;

  const rawDates = sessionStartedAts.map(s => dateKey(new Date(s)));
  if (extraDate) rawDates.push(normalizeKey(extraDate));
  const sessionDates = [...new Set(rawDates)].sort().reverse();

  if (sessionDates.length === 0) {
    return { streak: 0, recoverable: false, recoverableStreak: 0 };
  }

  // A 1-day gap: yesterday was missed but 2 days ago had a session.
  const sessionSet = new Set(sessionDates);
  const hasOneDayGap = !sessionSet.has(yesterdayKey) && sessionSet.has(twoDaysAgoKey);
  const recoveryActive = normalizedRecovery === yesterdayKey;
  const recoverable = hasOneDayGap && !recoveryActive;

  function countStreak(dates: string[]): number {
    if (dates.length === 0) return 0;
    const set = new Set(dates);
    const startKey = dates[0];
    if (startKey !== todayKey && startKey !== yesterdayKey) return 0;
    let count = 0;
    const check = new Date(today);
    if (startKey !== todayKey) check.setDate(check.getDate() - 1);
    for (let i = 0; i < 365; i++) {
      if (set.has(dateKey(check))) {
        count++;
        check.setDate(check.getDate() - 1);
      } else {
        break;
      }
    }
    return count;
  }

  const effectiveDates = normalizedRecovery
    ? [...new Set([...sessionDates, normalizedRecovery])].sort().reverse()
    : sessionDates;

  const streak = countStreak(effectiveDates);

  const recoverableStreak = recoverable
    ? countStreak(
        [...new Set([...sessionDates, yesterdayKey, ...(normalizedRecovery ? [normalizedRecovery] : [])])].sort().reverse(),
      )
    : 0;

  return { streak, recoverable, recoverableStreak };
}
