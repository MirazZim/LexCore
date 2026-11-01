import { useEffect, useId, useState } from 'react';
import { animate, motion } from 'framer-motion';
import { BOWL_BOTTOM, BOWL_TOP, CUP, FOOT, HANDLE_LEFT, MIRROR, NECK, STAR, STEM } from './trophyShape';

interface GlassTrophyProps {
  /** 0–100: how full of liquid gold the cup is. */
  percent: number;
  /** Level the pour starts from, so a set's progress visibly rises. */
  fromPercent?: number;
  size?: number;
  /** Hide the number when the caller shows it elsewhere. */
  showLabel?: boolean;
  /** Fill the parent's width instead of a fixed size. */
  fluid?: boolean;
  /** Drop the halo, sparkles and laurels for small renders like the dashboard. */
  minimal?: boolean;
  /** Text engraved on the nameplate. */
  plaque?: string;
}

const WAVELENGTH = 40;
function waveLine(amplitude: number) {
  let d = `M-100 0`;
  for (let x = -100; x < 300; x += WAVELENGTH) {
    d += ` q${WAVELENGTH / 4} ${-amplitude} ${WAVELENGTH / 2} 0 t${WAVELENGTH / 2} 0`;
  }
  return d;
}
const waveFill = (amplitude: number) => `${waveLine(amplitude)} V200 H-100 Z`;

const levelFor = (pct: number) => BOWL_BOTTOM - (Math.min(100, Math.max(0, pct)) / 100) * (BOWL_BOTTOM - BOWL_TOP);

const BUBBLES = [
  { x: 78, r: 1.8, dur: 3.1, delay: 0 },
  { x: 108, r: 1.4, dur: 2.6, delay: 0.9 },
  { x: 97, r: 1.1, dur: 3.6, delay: 1.7 },
  { x: 122, r: 1.7, dur: 2.9, delay: 2.3 },
];

const SPARKLES = [
  { x: 20, y: 18, s: 6, delay: 0 },
  { x: 182, y: 14, s: 8, delay: 0.9 },
  { x: 190, y: 120, s: 5, delay: 1.6 },
  { x: 10, y: 118, s: 4.5, delay: 2.2 },
];

function Sparkle({ x, y, s, delay }: { x: number; y: number; s: number; delay: number }) {
  return (
    <path
      d={`M${x} ${y - s} Q${x} ${y} ${x + s} ${y} Q${x} ${y} ${x} ${y + s} Q${x} ${y} ${x - s} ${y} Q${x} ${y} ${x} ${y - s} Z`}
      fill="#f8fafc" opacity="0"
    >
      <animate attributeName="opacity" values="0;1;0" dur="2.6s" begin={`${delay}s`} repeatCount="indefinite" />
    </path>
  );
}

/** A silver big-eared trophy filling with liquid gold — today's progress toward a Day Cleared trophy. */
export function GlassTrophy({
  percent, fromPercent = 0, size = 200, showLabel = true, fluid = false, minimal = false, plaque = 'Today',
}: GlassTrophyProps) {
  const id = useId().replace(/:/g, '');
  const [shown, setShown] = useState(fromPercent);

  useEffect(() => {
    const controls = animate(fromPercent, percent, {
      duration: 2.2, delay: 0.4, ease: [0.22, 1, 0.36, 1],
      onUpdate: v => setShown(Math.round(v)),
    });
    return () => controls.stop();
  }, [fromPercent, percent]);

  const ids = {
    silver: `${id}-silver`, silverV: `${id}-silverv`, plate: `${id}-plate`, plinth: `${id}-plinth`,
    liquid: `${id}-liquid`, liquidBack: `${id}-liquidback`, sheen: `${id}-sheen`,
    glass: `${id}-glass`, mouth: `${id}-mouth`, halo: `${id}-halo`, shine: `${id}-shine`,
    clip: `${id}-clip`, glow: `${id}-glow`,
  };
  const url = (k: keyof typeof ids) => `url(#${ids[k]})`;

  return (
    <svg
      width={fluid ? '100%' : size} height={fluid ? undefined : size * 1.2}
      viewBox="0 0 200 240" role="img" aria-label={`Trophy ${percent}% full`}
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={ids.silver} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#4b5563" />
          <stop offset="0.22" stopColor="#c7ccd4" />
          <stop offset="0.42" stopColor="#ffffff" />
          <stop offset="0.6" stopColor="#dfe3e8" />
          <stop offset="0.85" stopColor="#8b93a0" />
          <stop offset="1" stopColor="#3f4652" />
        </linearGradient>
        <linearGradient id={ids.silverV} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.35" stopColor="#d4d9e0" />
          <stop offset="0.75" stopColor="#8b93a0" />
          <stop offset="1" stopColor="#5b6370" />
        </linearGradient>
        <linearGradient id={ids.plate} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6dc94" />
          <stop offset="0.5" stopColor="#d9a441" />
          <stop offset="1" stopColor="#a8741c" />
        </linearGradient>
        <linearGradient id={ids.plinth} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#262a31" />
          <stop offset="1" stopColor="#0a0b0e" />
        </linearGradient>
        <linearGradient id={ids.liquid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe9a8" />
          <stop offset="0.1" stopColor="#f3c55c" />
          <stop offset="0.55" stopColor="#d8962a" />
          <stop offset="1" stopColor="#8f5a0e" />
        </linearGradient>
        <linearGradient id={ids.liquidBack} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c8922a" />
          <stop offset="1" stopColor="#6e4508" />
        </linearGradient>
        <linearGradient id={ids.sheen} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.32" stopColor="#fff" stopOpacity="0.3" />
          <stop offset="0.44" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.8" stopColor="#3a2606" stopOpacity="0.18" />
        </linearGradient>
        <linearGradient id={ids.glass} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.18" />
          <stop offset="0.35" stopColor="#ffffff" stopOpacity="0.04" />
          <stop offset="0.7" stopColor="#ffffff" stopOpacity="0.03" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.14" />
        </linearGradient>
        <linearGradient id={ids.mouth} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.55" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={ids.halo} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#f5e7c0" stopOpacity="0.3" />
          <stop offset="0.55" stopColor="#e2e8f0" stopOpacity="0.07" />
          <stop offset="1" stopColor="#e2e8f0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={ids.shine} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.6" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={ids.clip}>
          <path d={CUP} />
        </clipPath>
        <filter id={ids.glow} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#e9edf3" floodOpacity="0.3" />
        </filter>
      </defs>

      {!minimal && <ellipse cx="100" cy="100" rx="100" ry="104" fill={url('halo')} />}

      <g filter={minimal ? undefined : url('glow')}>
        {/* Slender handles: curl over the rim, loop down the sides */}
        {[undefined, MIRROR].map((t, i) => (
          <g key={i} transform={t}>
            <path d={HANDLE_LEFT} fill="none" stroke="#3f4652" strokeWidth="7" strokeLinecap="round" />
            <path d={HANDLE_LEFT} fill="none" stroke={url('silverV')} strokeWidth="5.2" strokeLinecap="round" />
            <path d={HANDLE_LEFT} fill="none" stroke="#ffffff" strokeOpacity={i === 0 ? 0.65 : 0.3} strokeWidth="1.3" strokeLinecap="round" />
          </g>
        ))}

        {/* Glass bowl with a shadowed mouth for depth */}
        <path d={CUP} fill={url('glass')} />
        <path d="M48 46 H152 V64 C124 56 76 56 48 64 Z" fill={url('mouth')} clipPath={`url(#${ids.clip})`} />

        {/* Liquid gold */}
        <g clipPath={`url(#${ids.clip})`}>
          <motion.g
            initial={{ y: levelFor(fromPercent) }}
            animate={{ y: levelFor(percent) }}
            transition={{ duration: 2.2, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {percent > 0 && (
              <>
                <path d={waveFill(3.5)} fill={url('liquidBack')} transform="translate(0 -2)">
                  <animateTransform attributeName="transform" type="translate" values={`0 -2;${WAVELENGTH} -2`} dur="2.8s" repeatCount="indefinite" />
                </path>
                <g>
                  <animateTransform attributeName="transform" type="translate" values={`0 0;${-WAVELENGTH} 0`} dur="2s" repeatCount="indefinite" />
                  <path d={waveFill(2.6)} fill={url('liquid')} />
                  <path d={waveLine(2.6)} fill="none" stroke="#fffbe6" strokeOpacity="0.9" strokeWidth="1.2" />
                </g>
                <rect x="48" y="2" width="104" height="200" fill={url('sheen')} />
                {BUBBLES.map(b => (
                  <circle key={b.x} cx={b.x} r={b.r} fill="#fff8dc" opacity="0">
                    <animate attributeName="cy" values="124;6" dur={`${b.dur}s`} begin={`${b.delay}s`} repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0;0.85;0" dur={`${b.dur}s`} begin={`${b.delay}s`} repeatCount="indefinite" />
                  </circle>
                ))}
              </>
            )}
          </motion.g>

          {/* Etched star, visible over glass and gold alike */}
          <path d={STAR} fill="#ffffff" fillOpacity="0.05" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="0.9" strokeLinejoin="round" />

          {/* Periodic light sweep across the glass */}
          {!minimal && (
            <rect x="-50" y="40" width="28" height="150" fill={url('shine')} transform="skewX(-14)">
              <animate attributeName="x" values="-40;-40;200" keyTimes="0;0.6;1" dur="4s" repeatCount="indefinite" />
            </rect>
          )}
        </g>

        {/* Silver edge and reflections over the glass */}
        <path d={CUP} fill="none" stroke={url('silver')} strokeWidth="2.8" />
        <path d="M60 74 C57 108 68 146 87 171" fill="none" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="3.4" strokeLinecap="round" />
        <path d="M141 76 C143 100 137 124 128 144" fill="none" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="2" strokeLinecap="round" />

        {/* Collar and rim */}
        <path d={NECK} fill={url('silver')} />
        <path d="M74 47.5 C90 50.5 110 50.5 126 47.5" fill="none" stroke="#3f4652" strokeOpacity="0.6" strokeWidth="1.2" />
        <ellipse cx="100" cy="34" rx="30" ry="4.6" fill="#2a2f37" />
        <ellipse cx="100" cy="34" rx="30" ry="4.6" fill="none" stroke={url('silver')} strokeWidth="2.4" />
        <path d="M73 37 C88 40 112 40 127 37" fill="none" stroke="#ffffff" strokeOpacity="0.85" strokeWidth="1" strokeLinecap="round" />

        {/* Short stem and flared foot */}
        <path d={STEM} fill={url('silver')} />
        <ellipse cx="100" cy="181" rx="10" ry="2.6" fill={url('silver')} />
        <path d={FOOT} fill={url('silver')} />
        <ellipse cx="100" cy="194" rx="12.5" ry="2.4" fill={url('silver')} />
        <path d="M66 209.5 H134" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="0.8" />

        {/* Plinth with nameplate */}
        <rect x="58" y="210" width="84" height="26" rx="4" fill={url('plinth')} />
        <rect x="58" y="210" width="84" height="26" rx="4" fill="none" stroke="#9aa3af" strokeOpacity="0.5" strokeWidth="1.1" />
        <rect x="76" y="217" width="48" height="12" rx="2.5" fill={url('plate')} />
        <rect x="76" y="217" width="48" height="12" rx="2.5" fill="none" stroke="#fff3c4" strokeOpacity="0.6" strokeWidth="0.8" />
        <text
          x="100" y="223.4" textAnchor="middle" dominantBaseline="middle" fill="#4a3008"
          style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 6.2, fontWeight: 700, letterSpacing: 1.4 }}
        >
          {plaque.toUpperCase()}
        </text>
      </g>

      {!minimal && SPARKLES.map(s => <Sparkle key={`${s.x}-${s.y}`} {...s} />)}

      {showLabel && (
        <text
          x="100" y="84" textAnchor="middle" dominantBaseline="middle"
          fill="#ffffff" stroke="#2a2f37" strokeOpacity="0.65" strokeWidth="3" paintOrder="stroke"
          style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}
        >
          {shown}
          <tspan dx="1" dy="-8" style={{ fontSize: 13 }}>%</tspan>
        </text>
      )}
    </svg>
  );
}
