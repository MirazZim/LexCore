const KEY = 'lexcore.daily-discovery.v1';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function getDiscoveryGoal(): number {
  const stored = localStorage.getItem('lexcore_shuffle_limit');
  return stored ? Math.max(1, Math.min(50, parseInt(stored, 10))) : 5;
}

export function getDiscoveryCount(): number {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return 0;
    const { date, count } = JSON.parse(raw);
    return date === todayStr() ? count : 0;
  } catch { return 0; }
}

export function bumpDiscovery(): number {
  const next = getDiscoveryCount() + 1;
  localStorage.setItem(KEY, JSON.stringify({ date: todayStr(), count: next }));
  return next;
}
