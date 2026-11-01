import { useId } from 'react';
import { CUP, FOOT, HANDLE_LEFT, MIRROR, NECK, STAR, STEM } from './trophyShape';

interface ClearTrophyProps {
  size?: number;
  /** Light sweep across the cup and twinkling sparkles. */
  animated?: boolean;
  /** Short text engraved on the plinth, e.g. a date. */
  plaque?: string;
}

function Sparkle({ x, y, s, delay }: { x: number; y: number; s: number; delay: number }) {
  return (
    <path
      d={`M${x} ${y - s} Q${x} ${y} ${x + s} ${y} Q${x} ${y} ${x} ${y + s} Q${x} ${y} ${x - s} ${y} Q${x} ${y} ${x} ${y - s} Z`}
      fill="#f8fafc"
    >
      <animate attributeName="opacity" values="0;1;0" dur="2.4s" begin={`${delay}s`} repeatCount="indefinite" />
      <animateTransform
        attributeName="transform" type="rotate" values={`0 ${x} ${y};90 ${x} ${y}`}
        dur="2.4s" begin={`${delay}s`} repeatCount="indefinite"
      />
    </path>
  );
}

/** The daily-clear trophy: a polished silver big-eared cup on an obsidian plinth. */
export function ClearTrophy({ size = 200, animated = false, plaque }: ClearTrophyProps) {
  const id = useId().replace(/:/g, '');
  const silver = `${id}-silver`;
  const silverV = `${id}-silverv`;
  const bowl = `${id}-bowl`;
  const plinth = `${id}-plinth`;
  const clip = `${id}-clip`;
  const shine = `${id}-shine`;

  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 200 240" role="img" aria-label="Silver trophy" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={silver} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#4b5563" />
          <stop offset="0.22" stopColor="#c7ccd4" />
          <stop offset="0.42" stopColor="#ffffff" />
          <stop offset="0.6" stopColor="#dfe3e8" />
          <stop offset="0.85" stopColor="#8b93a0" />
          <stop offset="1" stopColor="#3f4652" />
        </linearGradient>
        <linearGradient id={silverV} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.35" stopColor="#d4d9e0" />
          <stop offset="0.75" stopColor="#8b93a0" />
          <stop offset="1" stopColor="#5b6370" />
        </linearGradient>
        <linearGradient id={bowl} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5b6370" />
          <stop offset="0.2" stopColor="#b8bfc9" />
          <stop offset="0.38" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#e5e8ed" />
          <stop offset="0.82" stopColor="#99a1ad" />
          <stop offset="1" stopColor="#4b5563" />
        </linearGradient>
        <linearGradient id={plinth} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#262a31" />
          <stop offset="1" stopColor="#0a0b0e" />
        </linearGradient>
        <linearGradient id={shine} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.8" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={clip}>
          <path d={CUP} />
        </clipPath>
      </defs>

      {/* Slender handles: curl over the rim, loop down the sides */}
      {[undefined, MIRROR].map((t, i) => (
        <g key={i} transform={t}>
          <path d={HANDLE_LEFT} fill="none" stroke="#3f4652" strokeWidth="7" strokeLinecap="round" />
          <path d={HANDLE_LEFT} fill="none" stroke={`url(#${silverV})`} strokeWidth="5.2" strokeLinecap="round" />
          <path d={HANDLE_LEFT} fill="none" stroke="#ffffff" strokeOpacity={i === 0 ? 0.7 : 0.3} strokeWidth="1.3" strokeLinecap="round" />
        </g>
      ))}

      {/* Bowl */}
      <path d={CUP} fill={`url(#${bowl})`} />
      <path d="M60 74 C57 108 68 146 87 171" fill="none" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="3.6" strokeLinecap="round" />
      <path d={NECK} fill={`url(#${silver})`} />
      <ellipse cx="100" cy="34" rx="30" ry="4.6" fill="#4b5563" />
      <ellipse cx="100" cy="34" rx="30" ry="4.6" fill="none" stroke={`url(#${silver})`} strokeWidth="2.4" />

      {/* Star emblem */}
      <path d={STAR} fill="#6b7280" fillOpacity="0.55" stroke="#ffffff" strokeOpacity="0.85" strokeWidth="1.2" strokeLinejoin="round" />

      {/* Light sweep */}
      {animated && (
        <g clipPath={`url(#${clip})`}>
          <rect x="-50" y="40" width="30" height="150" fill={`url(#${shine})`} transform="skewX(-14)">
            <animate attributeName="x" values="-40;-40;200" keyTimes="0;0.55;1" dur="3.2s" repeatCount="indefinite" />
          </rect>
        </g>
      )}

      {/* Short stem and flared foot */}
      <path d={STEM} fill={`url(#${silver})`} />
      <ellipse cx="100" cy="181" rx="10" ry="2.6" fill={`url(#${silver})`} />
      <path d={FOOT} fill={`url(#${silver})`} />
      <ellipse cx="100" cy="194" rx="12.5" ry="2.4" fill={`url(#${silver})`} />

      {/* Plinth */}
      <rect x="58" y="210" width="84" height="26" rx="4" fill={`url(#${plinth})`} stroke="#9aa3af" strokeOpacity="0.5" strokeWidth="1.1" />
      <rect x="70" y="216" width="60" height="14" rx="2" fill="none" stroke="#c8922a" strokeOpacity="0.8" strokeWidth="1" />
      {plaque && (
        <text
          x="100" y="223.4" textAnchor="middle" dominantBaseline="middle" fill="#f0c96a"
          style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 7.5, fontWeight: 700, letterSpacing: 1.2 }}
        >
          {plaque.toUpperCase()}
        </text>
      )}

      {animated && (
        <>
          <Sparkle x={22} y={20} s={7} delay={0} />
          <Sparkle x={180} y={14} s={9} delay={0.8} />
          <Sparkle x={190} y={118} s={6} delay={1.5} />
          <Sparkle x={10} y={128} s={5} delay={1.1} />
        </>
      )}
    </svg>
  );
}
