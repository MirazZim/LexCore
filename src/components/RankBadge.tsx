import { useId, type ReactNode } from 'react';

/**
 * Engraved medals for the eight identity titles. Each title has its own
 * emblem, the frame grows more ornate with rank, and the metal climbs from
 * bronze to silver, gold, platinum, ruby and diamond. Drawn on a 120×120 grid, medal centred at (60,56).
 */

type Metal = { hi: string; mid: string; lo: string; ink: string };

const METALS: Record<'bronze' | 'silver' | 'gold' | 'platinum' | 'ruby' | 'diamond' | 'pewter', Metal> = {
  bronze: { hi: '#f2c08a', mid: '#b4733d', lo: '#5c3216', ink: '#3d1f0b' },
  silver: { hi: '#ffffff', mid: '#b5b9bf', lo: '#555a62', ink: '#2c3036' },
  gold: { hi: '#fff1b8', mid: '#d6a640', lo: '#73500f', ink: '#4a3006' },
  platinum: { hi: '#ffffff', mid: '#c3ccd6', lo: '#5d6976', ink: '#262e37' },
  ruby: { hi: '#ffc4cc', mid: '#d0223c', lo: '#560814', ink: '#2e040a' },
  diamond: { hi: '#ffffff', mid: '#bfe8ff', lo: '#5d8fbf', ink: '#1d3a5a' },
  pewter: { hi: '#8a857c', mid: '#55514b', lo: '#2a2825', ink: '#1c1b19' },
};
const TIER_METAL: (keyof typeof METALS)[] = ['bronze', 'bronze', 'silver', 'gold', 'platinum', 'ruby', 'diamond', 'diamond'];
const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

const C = { x: 60, y: 56 };
const polar = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return [C.x + r * Math.cos(a), C.y + r * Math.sin(a)] as const;
};
const ring = (n: number, r: number) => Array.from({ length: n }, (_, i) => polar(r, (360 / n) * i - 90));
const poly = (pts: readonly (readonly [number, number])[]) => pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');

/** Star-shaped outline alternating between two radii. */
const starRim = (points: number, outer: number, inner: number) =>
  poly(Array.from({ length: points * 2 }, (_, i) => polar(i % 2 ? inner : outer, (180 / points) * i - 90)));

/** A wavy wax-seal edge. */
function scallop(r: number, lobes: number, depth: number) {
  const pts = Array.from({ length: 144 }, (_, i) => {
    const deg = (360 / 144) * i;
    return polar(r + depth * Math.cos((lobes * deg * Math.PI) / 180), deg);
  });
  return `M${poly(pts).replace(/ /g, ' L')} Z`;
}

/* ─── Emblems: engraved into the field, drawn in the metal's ink ─── */
const EMBLEMS: ReactNode[] = [
  // I · Apprentice: a seedling breaking ground
  <g key="seed">
    <path d="M60 74 C60 66 60 60 60 50" fill="none" strokeWidth={3} strokeLinecap="round" />
    <path d="M60 60 C50 60 43 53 43 45 C52 45 60 50 60 60 Z" />
    <path d="M60 53 C69 53 77 46 77 37 C67 37 60 43 60 53 Z" />
    <path d="M46 75 Q60 69 74 75" fill="none" strokeWidth={2.5} strokeLinecap="round" />
  </g>,
  // II · Scribe: quill over an inkwell
  <g key="quill">
    <path d="M49 66 H71 V73 Q71 76 68 76 H52 Q49 76 49 73 Z" />
    <path d="M55 61 H65 V66 H55 Z" />
    <path d="M72 29 C84 35 80 50 65 59 L58 65 L60 58 C58 46 62 35 72 29 Z" />
    <path d="M59 64 L70 38" fill="none" strokeWidth={1.4} strokeOpacity={0.5} stroke="#fff" />
  </g>,
  // III · Scholar: an open book giving off light
  <g key="book">
    <path d="M34 62 C43 57 53 57 60 61 C67 57 77 57 86 62 V75 C77 70 67 70 60 74 C53 70 43 70 34 75 Z" />
    {[[60, 30], [46, 34], [74, 34], [37, 44], [83, 44]].map(([x, y]) => (
      <path key={`${x}`} d={`M60 54 L${x} ${y}`} fill="none" strokeWidth={2.4} strokeLinecap="round" />
    ))}
  </g>,
  // IV · Rhetorician: a torch held aloft
  <g key="torch">
    <path d="M56 63 H64 L62 80 H58 Z" />
    <path d="M51 56 H69 L65 63 H55 Z" />
    <path d="M60 27 C67 36 71 43 67 51 C65 55 55 55 53 51 C49 43 55 38 60 27 Z" />
  </g>,
  // V · Lexicographer: the alphabet, end to end
  <g key="az">
    <text x="60" y="66" textAnchor="middle" fontFamily="Cinzel, serif" fontWeight={700} fontSize={24} letterSpacing={-1}>A·Z</text>
    <path d="M40 72 H80" fill="none" strokeWidth={1.6} />
    <path d="M44 41 H76" fill="none" strokeWidth={1.6} />
  </g>,
  // VI · Philologist: an hourglass, words through time
  <g key="hourglass">
    <path d="M46 32 H74 V36 H46 Z M46 76 H74 V80 H46 Z" />
    <path d="M49 36 H71 C71 46 63 50 61 56 C63 62 71 66 71 76 H49 C49 66 57 62 59 56 C57 50 49 46 49 36 Z" fillOpacity={0.35} />
    <path d="M53 42 H67 C66 47 62 49 60 52 C58 49 54 47 53 42 Z M51 75 C53 68 57 66 60 66 C63 66 67 68 69 75 Z" />
  </g>,
  // VII · Etymologist: a tree and the roots it grew from
  <g key="tree">
    <circle cx={60} cy={40} r={11} />
    <circle cx={49} cy={47} r={8} />
    <circle cx={71} cy={47} r={8} />
    <path d="M57 50 L55 66 H65 L63 50 Z" />
    <path d="M60 66 L46 77 M60 66 L54 80 M60 66 L66 80 M60 66 L74 77" fill="none" strokeWidth={2.2} strokeLinecap="round" />
  </g>,
  // VIII · Polymath: the open eye
  <g key="eye">
    <path d="M36 57 Q60 36 84 57 Q60 78 36 57 Z" />
    <circle cx={60} cy={57} r={9} fill="#fff" fillOpacity={0.85} />
    <circle cx={60} cy={57} r={4.5} />
    {[-60, -90, -120].map(d => {
      const [x1, y1] = [60 + 24 * Math.cos((d * Math.PI) / 180), 57 + 24 * Math.sin((d * Math.PI) / 180)];
      const [x2, y2] = [60 + 31 * Math.cos((d * Math.PI) / 180), 57 + 31 * Math.sin((d * Math.PI) / 180)];
      return <path key={d} d={`M${x1} ${y1} L${x2} ${y2}`} fill="none" strokeWidth={2.4} strokeLinecap="round" />;
    })}
  </g>,
];

function Laurel({ fill, stroke, r = 43 }: { fill: string; stroke: string; r?: number }) {
  const leaves: ReactNode[] = [];
  for (let i = 0; i < 10; i++) {
    const deg = 100 + i * 15;
    const [x, y] = polar(r, deg);
    const rot = deg + 90 + 30;
    const s = 1 - i * 0.035;
    leaves.push(
      <ellipse key={`l${i}`} cx={x} cy={y} rx={7.5 * s} ry={3.2 * s} transform={`rotate(${rot} ${x} ${y})`} />,
      <ellipse key={`r${i}`} cx={120 - x} cy={y} rx={7.5 * s} ry={3.2 * s} transform={`rotate(${180 - rot} ${120 - x} ${y})`} />,
    );
  }
  return <g fill={fill} stroke={stroke} strokeWidth={0.8}>{leaves}</g>;
}

export interface RankBadgeProps {
  /** 0–7, the title's position in the journey */
  tier: number;
  locked?: boolean;
  size?: number;
  className?: string;
  title?: string;
  /** Hide the numeral ribbon (e.g. at very small sizes) */
  ribbon?: boolean;
}

export function RankBadge({ tier, locked = false, size = 64, className = '', title, ribbon = true }: RankBadgeProps) {
  const uid = useId().replace(/:/g, '');
  const t = Math.max(0, Math.min(7, tier));
  const m = METALS[locked ? 'pewter' : TIER_METAL[t]];
  const g = { face: `rb-face-${uid}`, rim: `rb-rim-${uid}`, ribbon: `rb-rib-${uid}` };
  const face = `url(#${g.face})`;
  const rimFill = `url(#${g.rim})`;
  const edge = { stroke: m.ink, strokeWidth: 1.6, strokeLinejoin: 'round' as const };

  // Frame: what surrounds the field, escalating with rank
  let frame: ReactNode;
  let fieldR = 31;
  switch (t) {
    case 0: // plain coin with a beaded rim
      frame = <>
        <circle cx={C.x} cy={C.y} r={40} fill={rimFill} {...edge} />
        {ring(30, 36).map(([x, y], i) => <circle key={i} cx={x} cy={y} r={1.7} fill={m.hi} opacity={0.85} />)}
      </>;
      break;
    case 1: // wax-seal scallop
      frame = <path d={scallop(39, 14, 2.6)} fill={rimFill} {...edge} />;
      fieldR = 30;
      break;
    case 2: // riveted octagon plaque
      frame = <>
        <polygon points={poly(Array.from({ length: 8 }, (_, i) => polar(42, 45 * i + 22.5)))} fill={rimFill} {...edge} />
        {Array.from({ length: 8 }, (_, i) => polar(37.5, 45 * i + 22.5)).map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={2} fill={m.hi} stroke={m.lo} strokeWidth={0.6} />
        ))}
      </>;
      break;
    case 3: // heraldic shield
      frame = <path d="M22 18 H98 V50 C98 76 80 92 60 101 C40 92 22 76 22 50 Z" fill={rimFill} {...edge} />;
      fieldR = 0;
      break;
    case 4: // compass-star rim
      frame = <polygon points={starRim(16, 46, 38)} fill={rimFill} {...edge} />;
      break;
    case 5: // sunburst
      frame = <>
        <polygon points={starRim(24, 49, 38)} fill={rimFill} {...edge} />
        <circle cx={C.x} cy={C.y} r={38} fill={rimFill} {...edge} />
      </>;
      break;
    case 6: // laurel-wreathed coin
      frame = <>
        <Laurel fill={m.mid} stroke={m.ink} />
        <circle cx={C.x} cy={C.y} r={37} fill={rimFill} {...edge} />
      </>;
      fieldR = 30;
      break;
    default: // radiant crown, laurel and gems
      frame = <>
        <polygon points={starRim(32, 54, 41)} fill={rimFill} {...edge} opacity={0.95} />
        <Laurel fill={m.mid} stroke={m.ink} r={45} />
        <circle cx={C.x} cy={C.y} r={38} fill={rimFill} {...edge} />
        {[[22, 56], [98, 56]].map(([x, y]) => (
          <circle key={x} cx={x} cy={y} r={3.2} fill={locked ? '#3a3633' : '#9b1c23'} stroke={m.ink} strokeWidth={1} />
        ))}
        <path d="M44 16 L48 4 L54 12 L60 1 L66 12 L72 4 L76 16 Z" fill={rimFill} {...edge} />
        <circle cx={60} cy={9} r={2} fill={locked ? '#3a3633' : '#9b1c23'} />
      </>;
      break;
  }

  return (
    <svg
      viewBox="-4 -4 128 128"
      width={size}
      height={size}
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{ overflow: 'visible', filter: `drop-shadow(0 ${size / 20}px ${size / 12}px rgba(0,0,0,0.55))` }}
    >
      <defs>
        <radialGradient id={g.face} cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor={m.hi} />
          <stop offset="55%" stopColor={m.mid} />
          <stop offset="100%" stopColor={m.lo} />
        </radialGradient>
        <linearGradient id={g.rim} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={m.hi} />
          <stop offset="45%" stopColor={m.mid} />
          <stop offset="100%" stopColor={m.lo} />
        </linearGradient>
        <linearGradient id={g.ribbon} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={locked ? '#4a4540' : '#a3262c'} />
          <stop offset="100%" stopColor={locked ? '#2c2925' : '#5e1014'} />
        </linearGradient>
      </defs>

      {frame}

      {/* Field: recessed centre the emblem is struck into */}
      {fieldR > 0
        ? <circle cx={C.x} cy={C.y} r={fieldR} fill={face} stroke={m.lo} strokeWidth={1.2} />
        : <path d="M30 25 H90 V51 C90 72 75 85 60 92 C45 85 30 72 30 51 Z" fill={face} stroke={m.lo} strokeWidth={1.2} />}
      {fieldR > 0 && <circle cx={C.x} cy={C.y} r={fieldR - 3} fill="none" stroke={m.lo} strokeWidth={0.6} strokeDasharray="1.5 2" opacity={0.7} />}

      {/* Emblem: a light offset copy under a dark one reads as struck metal */}
      <g transform={`translate(${C.x} ${C.y}) scale(${t === 3 ? 0.78 : 0.72}) translate(${-C.x} ${-C.y})`}>
        <g fill={m.hi} stroke={m.hi} opacity={0.55} transform="translate(0.9 1.1)">{EMBLEMS[t]}</g>
        <g fill={m.ink} stroke={m.ink}>{EMBLEMS[t]}</g>
      </g>

      {ribbon && (
        <g>
          <path d="M30 95 L14 97 L19 103 L14 110 L30 108 Z" fill={`url(#${g.ribbon})`} stroke="#2a0709" strokeWidth={1} />
          <path d="M90 95 L106 97 L101 103 L106 110 L90 108 Z" fill={`url(#${g.ribbon})`} stroke="#2a0709" strokeWidth={1} />
          <path d="M26 92 Q60 86 94 92 L94 107 Q60 101 26 107 Z" fill={`url(#${g.ribbon})`} stroke={locked ? '#1c1b19' : '#2a0709'} strokeWidth={1.2} />
          <text x="60" y="102" textAnchor="middle" fontFamily="Cinzel, serif" fontWeight={700} fontSize={10} letterSpacing={1.5} fill={locked ? '#8a857c' : '#f3dfa2'}>
            {NUMERALS[t]}
          </text>
        </g>
      )}
    </svg>
  );
}
