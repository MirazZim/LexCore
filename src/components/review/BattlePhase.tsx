import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence, animate, useReducedMotion } from 'framer-motion';
import { RotateCcw, Zap, Check, Sparkles, Flame, Target, Dices } from 'lucide-react';
import { Rating, State, type Card, type Grade } from 'ts-fsrs';
import type { DueWordItem } from './types';
import type { Word } from '@/lib/types';
import { createPreviewScheduler, dbStateToCard } from '@/lib/fsrs';
import { useUserPreferences } from '@/hooks/useWords';
import { HERO, HERO_EDGE, HERO_GREEN, SURFACE, ink } from './twoTone';

const ratingConfig = [
  { rating: Rating.Again, label: 'Again', Icon: RotateCcw, color: '#ef4444' },
  { rating: Rating.Hard,  label: 'Hard',  Icon: Zap,       color: '#f97316' },
  { rating: Rating.Good,  label: 'Good',  Icon: Check,     color: '#a78bfa' },
  { rating: Rating.Easy,  label: 'Easy',  Icon: Sparkles,  color: '#00FFC8' },
];

const MC_STYLES = [
  { label: 'A', accent: '#a78bfa' },
  { label: 'B', accent: '#6ee7b7' },
  { label: 'C', accent: '#fbbf24' },
];

const WIN_PHRASES  = ['Flawless.', 'Sharp.', 'Locked in.', 'You own this.', 'Crisp.', 'Perfect.'];
const LOSS_PHRASES = ['Not this time.', 'Study it deeper.', 'Almost.', 'It happens.', 'Keep going.'];

const MINT = '#00FFC8';
const RED = '#ef4444';
const ORANGE = '#f97316';
const VIOLET = '#a78bfa';
const DISPLAY_FONT = "'Bricolage Grotesque', 'Space Grotesk', sans-serif";
const DAY = 86_400_000;

interface BattlePhaseProps {
  currentItem: DueWordItem;
  currentIndex: number;
  onRate: (rating: Rating, confidence: 'sure' | 'unsure' | null) => void;
  allWords: Word[];
  streak: number;
}

type BattleStep = 'recall' | 'confidence' | 'quiz' | 'quiz-result';

const TURNS: { step: BattleStep; label: string }[] = [
  { step: 'recall', label: 'Recall' },
  { step: 'confidence', label: 'Wager' },
  { step: 'quiz', label: 'Prove it' },
];

// ── Formatting ────────────────────────────────────────────────────

function fmtSpan(ms: number): string {
  const min = ms / 60_000;
  if (min < 60) return `${Math.max(1, Math.round(min))}m`;
  const h = min / 60;
  if (h < 24) return `${Math.round(h)}h`;
  const d = h / 24;
  if (d < 30) return `${Math.round(d)}d`;
  if (d < 365) return `${Math.round(d / 30)}mo`;
  return `${(d / 365).toFixed(1)}y`;
}

function fmtDays(days: number): string {
  return fmtSpan(days * DAY);
}

const pct = (r: number) => Math.round(r * 100);

/** Where the word sits in its learning life, straight from FSRS state. */
function stageOf(state: number, lapses: number): { label: string; color: string } {
  if (lapses >= 4) return { label: 'Leech', color: '#fb7185' };
  if (state === State.New) return { label: 'New', color: '#a1a1aa' };
  if (state === State.Learning) return { label: 'Learning', color: '#fbbf24' };
  if (state === State.Relearning) return { label: 'Relearning', color: ORANGE };
  return { label: 'In review', color: VIOLET };
}

// ── Count-up number ───────────────────────────────────────────────

function CountUp({ value, delay = 0 }: { value: number; delay?: number }) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    const c = animate(shown, value, { duration: 0.9, delay, ease: 'easeOut', onUpdate: v => setShown(v) });
    return () => c.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, delay]);
  return <>{Math.round(shown)}</>;
}

// ── Memory duel ───────────────────────────────────────────────────
// The word's knight vs. Forgetting, on a road that is a real timeline: the
// knight stands at "now", and the ghost stands at the moment the word is due
// (log scale, so minutes and months both fit). The knight's HP is the real
// recall chance. Answering plays out the fight, then the ghost walks off to
// the newly scheduled review.

function useBoxSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 600, h: 88 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

const TEN_MIN = 600_000;
/** 0 = now, 1 = three months or more away, log scale from ten minutes. */
const reach = (ms: number) => Math.min(1, Math.log1p(Math.max(0, ms) / TEN_MIN) / Math.log1p((90 * DAY) / TEN_MIN));
const ROAD_TICKS = [
  { ms: 0, label: 'now' },
  { ms: 3_600_000, label: '1h' },
  { ms: DAY, label: '1d' },
  { ms: 7 * DAY, label: '1w' },
  { ms: 30 * DAY, label: '1mo' },
  { ms: 90 * DAY, label: '3mo+' },
];

const GHOST_BODY = 'M -14 0 L -14 -18 A 14 14 0 0 1 14 -18 L 14 0 L 9.3 -5 L 4.7 0 L 0 -5 L -4.7 0 L -9.3 -5 Z';
const STARS = Array.from({ length: 18 }, (_, i) => ({ x: ((i * 37 + 11) % 100) / 100, y: ((i * 53 + 7) % 45) / 100, d: (i % 5) * 0.6 }));

function MemoryDuel({ rNow, retention, dueIn, dueAfter, outcome, accent }: {
  rNow: number | null;
  retention: number;
  dueIn: number;
  dueAfter: number | null;
  outcome: 'idle' | 'win' | 'loss';
  accent: string;
}) {
  const reduce = useReducedMotion();
  const [boxRef, { w, h }] = useBoxSize<HTMLDivElement>();
  const ground = h - 20;
  // Lines the knight up with the panel's text padding, clear of the rounded corner
  const heroX = 52;
  const roadEnd = w - 24;
  const roadX = (ms: number) => heroX + (roadEnd - heroX) * reach(ms);
  // Never let the ghost stand inside the knight
  const ghostAt = (ms: number) => Math.max(heroX + 46, roadX(ms));
  const g0 = ghostAt(dueIn);
  const g1 = dueAfter !== null ? ghostAt(dueAfter) : g0;
  const fresh = rNow === null;
  const hp = outcome === 'idle' ? rNow ?? 0 : 1;
  const hpColor = outcome !== 'idle' ? accent : fresh ? '#52525b' : hp >= retention ? MINT : hp >= 0.8 ? '#fbbf24' : RED;
  const t = (s: number) => (reduce ? 0 : s);

  const ghostAnim =
    outcome === 'win' ? { x: [g0, g0, g0 + 26, g1], opacity: [1, 1, 0, 0.85] }
    : outcome === 'loss' ? { x: [g0, heroX + 30, heroX + 30, g1], opacity: [1, 1, 1, 1] }
    : { x: g0, opacity: 1 };
  const ghostTransition = outcome === 'idle'
    ? { type: 'spring' as const, stiffness: 120, damping: 18 }
    : { duration: t(outcome === 'win' ? 1.9 : 1.7), times: outcome === 'win' ? [0, 0.4, 0.55, 1] : [0, 0.28, 0.45, 1], ease: 'easeInOut' as const };

  const dash = Math.max(0, g0 - heroX - 34);
  const heroAnim =
    outcome === 'win' ? { x: [0, 0, dash, dash, 0], rotate: 0 }
    : outcome === 'loss' ? { x: [0, 0, -8, -8, 0], rotate: [0, 0, -16, -16, 0] }
    : { x: 0, rotate: 0 };
  const heroTransition = outcome === 'win'
    ? { duration: t(1.2), times: [0, 0.15, 0.35, 0.55, 1] }
    : { duration: t(1.5), times: [0, 0.28, 0.33, 0.6, 1] };

  const after = outcome !== 'idle' && dueAfter !== null;
  const when = after ? `in ~${fmtSpan(dueAfter!)}` : fresh ? 'first meeting' : dueIn <= 0 ? 'here now' : `in ${fmtSpan(dueIn)}`;
  // Tag rides beside the ghost (right side, or left near the edge) so it never
  // lands on the knight's HP bar.
  const ghostFinal = after ? g1 : g0;
  const tagLeft = ghostFinal > w - 100;
  const tagX = ghostFinal + (tagLeft ? -22 : 22);
  const tagAnchor = tagLeft ? 'end' : 'start';

  // Distant hills, one smooth silhouette across the whole width
  const hills = `M 0 ${ground} L 0 ${ground - 14} Q ${w * 0.12} ${ground - 30} ${w * 0.25} ${ground - 16} T ${w * 0.5} ${ground - 18} T ${w * 0.75} ${ground - 14} T ${w} ${ground - 22} L ${w} ${ground} Z`;
  const castleX = w * 0.82;

  return (
    <div ref={boxRef} className="w-full h-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full overflow-visible">
        <defs>
          <radialGradient id="duel-ghost-glow">
            <stop offset="0" stopColor="#8b5cf6" stopOpacity="0.5" />
            <stop offset="1" stopColor="#8b5cf6" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="duel-moon-glow">
            <stop offset="0" stopColor="#e9d5ff" stopOpacity="0.25" />
            <stop offset="1" stopColor="#e9d5ff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="duel-road" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={MINT} stopOpacity="0.55" />
            <stop offset="1" stopColor={VIOLET} stopOpacity="0.25" />
          </linearGradient>
        </defs>

        {/* Night sky */}
        {STARS.map((s, i) => (
          <motion.circle
            key={i} cx={s.x * w} cy={4 + s.y * (ground - 24)} r={i % 4 ? 0.8 : 1.2} fill="#fff"
            animate={reduce ? undefined : { opacity: [0.1, 0.5, 0.1] }}
            transition={{ duration: 3, repeat: Infinity, delay: s.d }}
            opacity={0.25}
          />
        ))}
        <mask id="duel-moon-cut">
          <circle cx={w * 0.6} cy={16} r="8" fill="#fff" />
          <circle cx={w * 0.6 + 4} cy={13} r="7" fill="#000" />
        </mask>
        <circle cx={w * 0.6} cy={16} r="22" fill="url(#duel-moon-glow)" />
        <circle cx={w * 0.6} cy={16} r="8" fill="#ecfdf5" opacity="0.75" mask="url(#duel-moon-cut)" />

        {/* Hills + far castle */}
        <path d={hills} fill="rgba(0,0,0,0.2)" />
        <g transform={`translate(${castleX} ${ground - 17})`} fill="rgba(0,0,0,0.3)">
          <rect x={-14} y={-14} width="28" height="14" />
          <rect x={-18} y={-22} width="8" height="22" />
          <rect x={10} y={-22} width="8" height="22" />
          <path d="M -18 -22 h 2 v -3 h 2 v 3 h 2 v -3 h 2 v 3 M 10 -22 h 2 v -3 h 2 v 3 h 2 v -3 h 2 v 3" />
          <rect x={-2} y={-7} width="4" height="7" fill="#fbbf24" opacity="0.35" />
        </g>

        {/* The road = a timeline */}
        <rect x={0} y={ground} width={w} height={h - ground} fill="rgba(0,0,0,0.3)" />
        <line x1={heroX} x2={roadEnd} y1={ground + 0.5} y2={ground + 0.5} stroke="url(#duel-road)" strokeWidth="1.5" />
        {ROAD_TICKS.map(tk => {
          const tx = roadX(tk.ms);
          return (
            <g key={tk.label}>
              <line x1={tx} x2={tx} y1={ground} y2={ground + 4} stroke="rgba(255,255,255,0.25)" />
              <text x={tx} y={ground + 14} textAnchor="middle" fontSize="8.5" fontWeight="600" fill="rgba(255,255,255,0.32)">
                {tk.label}
              </text>
            </g>
          );
        })}

        {/* Forgetting */}
        <motion.g initial={{ x: g0, opacity: 1 }} animate={ghostAnim} transition={ghostTransition}>
          <ellipse cx={0} cy={ground} rx="11" ry="2.5" fill="#000" opacity="0.5" />
          <motion.g
            animate={reduce ? undefined : { y: [0, -4, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <g transform={`translate(0 ${ground - 8})`}>
              <circle cx={0} cy={-16} r="26" fill="url(#duel-ghost-glow)" />
              <path d={GHOST_BODY} fill="#2a2440" stroke="#a78bfa" strokeWidth="1.5" strokeLinejoin="round" />
              <motion.g
                animate={reduce ? undefined : { scaleY: [1, 1, 0.1, 1] }}
                transition={{ duration: 3.4, repeat: Infinity, times: [0, 0.9, 0.95, 1] }}
                style={{ originX: 0.5, originY: 0.5, transformBox: 'fill-box' }}
              >
                <ellipse cx={-5} cy={-19} rx="2.2" ry="3" fill="#fb7185" />
                <ellipse cx={5} cy={-19} rx="2.2" ry="3" fill="#fb7185" />
              </motion.g>
              <path d="M -4 -11 Q 0 -13.5 4 -11" fill="none" stroke="#fb7185" strokeWidth="1.3" strokeLinecap="round" />
            </g>
          </motion.g>
        </motion.g>

        {/* Ghost's tag: who it is, and when it arrives */}
        <motion.g
          key={when}
          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: after ? t(1.8) : 0.3 }}
        >
          <text x={tagX} y={ground - 32} textAnchor={tagAnchor} fontSize="7.5" fontWeight="700" letterSpacing="0.14em" fill="rgba(196,181,253,0.55)">
            FORGETTING
          </text>
          <text x={tagX} y={ground - 19} textAnchor={tagAnchor} fontSize="11" fontWeight="800" fill={after ? accent : '#e4e4e7'}>
            {when}
          </text>
        </motion.g>

        {/* Win: slash + poof where the ghost stood */}
        {outcome === 'win' && !reduce && (
          <g transform={`translate(${g0} ${ground - 8})`}>
            <motion.path
              d="M -16 -36 Q 12 -24 -4 0" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: [0, 1, 1], opacity: [0, 1, 0] }}
              transition={{ delay: 0.42, duration: 0.35 }}
            />
            {Array.from({ length: 7 }, (_, i) => {
              const a = (i / 7) * Math.PI * 2;
              return (
                <motion.circle
                  key={i} cx={0} cy={-16} r="2.5" fill="#c4b5fd"
                  initial={{ x: 0, y: 0, opacity: 0 }}
                  animate={{ x: Math.cos(a) * 22, y: Math.sin(a) * 18, opacity: [0, 1, 0] }}
                  transition={{ delay: 0.62, duration: 0.55, ease: 'easeOut' }}
                />
              );
            })}
          </g>
        )}

        {/* The knight */}
        <g transform={`translate(${heroX} ${ground})`}>
          <ellipse cx={0} cy={0} rx="13" ry="3" fill="#000" opacity="0.5" />

          {/* After any review: a ward of light rises behind the knight */}
          {outcome !== 'idle' && (
            <motion.path
              d="M -22 0 A 22 26 0 0 1 22 0" fill={tint(accent, '1a')} stroke={accent} strokeWidth="1.5" strokeOpacity="0.8"
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: t(1.35), duration: 0.5, ease: 'backOut' }}
              style={{ originX: 0.5, originY: 1, transformBox: 'fill-box' }}
            />
          )}

          <motion.g animate={heroAnim} transition={heroTransition} style={{ originX: 0.5, originY: 1, transformBox: 'fill-box' }}>
            <motion.g
              animate={reduce ? undefined : { y: [0, -1.2, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <rect x={-7} y={-11} width="5" height="11" rx="1.5" fill="#3f3f46" />
              <rect x={2} y={-11} width="5" height="11" rx="1.5" fill="#3f3f46" />
              <rect x={-10} y={-29} width="20" height="19" rx="6" fill={VIOLET} />
              <rect x={-10} y={-15} width="20" height="3" fill="#6d28d9" />
              <circle cx={0} cy={-37} r="9" fill="#d4d4d8" />
              <rect x={-6} y={-39} width="12" height="3.5" rx="1.5" fill="#18181b" />
              <rect x={1} y={-38.5} width="3" height="1.5" rx="0.75" fill={MINT} />
              <path d="M -2 -45 Q 4 -54 12 -50 Q 6 -47 3 -45 Z" fill={MINT} />
              <path d="M -18 -27 h 11 v 8 q 0 7 -5.5 9.5 q -5.5 -2.5 -5.5 -9.5 Z" fill="#27272a" stroke={MINT} strokeWidth="1.5" />
              <motion.g
                animate={outcome === 'win' && !reduce ? { rotate: [0, 0, -50, 110, 110, 0] } : { rotate: 0 }}
                transition={{ duration: t(1.2), times: [0, 0.2, 0.3, 0.42, 0.6, 1] }}
                style={{ originX: 0.5, originY: 0.82, transformBox: 'fill-box' }}
              >
                <rect x={9.75} y={-44} width="3.5" height="24" rx="1" fill="#e4e4e7" />
                <rect x={7} y={-21} width="9" height="2.5" rx="1" fill="#fbbf24" />
                <rect x={10.25} y={-18.5} width="2.5" height="5" fill="#78350f" />
              </motion.g>
            </motion.g>
          </motion.g>

          {/* Loss: the hit */}
          {outcome === 'loss' && !reduce && (
            <motion.circle
              cx={0} cy={-26} fill="none" stroke={RED} strokeWidth="2.5"
              initial={{ r: 4, opacity: 0 }}
              animate={{ r: [4, 26], opacity: [0.9, 0] }}
              transition={{ delay: 0.48, duration: 0.5 }}
            />
          )}

          {/* HP = recall chance now */}
          <g transform="translate(-16 -62)">
            <rect width="32" height="4" rx="2" fill="rgba(255,255,255,0.1)" />
            <motion.rect
              height="4" rx="2" fill={hpColor}
              initial={{ width: 32 * (rNow ?? 0) }}
              animate={{ width: 32 * hp }}
              transition={{ delay: outcome === 'idle' ? 0 : t(1.1), duration: t(0.6), ease: 'easeOut' }}
            />
          </g>
        </g>
      </svg>
    </div>
  );
}

// ── Small pieces ──────────────────────────────────────────────────

// ── Card kit ──────────────────────────────────────────────────────
// Dark tiles; colour lives in small accents (icon badge, number, hover edge)
// so four options read as a set instead of four competing blocks.

/** `color` (6-digit hex) at a low alpha, for tinted badges and fills. */
const tint = (color: string, alpha = '1f') => `${color}${alpha}`;

// Two-tone layout (see twoTone.ts): memory on the green hero, your turn on the
// light surface.

// Cards on the light surface are tinted with their own colour (not plain
// white) and carry dark text, so every option is easy to read and tell apart.
const SOFT: Record<string, { soft: string; edge: string }> = {
  [RED]: { soft: '#fef0f0', edge: '#fbc8c8' },
  [ORANGE]: { soft: '#fff3ea', edge: '#fcd0ae' },
  [VIOLET]: { soft: '#f3efff', edge: '#d9ccfd' },
  [MINT]: { soft: '#e9fbf5', edge: '#a7ecd6' },
  '#6ee7b7': { soft: '#e6faf6', edge: '#9fe5d7' },
  '#fbbf24': { soft: '#fff6e0', edge: '#fbdc8f' },
};
const NEUTRAL = { soft: '#f4f4f5', edge: '#e4e4e7' };

/** Tinted card style for accent `color` (a neon key of SOFT). */
function softCard(color: string): React.CSSProperties {
  const { soft, edge } = SOFT[color] ?? NEUTRAL;
  return { backgroundColor: soft, border: `1.5px solid ${edge}` };
}

/** Hover / press for a tinted card: lift and darken the border to the accent. */
function cardMotion(color: string) {
  return {
    whileHover: { y: -2, borderColor: ink(color) },
    whileTap: { scale: 0.985 },
  };
}

/** Solid accent disc holding a white icon or letter. */
function Disc({ color, children, size = 'w-7 h-7' }: { color: string; children: React.ReactNode; size?: string }) {
  return (
    <span className={`shrink-0 flex items-center justify-center rounded-full text-white text-xs font-bold ${size}`} style={{ background: ink(color) }}>
      {children}
    </span>
  );
}

/** `solid` = white text on the colour (for the light surface); otherwise a tinted pill (for the green hero). */
function Badge({ color, children, className = '', solid = false }: { color: string; children: React.ReactNode; className?: string; solid?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold ${className}`}
      style={solid ? { color: '#fff', background: color } : { color, background: tint(color, '2e') }}
    >
      {children}
    </span>
  );
}

function Keycap({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="hidden lg:inline-flex items-center justify-center w-[18px] h-[18px] rounded-md text-[10px] font-semibold text-zinc-500 bg-zinc-100 border border-zinc-200"
    >
      {children}
    </span>
  );
}

/** `short` replaces the label on phones, where four chips share one row. */
function StatChip({ label, short, value, tone }: { label: string; short?: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0 rounded-xl px-2.5 py-1 bg-black/20">
      <p className="text-[9px] uppercase tracking-wider font-semibold text-emerald-100/80 truncate">
        <span className="hidden sm:inline">{label}</span>
        <span className="sm:hidden">{short ?? label}</span>
      </p>
      <p className="text-sm font-bold leading-tight" style={{ color: tone ?? '#f4f4f5', fontFamily: DISPLAY_FONT }}>{value}</p>
    </div>
  );
}

function StepHeading({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-3">
      <h3 className="text-lg font-bold text-zinc-900 leading-tight" style={{ fontFamily: DISPLAY_FONT }}>{title}</h3>
      <p className="text-[13px] text-zinc-600 mt-0.5">{sub}</p>
    </div>
  );
}

const stepMotion = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.24 },
};

// ── Main component ────────────────────────────────────────────────

export function BattlePhase({ currentItem, currentIndex, onRate, allWords, streak }: BattlePhaseProps) {
  const [step, setStep] = useState<BattleStep>('recall');
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [bufferedRating, setBufferedRating] = useState<Rating | null>(null);
  const [confidence, setConfidence] = useState<'sure' | 'unsure' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const reduceMotion = useReducedMotion();

  // Pick phrases once per card mount so they don't flicker
  const [winPhrase]  = useState(() => WIN_PHRASES[Math.floor(Math.random()  * WIN_PHRASES.length)]);
  const [lossPhrase] = useState(() => LOSS_PHRASES[Math.floor(Math.random() * LOSS_PHRASES.length)]);

  // ── Real scheduling data ──
  const { data: prefs } = useUserPreferences();
  const retention = prefs?.request_retention ?? 0.9;
  const maxInterval = prefs?.maximum_interval ?? 365;
  const sched = useMemo(
    () => createPreviewScheduler({ request_retention: retention, maximum_interval: maxInterval }),
    [retention, maxInterval],
  );
  const [now] = useState(() => new Date());
  const { stats } = currentItem;
  const cardBefore = useMemo(() => dbStateToCard(stats), [stats]);
  // What each rating would do to this card right now
  const preview = useMemo(() => {
    const out = {} as Record<Grade, Card>;
    for (const { rating } of ratingConfig) out[rating as Grade] = sched.next(cardBefore, now, rating as Grade).card;
    return out;
  }, [sched, cardBefore, now]);
  const rNow = cardBefore.last_review && stats.state !== State.New
    ? sched.forgetting_curve((now.getTime() - new Date(cardBefore.last_review).getTime()) / DAY, cardBefore.stability)
    : null;

  const isCorrect = selectedAnswer === currentItem.word.definition;
  const answered = step === 'quiz-result';
  const overconfident = !isCorrect && (bufferedRating === Rating.Good || bufferedRating === Rating.Easy);
  const finalRating = overconfident ? Rating.Hard : bufferedRating;
  const cardAfter = answered && finalRating ? preview[finalRating as Grade] : null;
  const stage = stageOf(stats.state, stats.lapses);
  const attempts = stats.times_correct + stats.times_incorrect;

  const choices = useMemo(() => {
    const correctDef = currentItem.word.definition;
    const otherDefs = allWords
      .filter(w => w.id !== currentItem.word.id && w.definition !== correctDef)
      .map(w => w.definition);
    const wrong = otherDefs.sort(() => Math.random() - 0.5).slice(0, 2);
    while (wrong.length < 2) wrong.push('No alternative definition available.');
    return [correctDef, ...wrong].sort(() => Math.random() - 0.5);
  }, [currentItem.word.id]);

  const handleRate = (rating: Rating) => {
    setBufferedRating(rating);
    setStep('confidence');
  };

  const handleConfidence = (c: 'sure' | 'unsure') => {
    setConfidence(c);
    setStep('quiz');
  };

  // Let the played card rise before the result replaces the hand.
  const handleSelect = (answer: string) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(answer);
    setTimeout(() => setStep('quiz-result'), reduceMotion ? 0 : 450);
  };

  const handleContinue = () => {
    // onRate advances the phase synchronously (no network wait — the save
    // happens in the background), so this only guards against a double-tap
    // firing before the component unmounts into the next phase.
    if (isSubmitting) return;
    setIsSubmitting(true);
    onRate(finalRating!, confidence);
  };

  // Keyboard play: 1–4 recall, 1/2 wager, A–C (or 1–3) answer, Enter to continue.
  // Re-bound every render so the handlers always see the current step.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const n = Number(e.key) - 1;
      if (step === 'recall' && n >= 0 && n < ratingConfig.length) handleRate(ratingConfig[n].rating);
      else if (step === 'confidence' && (e.key === '1' || e.key === '2')) handleConfidence(e.key === '1' ? 'sure' : 'unsure');
      else if (step === 'quiz') {
        const letter = 'abc'.indexOf(e.key.toLowerCase());
        const i = letter >= 0 ? letter : n;
        if (i >= 0 && i < choices.length) handleSelect(choices[i]);
      } else if (step === 'quiz-result' && e.key === 'Enter') {
        e.preventDefault();
        handleContinue();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const activeTurn = answered ? 3 : TURNS.findIndex(t => t.step === step);
  const goodReview = finalRating === Rating.Good || finalRating === Rating.Easy;
  const accent = goodReview ? MINT : ORANGE;

  return (
    <motion.div
      key={`battle-${currentIndex}`}
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="mt-2 flex flex-col gap-3"
      style={{ fontFamily: DISPLAY_FONT }}
    >
      {/* ── Memory strip: the word and its real forgetting curve ─────── */}
      <div
        className="rounded-[1.75rem] overflow-hidden px-4 lg:px-5 pt-3 pb-3"
        style={{
          ...HERO,
          borderColor: answered ? tint(isCorrect ? MINT : RED, '80') : HERO_EDGE,
          transition: 'border-color 0.45s ease',
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <Badge color={stage.color} className="text-[9px] uppercase tracking-[0.18em]">{stage.label}</Badge>
          {streak > 0 && (
            <Badge color="#fb923c" className="text-xs">
              <Flame className="h-3.5 w-3.5" strokeWidth={2.4} />
              {streak} day streak
            </Badge>
          )}
        </div>

        {/* Word on the left, recall chance (the real headline number) on the right */}
        <div className="mt-2 flex items-end justify-between gap-4">
          <motion.h2
            initial={{ opacity: 0, y: 6, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ type: 'spring', stiffness: 180, damping: 18, delay: 0.05 }}
            className="min-w-0 font-black leading-none truncate"
            style={{ fontSize: 'clamp(1.6rem, 3.6vw, 2.1rem)', color: '#fff', fontFamily: DISPLAY_FONT, letterSpacing: '-0.02em' }}
          >
            {currentItem.word.word}
          </motion.h2>
          <div className="shrink-0 text-right">
            <p className="text-[9px] uppercase tracking-widest text-emerald-100/80 font-bold">
              {answered ? 'Recall after review' : 'Recall chance now'}
            </p>
            <div className="mt-1 flex items-center justify-end gap-2">
              <AnimatePresence>
                {answered && rNow !== null && pct(rNow) < 100 && (
                  <motion.span
                    initial={{ opacity: 0, x: 8, scale: 0.6 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 16, delay: 0.5 }}
                    className="text-[11px] font-bold px-1.5 py-0.5 rounded-md"
                    style={{ color: accent, background: tint(accent) }}
                  >
                    +{100 - pct(rNow)}%
                  </motion.span>
                )}
              </AnimatePresence>
              <p className="font-black leading-none tabular-nums text-2xl" style={{ fontFamily: DISPLAY_FONT, color: answered ? accent : '#fff' }}>
                {rNow === null && !answered ? '—' : <><CountUp value={answered ? 100 : pct(rNow ?? 0)} delay={answered ? 0.25 : 0} />%</>}
              </p>
            </div>
          </div>
        </div>
        {rNow === null && !answered && (
          <p className="mt-1 text-[11px] text-emerald-100/80">First time — no memory to measure yet.</p>
        )}

        {/* The duel */}
        <div className="mt-1 h-[88px] -mx-4 lg:-mx-5">
          <MemoryDuel
            rNow={rNow}
            retention={retention}
            dueIn={cardBefore.due.getTime() - now.getTime()}
            dueAfter={cardAfter ? cardAfter.due.getTime() - now.getTime() : null}
            outcome={answered ? (isCorrect ? 'win' : 'loss') : 'idle'}
            accent={accent}
          />
        </div>

        {/* Track record */}
        <div className="mt-2 grid grid-cols-4 gap-2">
          <StatChip label="Reviews" value={`${stats.repetitions}`} />
          <StatChip
            label="Accuracy"
            short="Right"
            value={attempts ? `${pct(stats.times_correct / attempts)}%` : '—'}
            tone={attempts ? (stats.times_correct / attempts >= 0.8 ? MINT : stats.times_correct / attempts >= 0.5 ? '#fbbf24' : '#fb7185') : undefined}
          />
          <StatChip label="Forgotten" short="Forgot" value={`${stats.lapses}×`} tone={stats.lapses >= 3 ? '#fb7185' : undefined} />
          <StatChip label="Holds ≥90%" short="Holds" value={stats.state === State.New ? '—' : fmtDays(cardBefore.stability)} />
        </div>
      </div>

      {/* ── Turn panel ──────────────────────────────────────────────── */}
      <div className="rounded-[1.75rem] overflow-hidden flex flex-col" style={SURFACE}>
        <div className="flex items-center gap-1.5 px-4 lg:px-5 pt-4">
          {TURNS.map((t, i) => {
            const done = i < activeTurn;
            const active = i === activeTurn;
            return (
              <div key={t.step} className="flex-1 min-w-0">
                <div className="h-1.5 rounded-full overflow-hidden bg-zinc-200">
                  <motion.div
                    className="h-full rounded-full"
                    initial={false}
                    animate={{ width: done || active ? '100%' : '0%' }}
                    transition={{ duration: 0.35 }}
                    style={{ background: active ? ink(MINT) : tint(ink(MINT), '66') }}
                  />
                </div>
                <p className="mt-1.5 text-[9px] uppercase tracking-[0.18em] font-bold" style={{ color: active ? ink(MINT) : done ? tint(ink(MINT), 'b3') : '#71717a' }}>
                  {i + 1} · {t.label}
                </p>
              </div>
            );
          })}
        </div>

        <div className="flex-1 px-4 lg:px-5 pt-4 pb-5 flex flex-col">
          <AnimatePresence mode="wait">

            {/* Turn 1 · Recall ─────────────────────────────────────── */}
            {step === 'recall' && (
              <motion.div key="recall" {...stepMotion}>
                <StepHeading title="How well did it come back?" sub="Each choice shows when you'd see this word next." />
                <div className="grid grid-cols-2 gap-2.5">
                  {ratingConfig.map((btn, i) => (
                      <motion.button
                        key={btn.rating}
                        onClick={() => handleRate(btn.rating)}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: 0.04 + i * 0.04 }}
                        {...cardMotion(btn.color)}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left"
                        style={softCard(btn.color)}
                      >
                        <Disc color={btn.color}><btn.Icon className="h-3.5 w-3.5" strokeWidth={2.6} /></Disc>
                        <span className="min-w-0 flex-1 text-[15px] font-semibold text-zinc-900">{btn.label}</span>
                        <span className="shrink-0 flex items-center gap-2">
                          <span className="text-[15px] font-bold tabular-nums" style={{ color: ink(btn.color) }}>
                            {fmtSpan(preview[btn.rating as Grade].due.getTime() - now.getTime())}
                          </span>
                          <Keycap>{i + 1}</Keycap>
                        </span>
                      </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Turn 2 · Wager ──────────────────────────────────────── */}
            {step === 'confidence' && (
              <motion.div key="confidence" {...stepMotion}>
                <StepHeading
                  title="Place your bet"
                  sub={bufferedRating === Rating.Good || bufferedRating === Rating.Easy
                    ? "Sure it's right? Your bet counts toward your calibration score — and a miss on Good/Easy drops this review to Hard."
                    : 'Your bet counts toward your calibration score.'}
                />
                <div className="grid grid-cols-2 gap-2.5">
                  {([
                    { c: 'sure' as const, title: 'All in', sub: 'I know it', color: MINT, Icon: Target },
                    { c: 'unsure' as const, title: 'Hedge', sub: "I'm guessing", color: VIOLET, Icon: Dices },
                  ]).map((w, i) => (
                      <motion.button
                        key={w.c}
                        onClick={() => handleConfidence(w.c)}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: 0.04 + i * 0.05 }}
                        {...cardMotion(w.color)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left"
                        style={softCard(w.color)}
                      >
                        <Disc color={w.color} size="w-8 h-8"><w.Icon className="h-4 w-4" strokeWidth={2.4} /></Disc>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[15px] font-semibold text-zinc-900 leading-tight">{w.title}</span>
                          <span className="block text-xs text-zinc-600">{w.sub}</span>
                        </span>
                        <Keycap>{i + 1}</Keycap>
                      </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Turn 3 · Prove it ───────────────────────────────────── */}
            {step === 'quiz' && (
              <motion.div key="quiz" {...stepMotion}>
                <StepHeading title="Prove it" sub="Three cards, one true meaning. Play yours." />
                {/* The card you play stays lit; the others fade back */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {choices.map((choice, i) => {
                    const cfg = MC_STYLES[i];
                    const picked = selectedAnswer === choice;
                    const dimmed = selectedAnswer !== null && !picked;
                    return (
                      <motion.button
                        key={i}
                        onClick={() => handleSelect(choice)}
                        disabled={selectedAnswer !== null}
                        initial={{ opacity: 0, y: 10 }}
                        animate={
                          picked ? { opacity: 1, y: -4, borderColor: ink(cfg.accent) }
                          : dimmed ? { opacity: 0.35, y: 0 }
                          : { opacity: 1, y: 0 }
                        }
                        transition={{ duration: 0.22, delay: selectedAnswer ? 0 : 0.04 + i * 0.06 }}
                        whileHover={selectedAnswer ? undefined : { ...cardMotion(cfg.accent).whileHover, transition: { duration: 0.15 } }}
                        whileTap={{ scale: 0.985 }}
                        className="flex sm:flex-col items-start gap-3 sm:gap-2.5 text-left w-full h-full px-3.5 py-3 sm:p-4 rounded-xl"
                        style={softCard(cfg.accent)}
                      >
                        <Disc color={cfg.accent} size="w-6 h-6">{cfg.label}</Disc>
                        <span className="text-[15px] leading-snug font-medium text-zinc-900 flex-1">{choice}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Result ──────────────────────────────────────────────── */}
            {answered && cardAfter && (
              <motion.div
                key="quiz-result"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, x: isCorrect ? 0 : [0, -8, 8, -5, 5, 0] }}
                transition={{ duration: 0.3, x: { duration: 0.45 } }}
                className="flex-1 flex flex-col"
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <Badge solid color={ink(isCorrect ? MINT : RED)} className="text-[10px] uppercase tracking-[0.18em]">
                    {isCorrect ? (confidence === 'sure' ? 'Called it' : 'Correct') : confidence === 'sure' ? 'Overconfident' : 'Missed'}
                  </Badge>
                  <h3 className="text-2xl font-bold leading-none" style={{ color: ink(isCorrect ? MINT : RED), fontFamily: DISPLAY_FONT }}>
                    {isCorrect ? winPhrase : lossPhrase}
                  </h3>
                </div>

                <div className="rounded-xl px-3.5 py-2.5" style={softCard(MINT)}>
                  <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: ink(MINT) }}>Meaning</p>
                  <p className="text-[15px] font-medium text-zinc-900 leading-snug">{currentItem.word.definition}</p>
                </div>

                {!isCorrect && (
                  <div className="rounded-xl px-3.5 py-2.5 mt-2" style={softCard(RED)}>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-red-600">Your pick</p>
                    <p className="text-[15px] font-medium text-zinc-600 line-through leading-snug">{selectedAnswer}</p>
                  </div>
                )}

                {/* What this review did — all straight from the scheduler */}
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="rounded-xl px-3.5 py-2" style={softCard(accent)}
                  >
                    <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-600">Next review</p>
                    <p className="text-lg font-bold leading-tight" style={{ color: ink(accent), fontFamily: DISPLAY_FONT }}>
                      in ~{fmtSpan(cardAfter.due.getTime() - now.getTime())}
                      <span className="ml-1.5 text-[11px] font-medium text-zinc-600">
                        {cardAfter.due.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                    </p>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                    className="rounded-xl px-3.5 py-2" style={softCard('')}
                  >
                    <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-600">Holds ≥90% for</p>
                    <p className="text-lg font-bold text-zinc-900 leading-tight" style={{ fontFamily: DISPLAY_FONT }}>
                      {fmtDays(cardAfter.stability)}
                      <span className="ml-1.5 text-[11px] font-medium text-zinc-600">
                        {stats.state === State.New ? 'first memory' : `was ${fmtDays(cardBefore.stability)}`}
                      </span>
                    </p>
                  </motion.div>
                </div>

                {overconfident && (
                  <p className="mt-2.5 text-[11px] font-bold text-orange-600">
                    You rated it {bufferedRating === Rating.Easy ? 'Easy' : 'Good'} but missed — counted as Hard.
                  </p>
                )}

                <div className="mt-auto pt-2.5">
                  <motion.button
                    onClick={handleContinue}
                    disabled={isSubmitting}
                    whileHover={{ filter: 'brightness(1.25)' }}
                    whileTap={{ scale: 0.985 }}
                    className="w-full py-3 rounded-xl text-sm font-semibold text-white"
                    style={{ background: HERO_GREEN }}
                  >
                    Continue
                    <span className="hidden lg:inline ml-2 text-[11px] font-semibold" style={{ color: MINT }}>↵ Enter</span>
                  </motion.button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
