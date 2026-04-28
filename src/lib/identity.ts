export interface Title {
  name: 'Apprentice' | 'Scholar' | 'Lexicographer' | 'Etymologist';
  image: string;
  /** inclusive day range (1-indexed days since account creation) */
  from: number;
  to: number | null; // null = no upper bound
}

const TITLES: Title[] = [
  { name: 'Apprentice',    image: '/Apprentice.webp',    from: 1,  to: 7  },
  { name: 'Scholar',       image: '/Scholar.webp',       from: 8,  to: 30 },
  { name: 'Lexicographer', image: '/Lexicographer.webp', from: 31, to: 90 },
  { name: 'Etymologist',   image: '/Etymologist.webp',   from: 91, to: null },
];

export interface Identity {
  current: Title;
  next: Title | null;
  /** 0–1 progress toward next title (1 = maxed out / Etymologist) */
  progress: number;
  daysIn: number;
}

/** daysActive = number of distinct calendar days with at least one review session */
export function getIdentity(daysActive: number): Identity {
  const daysIn = Math.max(1, daysActive);

  const idx = TITLES.findIndex(t => t.to === null || daysIn <= t.to);
  const current = TITLES[Math.max(idx, 0)];
  const next = idx < TITLES.length - 1 ? TITLES[idx + 1] : null;

  let progress: number;
  if (!next) {
    progress = 1;
  } else {
    const span = next.from - current.from;
    progress = Math.min((daysIn - current.from) / span, 1);
  }

  return { current, next, progress, daysIn };
}
