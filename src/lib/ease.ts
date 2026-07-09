// FSRS difficulty (1–10) → human label. Thresholds mirror EaseBadge colors.
export function getEaseLabel(difficulty: number): string {
  if (difficulty > 7) return 'Struggling';
  if (difficulty >= 4) return 'Learning';
  return 'Strong';
}
