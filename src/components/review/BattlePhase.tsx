import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence, animate, useReducedMotion } from 'framer-motion';
import { RotateCcw, Zap, Check, Sparkles, Flame, Target, Dices, Brain } from 'lucide-react';
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
  { accent: '#a78bfa' },
  { accent: '#6ee7b7' },
  { accent: '#fbbf24' },
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

const TURNS: BattleStep[] = ['recall', 'confidence', 'quiz'];

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
// (log scale, so minutes and months both fit).
//
// The fight follows your turns: the rating sets the knight's stance, the
// wager is a charged strike or a raised guard, and the answer lands the blow
// (or the ghost's). Afterwards the knight is back on their feet — a review
// always restores recall — and the ghost drifts to the newly scheduled review.

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

// Hooded wraith with a ragged hem; it faces left, toward the knight
const WRAITH_CLOAK = 'M -15 0 L -13 -7 L -16 -21 Q -14 -37 0 -39 Q 14 -37 16 -21 L 13 -7 L 15 0 L 10 -5 L 7 2 L 3 -4 L 0 3 L -3 -4 L -7 2 L -10 -5 Z';
const WRAITH_HOOD_EDGE = 'M -9 -14 Q -10 -31 0 -33 Q 10 -31 9 -14';
const CLAW = 'M 0 0 l -4 -2 M 0 0 l -4.5 1 M 0 0 l -3 3.5';
const STAR4 = 'M 0 -4 L 1 -1 L 4 0 L 1 1 L 0 4 L -1 1 L -4 0 L -1 -1 Z';
const DROP = 'M 0 0 Q 2.2 3 0 4.5 Q -2.2 3 0 0 Z';
const BARRIER = 'M 20 -54 Q 38 -27 20 0 Q 28 -27 20 -54 Z';
const SHARD = 'M 0 -3 L 3 2 L -3 2 Z';
const STARS = Array.from({ length: 18 }, (_, i) => ({ x: ((i * 37 + 11) % 100) / 100, y: ((i * 53 + 7) % 45) / 100, d: (i % 5) * 0.6 }));
const centered = { originX: 0.5, originY: 0.5, transformBox: 'fill-box' as const };
const footed = { originX: 0.5, originY: 1, transformBox: 'fill-box' as const };

type DuelBeat =
  | { kind: 'idle' }
  | { kind: 'rated'; rating: Rating }
  | { kind: 'wager'; sure: boolean }
  | { kind: 'result'; correct: boolean; sure: boolean };

type GhostMood = 'calm' | 'grin' | 'scared' | 'angry';

/** The line shouted over the duel for each beat. */
function calloutFor(beat: DuelBeat): { text: string; color: string; big?: boolean } | null {
  switch (beat.kind) {
    case 'rated':
      return beat.rating === Rating.Again ? { text: 'Blank…', color: '#fca5a5' }
        : beat.rating === Rating.Hard ? { text: 'Shaky…', color: '#fdba74' }
        : beat.rating === Rating.Good ? { text: 'Ready', color: '#c4b5fd' }
        : { text: 'Unstoppable!', color: MINT };
    case 'wager':
      return beat.sure ? { text: 'Sure!', color: MINT } : { text: 'Playing safe', color: '#c4b5fd' };
    case 'result':
      return beat.correct
        ? beat.sure ? { text: 'CRITICAL!', color: MINT, big: true } : { text: 'Slain!', color: MINT }
        : beat.sure ? { text: 'K.O.', color: '#f87171', big: true } : { text: 'Shield broke!', color: '#fca5a5' };
    default:
      return null;
  }
}

/** Burning eyes and a jagged maw inside the wraith's hood. */
function GhostFace({ mood }: { mood: GhostMood }) {
  const eye = {
    calm: { rx: 1.8, ry: 2.2, fill: '#ef4444' },
    grin: { rx: 2.2, ry: 1.1, fill: '#f87171' },
    scared: { rx: 1, ry: 1, fill: '#fca5a5' },
    angry: { rx: 2.3, ry: 2.6, fill: '#ff1f3d' },
  }[mood];
  return (
    <>
      <g filter="url(#duel-eye-glow)">
        <ellipse cx={-3.5} cy={-24} {...eye} />
        <ellipse cx={3.5} cy={-24} {...eye} />
      </g>
      {mood === 'angry' && (
        <path d="M -6.5 -28.5 L -1.5 -26 M 6.5 -28.5 L 1.5 -26" stroke="#ff1f3d" strokeWidth="1.4" strokeLinecap="round" />
      )}
      {mood === 'scared' && <circle cx={0} cy={-17} r="1.6" fill="none" stroke="#fca5a5" strokeWidth="1" />}
      {mood === 'angry' && <path d="M -4 -19 L 4 -19 L 3 -15 L -3 -15 Z" fill="#7f1d1d" />}
      {mood !== 'scared' && (
        <path
          d={mood === 'calm'
            ? 'M -3 -18 L -1.5 -17 L 0 -18 L 1.5 -17 L 3 -18'
            : 'M -4.5 -19 L -3 -16.5 L -1.5 -19 L 0 -16.5 L 1.5 -19 L 3 -16.5 L 4.5 -19'}
          fill="none" stroke="#fecaca" strokeWidth="1" strokeLinejoin="round"
        />
      )}
    </>
  );
}

function MemoryDuel({ rNow, dueIn, dueAfter, beat, accent }: {
  rNow: number | null;
  dueIn: number;
  dueAfter: number | null;
  beat: DuelBeat;
  accent: string;
}) {
  const reduce = useReducedMotion();
  const [boxRef, { w, h }] = useBoxSize<HTMLDivElement>();
  const ground = h - 20;
  // The fight is centre stage: the knight guards the castle on the left and
  // forgetting comes in from the right
  const heroX = Math.round(Math.max(90, w * 0.4));
  const roadEnd = w - 24;
  const roadX = (ms: number) => heroX + (roadEnd - heroX) * reach(ms);
  // Never let the ghost stand inside the knight
  const near = heroX + 46;
  const ghostAt = (ms: number) => Math.max(near, roadX(ms));
  const g0 = ghostAt(dueIn);
  const g1 = dueAfter !== null ? ghostAt(dueAfter) : g0;
  // Where the ghost squares up once the wager is placed
  const windX = Math.min(heroX + 78, roadEnd);
  const fresh = rNow === null;
  const t = (s: number) => (reduce ? 0 : s);
  const spring = { type: 'spring' as const, stiffness: 110, damping: 16 };

  const result = beat.kind === 'result' ? beat : null;
  const win = !!result?.correct;
  const crit = win && !!result?.sure;
  const ko = !!result && !result.correct && result.sure;
  const broke = !!result && !result.correct && !result.sure;
  const sureBet = beat.kind === 'wager' ? beat.sure : result ? result.sure : null;
  // Length of the result fight, when the decisive blow lands, and when the
  // knight is standing again (all in seconds)
  const dur = crit ? 2.3 : win ? 1.9 : ko ? 3.0 : 2.0;
  const hitAt = crit ? 0.85 : win ? 0.5 : ko ? 0.51 : 0.36;
  const settle = crit ? 1.7 : win ? 1.35 : ko ? 2.6 : 1.6;
  // A winning knight is back from the strike and starts celebrating here
  const celebrateAt = crit ? 1.6 : 1.2;

  // ── Ghost ──
  const ratedX = beat.kind === 'rated'
    ? beat.rating === Rating.Again ? near
      : beat.rating === Rating.Hard ? g0 - (g0 - near) * 0.5
      : beat.rating === Rating.Easy ? Math.min(g0 + 24, roadEnd)
      : g0
    : g0;
  const ghostMotion = result
    ? result.correct
      ? {
          // Destroyed — it doesn't come back this round
          animate: { x: [windX, windX, windX + 22, windX + 22], opacity: [1, 1, 0, 0], scale: [1.18, 1.18, 1.6, 1.6] },
          transition: { duration: t(dur), times: [0, hitAt / dur, (hitAt + 0.3) / dur, 1], ease: 'easeInOut' as const },
        }
      : {
          animate: { x: [windX, heroX + 28, heroX + 28, heroX + 52, g1], opacity: 1, scale: [1.18, 1.3, 1.3, 1.1, 1] },
          transition: { duration: t(dur), times: [0, hitAt / dur, (ko ? 1.8 : 1.0) / dur, (ko ? 2.2 : 1.3) / dur, 1], ease: 'easeInOut' as const },
        }
    : beat.kind === 'wager'
      ? { animate: { x: windX, opacity: 1, scale: 1.18 }, transition: spring }
      : { animate: { x: ratedX, opacity: 1, scale: 1 }, transition: spring };
  const mood: GhostMood = result
    ? result.correct ? 'scared' : 'grin'
    : beat.kind === 'wager' ? 'angry'
    : beat.kind === 'rated'
      ? beat.rating === Rating.Easy ? 'scared' : beat.rating === Rating.Good ? 'angry' : 'grin'
      : 'calm';

  // ── Knight ──
  const dash = Math.max(0, windX - heroX - 34);
  const heroMotion = result
    ? win
      ? { animate: { x: [0, 0, dash, dash, 0], rotate: 0 }, transition: { duration: t(crit ? 1.6 : 1.2), times: [0, 0.15, 0.35, 0.6, 1] } }
      : ko
        ? { animate: { x: [0, 0, -12, -12, -6, 0], rotate: [0, 0, -82, -82, -30, 0] }, transition: { duration: t(dur), times: [0, 0.17, 0.25, 0.7, 0.85, 1] } }
        : { animate: { x: [0, 0, -10, -10, 0], rotate: [0, 0, -14, -14, 0] }, transition: { duration: t(dur), times: [0, 0.18, 0.24, 0.5, 1] } }
    : { animate: { x: 0, rotate: 0 }, transition: spring };
  const stance = beat.kind === 'rated' && beat.rating === Rating.Again ? { y: 1.5, scaleY: 1 }
    : beat.kind === 'wager' && beat.sure ? { y: 0, scaleY: 0.92 }
    : { y: 0, scaleY: 1 };
  const swordRest = beat.kind === 'rated'
    ? beat.rating === Rating.Again ? 115 : beat.rating === Rating.Hard ? -25 : 0
    : sureBet === null ? 0 : sureBet ? -45 : 35;
  const swordMotion = result && !reduce
    ? win
      ? crit
        // Ends raised high in triumph
        ? { animate: { rotate: [swordRest, swordRest, -70, 120, -60, 120, -28] }, transition: { duration: 1.6, times: [0, 0.12, 0.22, 0.34, 0.45, 0.56, 1] } }
        : { animate: { rotate: [swordRest, swordRest, -50, 110, 110, -28] }, transition: { duration: 1.2, times: [0, 0.2, 0.3, 0.42, 0.6, 1] } }
      : { animate: { rotate: [swordRest, swordRest, 100, 100, 0] }, transition: { duration: dur, times: [0, 0.17, 0.27, 0.7, 1] } }
    : { animate: { rotate: result ? 0 : swordRest }, transition: { type: 'spring' as const, stiffness: 160, damping: 14 } };

  const callout = calloutFor(beat);
  const after = !!result && dueAfter !== null;
  const showTag = beat.kind === 'idle' || after;
  // After a win the ghost is gone, so the tag says when forgetting returns
  const when = after ? `${win ? 'returns' : 'in'} ~${fmtSpan(dueAfter!)}` : fresh ? 'first meeting' : dueIn <= 0 ? 'here now' : `in ${fmtSpan(dueIn)}`;
  // Tag rides beside the ghost (right side, or left near the edge) so it never
  // lands on the knight's HP bar.
  const ghostFinal = after ? g1 : g0;
  const tagLeft = ghostFinal > w - 100;
  // (left side clears the wraith's reaching claws)
  const tagX = ghostFinal + (tagLeft ? -32 : 22);
  const tagAnchor = tagLeft ? 'end' : 'start';

  // Distant hills, one smooth silhouette across the whole width
  const hills = `M 0 ${ground} L 0 ${ground - 14} Q ${w * 0.12} ${ground - 30} ${w * 0.25} ${ground - 16} T ${w * 0.5} ${ground - 18} T ${w * 0.75} ${ground - 14} T ${w} ${ground - 22} L ${w} ${ground} Z`;
  const castleX = Math.max(30, heroX * 0.38);
  const moonX = w * 0.84;
  // Drop tick labels that would collide on narrow screens (the tick stays)
  let lastLabelX = -Infinity;
  const ticks = ROAD_TICKS.map(tk => {
    const tx = roadX(tk.ms);
    const labelled = tx - lastLabelX >= 28;
    if (labelled) lastLabelX = tx;
    return { ...tk, tx, labelled };
  });
  const burst = crit ? 12 : 7;

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
          {/* Knight: polished steel, and the blue-and-gold lattice heraldry */}
          <linearGradient id="duel-steel" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f4f4f5" />
            <stop offset="0.45" stopColor="#a1a1aa" />
            <stop offset="1" stopColor="#52525b" />
          </linearGradient>
          <pattern id="duel-lattice" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="#1d4ed8" />
            <path d="M 0 0 H 6 M 0 0 V 6" stroke="#fbbf24" strokeWidth="0.9" />
          </pattern>
          {/* Wraith: a cloak that fades into nothing, and burning eyes */}
          <linearGradient id="duel-cloak" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2a1d45" />
            <stop offset="0.7" stopColor="#140d24" stopOpacity="0.95" />
            <stop offset="1" stopColor="#140d24" stopOpacity="0.15" />
          </linearGradient>
          <filter id="duel-eye-glow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="1.4" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Camera shake on the big hits */}
        <motion.g
          animate={result && !reduce && (crit || !win) ? { x: [0, -4, 4, -3, 3, 0] } : { x: 0 }}
          transition={{ delay: hitAt, duration: 0.35 }}
        >
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
            <circle cx={moonX} cy={16} r="8" fill="#fff" />
            <circle cx={moonX + 4} cy={13} r="7" fill="#000" />
          </mask>
          <circle cx={moonX} cy={16} r="22" fill="url(#duel-moon-glow)" />
          <circle cx={moonX} cy={16} r="8" fill="#ecfdf5" opacity="0.75" mask="url(#duel-moon-cut)" />

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
          {ticks.map(tk => (
            <g key={tk.label}>
              <line x1={tk.tx} x2={tk.tx} y1={ground} y2={ground + 4} stroke="rgba(255,255,255,0.25)" />
              {tk.labelled && (
                <text x={tk.tx} y={ground + 14} textAnchor="middle" fontSize="8.5" fontWeight="600" fill="rgba(255,255,255,0.32)">
                  {tk.label}
                </text>
              )}
            </g>
          ))}

          {/* Forgetting */}
          <motion.g initial={{ x: g0, opacity: 1, scale: 1 }} animate={ghostMotion.animate} transition={ghostMotion.transition} style={footed}>
            <ellipse cx={0} cy={ground} rx="11" ry="2.5" fill="#000" opacity="0.5" />
            <motion.g
              animate={reduce ? undefined : { y: [0, -4, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <motion.g
                animate={mood === 'scared' && !reduce ? { x: [0, -1.2, 1.2, 0] } : { x: 0 }}
                transition={mood === 'scared' ? { duration: 0.22, repeat: Infinity } : { duration: 0.2 }}
              >
                <g transform={`translate(0 ${ground - 4})`}>
                  <circle cx={0} cy={-20} r={mood === 'angry' ? 32 : 27} fill="url(#duel-ghost-glow)" />
                  {/* Embers drifting off it */}
                  {!reduce && [0, 1, 2, 3].map(i => (
                    <motion.circle
                      key={i} cx={-8 + i * 5} r="0.9" fill="#c084fc"
                      initial={{ cy: -6, opacity: 0 }}
                      animate={{ cy: [-6, -44], opacity: [0, 0.8, 0] }}
                      transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.55, ease: 'easeOut' }}
                    />
                  ))}
                  {/* Skeletal claws, reaching for the knight */}
                  <motion.g
                    animate={reduce ? undefined : { rotate: mood === 'scared' ? [8, 14, 8] : [-4, 6, -4] }}
                    transition={{ duration: mood === 'angry' ? 0.8 : 1.8, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ originX: 1, originY: 0.5, transformBox: 'fill-box' }}
                  >
                    <path d="M -11 -23 Q -19 -22 -24 -17" fill="none" stroke="#2a1d45" strokeWidth="3.5" strokeLinecap="round" />
                    <path d="M -10 -14 Q -17 -11 -21 -7" fill="none" stroke="#2a1d45" strokeWidth="3.2" strokeLinecap="round" />
                    <path d={CLAW} transform="translate(-24 -17)" stroke="#d4d4d8" strokeWidth="1" strokeLinecap="round" fill="none" />
                    <path d={CLAW} transform="translate(-21 -7)" stroke="#d4d4d8" strokeWidth="1" strokeLinecap="round" fill="none" />
                  </motion.g>
                  <path d={WRAITH_CLOAK} fill="url(#duel-cloak)" stroke="#6d28d9" strokeOpacity="0.7" strokeWidth="1.2" strokeLinejoin="round" />
                  {/* The void under the hood */}
                  <ellipse cx={0} cy={-22} rx="8" ry="9.5" fill="#05030a" />
                  <path d={WRAITH_HOOD_EDGE} fill="none" stroke="#4c1d95" strokeWidth="1.2" />
                  <motion.g
                    animate={reduce ? undefined : { scaleY: [1, 1, 0.1, 1] }}
                    transition={{ duration: 3.4, repeat: Infinity, times: [0, 0.9, 0.95, 1] }}
                    style={centered}
                  >
                    <GhostFace mood={mood} />
                  </motion.g>
                </g>
              </motion.g>
            </motion.g>
          </motion.g>

          {/* Ghost's tag: who it is, and when it arrives (hidden mid-fight) */}
          {showTag && (
            <motion.g
              key={when}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: result ? t(dur) : 0.3 }}
            >
              <text x={tagX} y={ground - 32} textAnchor={tagAnchor} fontSize="7.5" fontWeight="700" letterSpacing="0.14em" fill="rgba(196,181,253,0.55)">
                FORGETTING
              </text>
              <text x={tagX} y={ground - 19} textAnchor={tagAnchor} fontSize="11" fontWeight="800" fill={after ? accent : '#e4e4e7'}>
                {when}
              </text>
            </motion.g>
          )}

          {/* Win: slash(es) + the ghost bursting */}
          {win && !reduce && (
            <g transform={`translate(${windX} ${ground - 8})`}>
              {(crit
                ? [{ d: 'M -16 -36 Q 12 -24 -4 0', delay: 0.5 }, { d: 'M 14 -36 Q -12 -24 4 0', delay: 0.85 }]
                : [{ d: 'M -16 -36 Q 12 -24 -4 0', delay: 0.45 }]
              ).map((s, i) => (
                <motion.path
                  key={i} d={s.d} fill="none" stroke={crit ? MINT : '#fff'} strokeWidth={crit ? 3.5 : 3} strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: [0, 1, 1], opacity: [0, 1, 0] }}
                  transition={{ delay: s.delay, duration: 0.32 }}
                />
              ))}
              {Array.from({ length: burst }, (_, i) => {
                const a = (i / burst) * Math.PI * 2;
                const dist = crit ? 32 : 22;
                return (
                  <motion.circle
                    key={i} cx={0} cy={-16} r={crit ? 3 : 2.5} fill={i % 2 && crit ? MINT : '#c4b5fd'}
                    initial={{ x: 0, y: 0, opacity: 0 }}
                    animate={{ x: Math.cos(a) * dist, y: Math.sin(a) * dist * 0.8, opacity: [0, 1, 0] }}
                    transition={{ delay: hitAt + 0.08, duration: 0.6, ease: 'easeOut' }}
                  />
                );
              })}
            </g>
          )}

          {/* The knight */}
          <g transform={`translate(${heroX} ${ground})`}>
            <ellipse cx={0} cy={0} rx="13" ry="3" fill="#000" opacity="0.5" />

            {/* After a loss: a ward of light as the knight gets back up */}
            {result && !win && (
              <motion.path
                d="M -22 0 A 22 26 0 0 1 22 0" fill={tint(accent, '1a')} stroke={accent} strokeWidth="1.5" strokeOpacity="0.8"
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: t(settle), duration: 0.5, ease: 'backOut' }}
                style={footed}
              />
            )}

            {/* Easy: a power aura */}
            {beat.kind === 'rated' && beat.rating === Rating.Easy && (
              <motion.ellipse
                cx={0} cy={-26} rx="20" ry="30" fill={tint(MINT, '14')} stroke={MINT} strokeWidth="1.5"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={reduce ? { opacity: 0.8, scale: 1 } : { opacity: [0.4, 0.9, 0.4], scale: [0.95, 1.05, 0.95] }}
                transition={{ duration: 1.4, repeat: reduce ? 0 : Infinity }}
                style={centered}
              />
            )}

            {/* Victory hops once the knight is back from the strike (own wrapper so
                it never fights the dash keyframes) */}
            <motion.g
              animate={win && !reduce ? { y: [0, -9, 0] } : { y: 0 }}
              transition={win && !reduce
                ? { delay: celebrateAt, duration: 0.5, repeat: Infinity, repeatDelay: 0.35, ease: 'easeOut' }
                : { duration: 0.2 }}
            >
            <motion.g animate={heroMotion.animate} transition={heroMotion.transition} style={footed}>
              <motion.g
                animate={reduce ? undefined : { y: [0, -1.2, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <motion.g animate={stance} transition={spring} style={footed}>
                  {/* Cape, rippling behind */}
                  <motion.path
                    fill="#b91c1c" stroke="#7f1d1d" strokeWidth="0.8"
                    initial={false}
                    animate={reduce ? undefined : {
                      d: [
                        'M -7 -30 Q -15 -20 -19 -5 L -15 -7 L -12 -3 L -8 -6 L -6 -12 Z',
                        'M -7 -30 Q -17 -21 -22 -7 L -17 -8 L -14 -4 L -9 -7 L -6 -12 Z',
                        'M -7 -30 Q -15 -20 -19 -5 L -15 -7 L -12 -3 L -8 -6 L -6 -12 Z',
                      ],
                    }}
                    d="M -7 -30 Q -15 -20 -19 -5 L -15 -7 L -12 -3 L -8 -6 L -6 -12 Z"
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  {/* Plate legs */}
                  <path d="M -7 -12 h 5 v 10 h 1.5 l 0 2 h -7.5 Z" fill="url(#duel-steel)" />
                  <path d="M 2 -12 h 5 v 10 l 3 0.5 l 0 1.5 h -8 Z" fill="url(#duel-steel)" />
                  <circle cx={-4.5} cy={-7} r="1.6" fill="#d4d4d8" />
                  <circle cx={4.5} cy={-7} r="1.6" fill="#d4d4d8" />
                  {/* Breastplate under a lattice tabard */}
                  <rect x={-9} y={-30} width="18" height="19" rx="4" fill="url(#duel-steel)" />
                  <path d="M -8 -28 L 8 -28 L 10 -11 L -10 -11 Z" fill="url(#duel-lattice)" stroke="#fbbf24" strokeWidth="0.8" />
                  <rect x={-10} y={-14.5} width="20" height="2.2" rx="1" fill="#fbbf24" />
                  {/* Pauldrons + sword arm */}
                  <ellipse cx={-8} cy={-28} rx="4.5" ry="3.2" fill="url(#duel-steel)" />
                  <ellipse cx={8} cy={-28} rx="4.5" ry="3.2" fill="url(#duel-steel)" />
                  <path d="M 9 -27 L 12.5 -20" stroke="#a1a1aa" strokeWidth="3.4" strokeLinecap="round" />
                  {/* Great helm: visor slit, breaths, gold crown */}
                  <path d="M -8 -32 L -8 -41 Q -8 -47 0 -47 Q 8 -47 8 -41 L 8 -32 Q 0 -30 -8 -32 Z" fill="url(#duel-steel)" stroke="#52525b" strokeWidth="0.6" />
                  <rect x={-5} y={-40.5} width="12" height="2" rx="1" fill="#0b0b0f" />
                  <rect x={2} y={-40.2} width="4" height="1.4" rx="0.7" fill={MINT} />
                  <circle cx={3} cy={-35} r="0.6" fill="#27272a" />
                  <circle cx={5} cy={-35} r="0.6" fill="#27272a" />
                  <path d="M -7 -46 L -5.5 -50 L -3 -47 L 0 -51.5 L 3 -47 L 5.5 -50 L 7 -46 Z" fill="#fbbf24" stroke="#b45309" strokeWidth="0.5" />
                  {/* Plume, swaying */}
                  <motion.g
                    animate={reduce ? undefined : { rotate: [-4, 5, -4] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ originX: 1, originY: 1, transformBox: 'fill-box' }}
                  >
                    <path d="M -1 -50 Q -10 -60 -21 -53 Q -11 -54 -3 -48 Z" fill="#dc2626" />
                    <path d="M -1 -49 Q -8 -56 -16 -51 Q -9 -51.5 -2 -47 Z" fill="#f4f4f5" />
                  </motion.g>
                  {/* Kite shield with the same heraldry */}
                  <path d="M -19 -29 h 12 v 9 q 0 8 -6 11.5 q -6 -3.5 -6 -11.5 Z" fill="url(#duel-lattice)" stroke="#fbbf24" strokeWidth="1.4" />
                  <circle cx={-13} cy={-22} r="1.8" fill="#fbbf24" />
                  <motion.g
                    animate={swordMotion.animate}
                    transition={swordMotion.transition}
                    style={{ originX: 0.5, originY: 0.78, transformBox: 'fill-box' }}
                  >
                    <path d="M 10 -21 L 10 -44 L 11.5 -47 L 13 -44 L 13 -21 Z" fill={sureBet && !result ? '#ccfff2' : '#e4e4e7'} stroke="#a1a1aa" strokeWidth="0.4" />
                    <line x1={11.5} x2={11.5} y1={-43} y2={-22} stroke="#a1a1aa" strokeWidth="0.6" />
                    <rect x={6.5} y={-21.5} width="10" height="2.5" rx="1.2" fill="#fbbf24" />
                    <rect x={10.5} y={-19} width="2" height="5" fill="#78350f" />
                    <circle cx={11.5} cy={-13} r="1.6" fill="#fbbf24" />
                  </motion.g>
                </motion.g>
              </motion.g>
            </motion.g>
            </motion.g>

            {/* Victory: confetti over the knight */}
            {win && !reduce && Array.from({ length: 14 }, (_, i) => {
              const spread = ((i * 37) % 13) - 6;
              return (
                <motion.rect
                  key={i} width="2.4" height="3.6" rx="0.6"
                  fill={[MINT, '#fbbf24', '#c4b5fd', '#f472b6'][i % 4]}
                  initial={{ x: 0, y: -40, opacity: 0, rotate: 0 }}
                  animate={{
                    x: [0, spread * 4, spread * 6],
                    y: [-40, -62 - (i % 4) * 4, -8],
                    opacity: [0, 1, 1, 0],
                    rotate: [0, 180 + i * 40, 360 + i * 60],
                  }}
                  transition={{ delay: celebrateAt + (i % 5) * 0.06, duration: 1.6, ease: 'easeOut', repeat: 1, repeatDelay: 0.6 }}
                  style={centered}
                />
              );
            })}

            {/* Again: a blank — "?" over the knight */}
            {beat.kind === 'rated' && beat.rating === Rating.Again && (
              <motion.g
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1, rotate: reduce ? 0 : [0, -10, 10, 0] }}
                transition={{ type: 'spring', stiffness: 400, damping: 14, rotate: { duration: 1.6, repeat: Infinity } }}
                style={centered}
              >
                <circle cx={17} cy={-50} r="6.5" fill="#fff" />
                <text x={17} y={-46.5} textAnchor="middle" fontSize="10" fontWeight="900" fill="#18181b">?</text>
              </motion.g>
            )}

            {/* Hard: sweating it */}
            {beat.kind === 'rated' && beat.rating === Rating.Hard && !reduce && [0, 1].map(i => (
              <motion.path
                key={i} d={DROP} fill="#7dd3fc"
                initial={{ x: -12 - i * 3, y: -44, opacity: 0 }}
                animate={{ y: [-44, -36], opacity: [0, 1, 0] }}
                transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.45 }}
              />
            ))}

            {/* Good / Easy: a gleam on the blade */}
            {beat.kind === 'rated' && (beat.rating === Rating.Good || beat.rating === Rating.Easy) && (
              <motion.path
                d={STAR4} fill="#fff" transform="translate(11.5 -47)"
                initial={{ scale: 0 }}
                animate={reduce ? { scale: 1 } : { scale: [0, 1.4, 0], rotate: [0, 90] }}
                transition={{ duration: 1.1, repeat: reduce ? 0 : Infinity, repeatDelay: 0.5 }}
                style={centered}
              />
            )}

            {/* "I'm sure": energy pouring into the blade */}
            {beat.kind === 'wager' && beat.sure && !reduce && (
              <g transform="translate(2.3 -28)">
                <motion.circle
                  r="9" fill={MINT}
                  animate={{ opacity: [0.15, 0.45, 0.15], scale: [0.8, 1.2, 0.8] }}
                  transition={{ duration: 0.9, repeat: Infinity }}
                  style={centered}
                />
                {Array.from({ length: 6 }, (_, i) => {
                  const a = (i / 6) * Math.PI * 2;
                  return (
                    <motion.circle
                      key={i} r="1.6" fill={MINT}
                      initial={{ x: Math.cos(a) * 24, y: Math.sin(a) * 24, opacity: 0 }}
                      animate={{ x: [Math.cos(a) * 24, 0], y: [Math.sin(a) * 24, 0], opacity: [0, 1, 0] }}
                      transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: 'easeIn' }}
                    />
                  );
                })}
              </g>
            )}

            {/* "Not sure": a guard barrier in front — it shatters if the ghost gets through */}
            {sureBet === false && (
              <motion.path
                d={BARRIER} fill="rgba(167,139,250,0.16)" stroke="#c4b5fd" strokeWidth="2"
                initial={{ opacity: 0, x: -6 }}
                animate={result
                  ? result.correct ? { opacity: 0, x: 0 } : { opacity: [1, 1, 0], x: 0 }
                  : { opacity: reduce ? 0.9 : [0.6, 1, 0.6], x: 0 }}
                transition={result
                  ? result.correct ? { duration: 0.3 } : { duration: t(hitAt + 0.05), times: [0, hitAt / (hitAt + 0.05), 1] }
                  : { duration: 1.6, repeat: reduce ? 0 : Infinity }}
              />
            )}
            {broke && !reduce && Array.from({ length: 6 }, (_, i) => (
              <motion.path
                key={i} d={SHARD} fill="#c4b5fd"
                initial={{ x: 26, y: -10 - i * 8, opacity: 0, rotate: 0 }}
                animate={{ x: 26 + 14 + (i % 3) * 8, y: -10 - i * 8 + (i % 2 ? 10 : -8), opacity: [0, 1, 0], rotate: 180 }}
                transition={{ delay: hitAt, duration: 0.6, ease: 'easeOut' }}
                style={centered}
              />
            ))}

            {/* Loss: the hit */}
            {result && !result.correct && !reduce && (
              <motion.circle
                cx={0} cy={-26} fill="none" stroke={broke ? '#c4b5fd' : RED} strokeWidth="2.5"
                initial={{ r: 4, opacity: 0 }}
                animate={{ r: [4, 28], opacity: [0.9, 0] }}
                transition={{ delay: hitAt, duration: 0.5 }}
              />
            )}

            {/* K.O.: seeing stars, then back up */}
            {ko && !reduce && (
              <>
                <motion.g
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 1, 0], rotate: 360 }}
                  transition={{ opacity: { delay: hitAt + 0.3, duration: 1.4, times: [0, 0.1, 0.85, 1] }, rotate: { duration: 1.2, repeat: Infinity, ease: 'linear' } }}
                  style={{ originX: 0.5, originY: 0.5, transformBox: 'fill-box' }}
                >
                  {[0, 1, 2].map(i => {
                    const a = (i / 3) * Math.PI * 2;
                    return <path key={i} d={STAR4} fill="#fde68a" transform={`translate(${-48 + Math.cos(a) * 7} ${-14 + Math.sin(a) * 3})`} />;
                  })}
                </motion.g>
                <motion.circle
                  cx={0} cy={-26} fill="none" stroke={MINT} strokeWidth="2"
                  initial={{ r: 6, opacity: 0 }}
                  animate={{ r: [6, 30], opacity: [0.9, 0] }}
                  transition={{ delay: dur * 0.85, duration: 0.6 }}
                />
              </>
            )}

          </g>

          {/* Shouted line for this beat */}
          {callout && (
            <motion.g
              key={callout.text}
              initial={{ opacity: 0, y: 8, scale: 0.6 }}
              animate={result
                ? { opacity: [0, 1, 1, 0], y: [8, 0, 0, -4], scale: [0.6, 1.15, 1, 1] }
                : { opacity: 1, y: 0, scale: 1 }}
              transition={result
                ? { delay: t(hitAt), duration: t(Math.max(0.8, dur - hitAt)), times: [0, 0.15, 0.8, 1] }
                : { type: 'spring', stiffness: 400, damping: 18 }}
              style={centered}
            >
              <text
                x={heroX + 40} y={callout.big ? 16 : 13} textAnchor="middle"
                fontSize={callout.big ? 15 : 11} fontWeight="900" letterSpacing="0.04em" fill={callout.color}
              >
                {callout.text}
              </text>
            </motion.g>
          )}
        </motion.g>

        {/* Impact flash */}
        {result && !reduce && (crit || ko) && (
          <motion.rect
            x={0} y={0} width={w} height={h} fill={crit ? '#fff' : RED} pointerEvents="none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0] }}
            transition={{ delay: hitAt, duration: 0.35 }}
          />
        )}
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

function StepHeading({ title }: { title: string }) {
  return (
    <h3 className="mb-3 text-lg font-bold text-zinc-900 leading-tight" style={{ fontFamily: DISPLAY_FONT }}>{title}</h3>
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

  const activeTurn = answered ? 3 : TURNS.indexOf(step);
  const goodReview = finalRating === Rating.Good || finalRating === Rating.Easy;
  const accent = goodReview ? MINT : ORANGE;
  // Each turn advances the fight in the duel below
  const duelBeat: DuelBeat = answered
    ? { kind: 'result', correct: isCorrect, sure: confidence === 'sure' }
    : confidence ? { kind: 'wager', sure: confidence === 'sure' }
    : bufferedRating ? { kind: 'rated', rating: bufferedRating }
    : { kind: 'idle' };

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
      {/* ── The word, centre stage, with its status as quiet pills ─────── */}
      <div className="rounded-[1.75rem] overflow-hidden px-4 lg:px-5 pt-4 pb-3.5 text-center" style={HERO}>
        <motion.h2
          initial={{ opacity: 0, y: 6, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ type: 'spring', stiffness: 180, damping: 18, delay: 0.05 }}
          className="font-black leading-none truncate"
          style={{ fontSize: 'clamp(2rem, 4.6vw, 2.6rem)', color: '#fff', fontFamily: DISPLAY_FONT, letterSpacing: '-0.02em' }}
        >
          {currentItem.word.word}
        </motion.h2>

        <div className="mt-2.5 flex items-center justify-center gap-2">
          <Badge color={stage.color} className="text-[9px] uppercase tracking-[0.18em] py-1 rounded-full">{stage.label}</Badge>
          <span
            title={answered ? 'Recall after this review' : rNow === null ? 'New word — no memory to measure yet' : 'Chance you recall it right now'}
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/25 text-sm font-bold tabular-nums"
            style={{ color: answered ? accent : '#fff' }}
          >
            <Brain className="h-3.5 w-3.5" style={{ color: MINT }} strokeWidth={2.2} />
            {rNow === null && !answered ? 'New' : <><CountUp value={answered ? 100 : pct(rNow ?? 0)} delay={answered ? 0.25 : 0} />%</>}
            <AnimatePresence>
              {answered && rNow !== null && pct(rNow) < 100 && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 16, delay: 0.5 }}
                  className="text-[10px] font-bold"
                >
                  +{100 - pct(rNow)}
                </motion.span>
              )}
            </AnimatePresence>
          </span>
          {streak > 0 && (
            <span
              title={`${streak} day streak`}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/25 text-sm font-bold tabular-nums text-orange-400"
            >
              <Flame className="h-3.5 w-3.5" strokeWidth={2.4} />
              {streak}
            </span>
          )}
        </div>
      </div>

      {/* ── Turn panel ──────────────────────────────────────────────── */}
      <div className="rounded-[1.75rem] overflow-hidden flex flex-col" style={SURFACE}>
        <div className={`flex-1 px-4 lg:px-5 pt-4 ${answered ? 'pb-5' : 'pb-3.5'} flex flex-col`}>
          <AnimatePresence mode="wait">

            {/* Turn 1 · Recall ─────────────────────────────────────── */}
            {step === 'recall' && (
              <motion.div key="recall" {...stepMotion}>
                <StepHeading title="How well did it come back?" />
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
                <StepHeading title="How sure are you?" />
                <div className="grid grid-cols-2 gap-2.5">
                  {([
                    { c: 'sure' as const, title: "I'm sure", color: MINT, Icon: Target },
                    { c: 'unsure' as const, title: 'Not sure', color: VIOLET, Icon: Dices },
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
                        <span className="flex-1 min-w-0 text-[15px] font-semibold text-zinc-900">{w.title}</span>
                        <Keycap>{i + 1}</Keycap>
                      </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Turn 3 · Prove it ───────────────────────────────────── */}
            {step === 'quiz' && (
              <motion.div key="quiz" {...stepMotion}>
                <StepHeading title="Prove it" />
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
                  {/* Wide screens: the downgrade note rides on the verdict row */}
                  {overconfident && (
                    <p className="hidden sm:block ml-auto text-right text-[11px] font-bold leading-tight text-orange-600">
                      Rated {bufferedRating === Rating.Easy ? 'Easy' : 'Good'} but missed<br />counted as Hard
                    </p>
                  )}
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
                  <p className="sm:hidden mt-2.5 text-[11px] font-bold text-orange-600">
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

        {/* Turn progress, along the bottom. Hidden once answered — all three
            turns are done, and the result needs the room. */}
        {!answered && (
          <div className="flex items-center gap-1.5 px-4 lg:px-5 pb-4">
            {TURNS.map((t, i) => {
              const done = i < activeTurn;
              const active = i === activeTurn;
              return (
                <div key={t} className="flex-1 min-w-0 h-1.5 rounded-full overflow-hidden bg-zinc-200">
                  <motion.div
                    className="h-full rounded-full"
                    initial={false}
                    animate={{ width: done || active ? '100%' : '0%' }}
                    transition={{ duration: 0.35 }}
                    style={{ background: active ? ink(MINT) : tint(ink(MINT), '66') }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── The duel: plays out as you take your turns ──────────────── */}
      <div
        className="rounded-[1.75rem] overflow-hidden pt-2 pb-3"
        style={{
          ...HERO,
          borderColor: answered ? tint(isCorrect ? MINT : RED, '80') : HERO_EDGE,
          transition: 'border-color 0.45s ease',
        }}
      >
        <div className="h-[88px]">
          <MemoryDuel
            rNow={rNow}
            dueIn={cardBefore.due.getTime() - now.getTime()}
            dueAfter={cardAfter ? cardAfter.due.getTime() - now.getTime() : null}
            beat={duelBeat}
            accent={accent}
          />
        </div>

        {/* Track record */}
        <div className="mt-2 px-4 lg:px-5 grid grid-cols-4 gap-2">
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
    </motion.div>
  );
}
