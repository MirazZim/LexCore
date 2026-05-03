// Per-device preferences that don't warrant a DB migration.
// Roast Mode is opt-in: a savage IELTS-examiner persona that creates
// emotional encoding through directness. The masochist segment (B6 → B8
// learners) responds to it; everyone else stays on the default coach.

const ROAST_KEY = 'lexcore.prefs.roast.v1';

export function getRoastMode(): boolean {
  try {
    return localStorage.getItem(ROAST_KEY) === '1';
  } catch {
    return false;
  }
}

export function setRoastMode(on: boolean) {
  try {
    localStorage.setItem(ROAST_KEY, on ? '1' : '0');
  } catch {
    // ignore
  }
}
