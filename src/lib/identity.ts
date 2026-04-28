export interface Title {
  name: string;
  image: string;
  /** inclusive start day (1-indexed active days) */
  from: number;
  to: number | null;
}

export const TITLES: Title[] = [
  { name: 'Apprentice',    image: '/Apprentice.webp',       from: 1,   to: 7    },
  { name: 'Scribe',        image: '/Scribe.webp',           from: 8,   to: 20   },
  { name: 'Scholar',       image: '/Scholar.webp',          from: 21,  to: 45   },
  { name: 'Rhetorician',   image: '/Rhetorician.webp',      from: 46,  to: 75   },
  { name: 'Lexicographer', image: '/Lexicographer.webp',    from: 76,  to: 120  },
  { name: 'Philologist',   image: '/Philologist.webp',      from: 121, to: 200  },
  { name: 'Etymologist',   image: '/Etymologist.webp',      from: 201, to: 365  },
  { name: 'Polymath',      image: '/Polymath.webp',         from: 366, to: null },
];

export interface Identity {
  current: Title;
  next: Title | null;
  /** 0–1 progress toward next title */
  progress: number;
  daysIn: number;
}

/** daysActive = number of distinct calendar days with at least one review session */
export function getIdentity(daysActive: number): Identity {
  const daysIn = Math.max(1, daysActive);
  const idx    = TITLES.findIndex(t => t.to === null || daysIn <= t.to);
  const current = TITLES[Math.max(idx, 0)];
  const next    = idx < TITLES.length - 1 ? TITLES[idx + 1] : null;

  let progress: number;
  if (!next) {
    progress = 1;
  } else {
    const span = next.from - current.from;
    progress   = Math.min((daysIn - current.from) / span, 1);
  }

  return { current, next, progress, daysIn };
}
