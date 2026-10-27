import type { CSSProperties } from 'react';

// Two-tone review cards: a deep green hero (the word) over a light surface
// (what you do with it). Shared so phases using it stay in step.

export const HERO_GREEN = '#0a3229';
export const HERO_EDGE = 'rgba(0,255,200,0.14)';
export const HERO: CSSProperties = {
  background: 'radial-gradient(120% 80% at 85% 0%, rgba(0,255,200,0.16) 0%, transparent 55%), linear-gradient(165deg, #0e4a3e 0%, #0a3229 50%, #06201b 100%)',
  border: `1px solid ${HERO_EDGE}`,
};

export const SURFACE: CSSProperties = { background: '#f4f6f4' };

/** Muted text on the green hero. */
export const HERO_MUTED = 'rgba(209,250,229,0.6)';

// The app's neon accents are tuned for dark backgrounds; on the light surface
// each swaps to a deeper shade of the same hue to stay readable.
const INK_ON_LIGHT: Record<string, string> = {
  '#ef4444': '#dc2626',
  '#f97316': '#ea580c',
  '#a78bfa': '#7c3aed',
  '#00ffc8': '#059669',
  '#6ee7b7': '#0d9488',
  '#fbbf24': '#b45309',
};
/** Mix a 6-digit hex toward black by `amount` (0–1). */
function darken(hex: string, amount: number) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const ch = (shift: number) => Math.round(((n >> shift) & 255) * (1 - amount)).toString(16).padStart(2, '0');
  return `#${ch(16)}${ch(8)}${ch(0)}`;
}

/** Readable-on-light version of an accent: a hand-picked shade, else darkened. */
export const ink = (color: string) => INK_ON_LIGHT[color.toLowerCase()] ?? darken(color, 0.35);

/** Primary action on the light surface — the hero's green, so the halves read as one card. */
export const HERO_BUTTON: CSSProperties = { background: HERO_GREEN, color: '#fff' };
