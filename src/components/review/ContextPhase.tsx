import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Check, X, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useClozeAttemptHistoryForWord } from '@/hooks/useClozeAttempts';
import type { DueWordItem, ClozeDialogue } from './types';

const WIN_PHRASES = ['In context. Owned.', 'Nailed it.', 'Sharp recall.', 'Perfect.', 'Locked in.'];
const LOSS_PHRASES = ['Not quite.', 'Read it again.', 'Study the context.', 'Almost.'];

const MAX_SLOTS = 5;

// ── Types ─────────────────────────────────────────────────────────
interface SpellingAttempt {
  id: string;
  word: string;
  userAnswer: string;
  wasCorrect: boolean;
  timestamp: number;
}

interface ContextPhaseProps {
  currentItem: DueWordItem;
  currentIndex: number;
  clozeDialogue: ClozeDialogue | null;
  clozeLoading: boolean;
  clozeAnswer: string;
  clozeSubmitted: boolean;
  onClozeAnswerChange: (value: string) => void;
  onClozeSubmit: () => void;
  onClozeNext: () => void;
  /** Wrong answer: reset for another attempt on the SAME word, without advancing. */
  onClozeRetry: () => void;
}

interface ClozeSegment {
  text: string;
  blank: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────
/**
 * Split a sentence into plain/blank segments. Blanks keep the ORIGINAL token
 * (e.g. "abandoned" for target "abandon") so it can be revealed after submit.
 */
function splitCloze(sentence: string, word: string): ClozeSegment[] {
  const w = word.toLowerCase().trim();
  if (!/^[a-z]+$/.test(w)) {
    const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return sentence
      .split(new RegExp(`(${escaped})`, 'gi'))
      .map((text, i) => ({ text, blank: i % 2 === 1 }))
      .filter(s => s.text);
  }
  const stems = [w];
  if (w.endsWith('e')) stems.push(w.slice(0, -1));
  if (w.endsWith('y')) stems.push(w.slice(0, -1) + 'i');
  return sentence
    .split(/([A-Za-z]+)/)
    .map((text, i) => {
      const t = text.toLowerCase();
      const blank = i % 2 === 1 && stems.some(s => t.startsWith(s) && t.length - s.length <= 4);
      return { text, blank };
    })
    .filter(s => s.text);
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// ── Penalty shot geometry ─────────────────────────────────────────
// SVG scene, viewBox 0 0 400 270. Goal mouth spans x 90→310, crossbar at
// y 70, goal line at y 190. Every attempt is a penalty from the spot.
type ShotKind = 'goal' | 'save' | 'crossbar' | 'over';
interface Pt { x: number; y: number }

const GOAL_L = 90;
const GOAL_R = 310;
const BAR_Y = 70;
const LINE_Y = 190;
const SPOT: Pt = { x: 200, y: 252 };
const FLIGHT = 0.75;

const GOAL_TARGETS: Pt[] = [
  { x: 200, y: 122 },
  { x: 138, y: 104 },
  { x: 262, y: 108 },
  { x: 152, y: 160 },
  { x: 250, y: 158 },
];

const MISS_KINDS: ShotKind[] = ['save', 'crossbar', 'over'];

const COMMENTARY: Record<ShotKind, string> = {
  goal: 'GOAL!',
  save: 'Saved by the keeper!',
  crossbar: 'Off the crossbar!',
  over: 'Out of the stadium!',
};

// Keeper's save dive: sideways shift + tilt around the waist (200, 156).
// The ball is aimed at where the gloves end up, 39 units above the pivot.
const SAVE_SHIFT = 40;
const SAVE_TILT = 70;
const KICK_DELAY = 0.2;

interface Shot {
  kind: ShotKind;
  /** Where the ball meets the frame / net. */
  contact: Pt;
  /** Bezier control for the flight arc. */
  control: Pt;
  /** Post-contact rebound points (empty for clean shots). */
  rebound: Pt[];
}

function planShot(attempt: SpellingAttempt): Shot {
  const h = hashString(attempt.id);
  const dir = h & 1 ? 1 : -1;

  let kind: ShotKind = 'goal';
  let contact: Pt;
  let rebound: Pt[] = [];

  if (attempt.wasCorrect) {
    // Pick a corner/zone from the hash, then nudge it so no two goals look identical
    const base = GOAL_TARGETS[(h >>> 1) % GOAL_TARGETS.length];
    contact = {
      x: base.x + (((h >>> 4) % 30) - 15),
      y: base.y + (((h >>> 9) % 16) - 8),
    };
  } else {
    kind = MISS_KINDS[(h >>> 1) % MISS_KINDS.length];
    const jitter = ((h >>> 4) % 40) - 20;
    switch (kind) {
      case 'save': {
        // Fingertip parry: ball meets the gloves at full stretch, pushed round the post
        const tilt = (SAVE_TILT * Math.PI) / 180;
        contact = { x: 200 + dir * (SAVE_SHIFT + 39 * Math.sin(tilt)), y: 152 - 39 * Math.cos(tilt) };
        rebound = [
          { x: contact.x + dir * 26, y: contact.y - 28 },
          { x: contact.x + dir * 52, y: 184 },
        ];
        break;
      }
      case 'crossbar':
        contact = { x: 200 + dir * (50 + jitter), y: BAR_Y + 7 };
        rebound = [
          { x: contact.x + dir * 22, y: BAR_Y - 30 },
          { x: contact.x + dir * 40, y: BAR_Y - 22 },
        ];
        break;
      default:
        // Skied clean out of the scene
        contact = { x: 200 + dir * (40 + jitter), y: -60 };
    }
  }

  const control = {
    x: (SPOT.x + contact.x) / 2 + dir * 26,
    y: Math.min(SPOT.y, contact.y) - 30,
  };
  return { kind, contact, control, rebound };
}

function bezier(p0: Pt, c: Pt, p1: Pt, t: number): Pt {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x,
    y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y,
  };
}

function shotKeyframes(shot: Shot) {
  const flight = Array.from({ length: 9 }, (_, i) => bezier(SPOT, shot.control, shot.contact, i / 8));
  const pts = [...flight, ...shot.rebound];
  const flightEnd = 8 / (pts.length - 1);
  const times = pts.map((_, i) =>
    i <= 8 ? (i / 8) * flightEnd : flightEnd + ((i - 8) / shot.rebound.length) * (1 - flightEnd)
  );
  // Ball shrinks with distance (perspective) and a bit more into the net
  const scale = pts.map((_, i) => (i <= 8 ? 1 - (i / 8) * 0.45 : 0.55));
  return { xs: pts.map(p => p.x), ys: pts.map(p => p.y), times, scale };
}

function shotPath(shot: Shot): string {
  const { contact: k, control: c } = shot;
  return `M ${SPOT.x} ${SPOT.y} Q ${c.x} ${c.y} ${k.x} ${k.y}` + shot.rebound.map(p => ` L ${p.x} ${p.y}`).join('');
}

/** Shots that bounce off something (bar, gloves) get extra time for the rebound. */
function deflects(shot: Shot): boolean {
  return shot.kind === 'crossbar' || shot.kind === 'save';
}

function shotDuration(shot: Shot): number {
  return FLIGHT * (deflects(shot) ? 1.5 : 1);
}

/** Seconds from submit until the ball reaches its contact point. */
function impactTime(shot: Shot): number {
  return KICK_DELAY + shotDuration(shot) * shotKeyframes(shot).times[8];
}

// ── Goalkeeper ────────────────────────────────────────────────────
// Drawn standing on the goal line at x 200 (feet at y 187). The dive rotates
// the whole figure around its waist, so "arms overhead" becomes "arms
// outstretched towards the post".

const KIT = '#f59e0b';

/**
 * Pins an SVG element's transform origin to a point in viewBox coordinates.
 * framer-motion overwrites a plain `transformOrigin` on SVG with "50% 50%", so
 * the point is passed as originX/originY fractions of the viewBox instead.
 */
function viewBoxOrigin(x: number, y: number) {
  return { originX: x / 400, originY: y / 270, transformBox: 'view-box' as const };
}

const KEEPER_POSE = {
  ready: {
    armL: 'M 191 145 L 182 140 L 178 130',
    armR: 'M 209 145 L 218 140 L 222 130',
    legL: 'M 195 163 L 191 175 L 189 187',
    legR: 'M 205 163 L 209 175 L 211 187',
    gloveL: { cx: 178, cy: 130 },
    gloveR: { cx: 222, cy: 130 },
  },
  dive: {
    armL: 'M 191 145 L 193 131 L 195 117',
    armR: 'M 209 145 L 207 131 L 205 117',
    legL: 'M 195 163 L 197 175 L 198 187',
    legR: 'M 205 163 L 203 175 L 202 187',
    gloveL: { cx: 195, cy: 117 },
    gloveR: { cx: 205, cy: 117 },
  },
  // Arms thrown up in a V
  celebrate: {
    armL: 'M 191 145 L 185 132 L 181 119',
    armR: 'M 209 145 L 215 132 L 219 119',
    legL: 'M 195 163 L 194 175 L 193 187',
    legR: 'M 205 163 L 206 175 L 207 187',
    gloveL: { cx: 181, cy: 119 },
    gloveR: { cx: 219, cy: 119 },
  },
};

const DIVE_TIME = 0.45;
// A save is DIVE_TIME in the air (gloves meet the ball), then the fall to the grass
const SAVE_FALL_TIME = DIVE_TIME / 0.6;
const FULL_SHIFT = 64;
// Lying on the grass: near-horizontal, waist dropped so the body rests on the ground
const LYING_TILT = 86;
const GROUNDED_Y = 21;

interface KeeperKick { kind: ShotKind; dir: 1 | -1 }

/** Goals beat the keeper (wrong way); on misses the keeper reads the side. */
function keeperKick(shot: Shot): KeeperKick {
  const side = shot.contact.x >= 200 ? 1 : -1;
  return { kind: shot.kind, dir: shot.kind === 'goal' ? (side === 1 ? -1 : 1) : side };
}

/** When the keeper leaves the line — a save is timed so the gloves arrive with the ball. */
function keeperDelay(shot: Shot): number {
  return shot.kind === 'save' ? impactTime(shot) - DIVE_TIME + 0.03 : KICK_DELAY + FLIGHT * 0.3;
}

const KEEPER_SHOUT: Record<ShotKind, string> = {
  goal: '',
  save: 'SAVED!',
  crossbar: 'PHEW!',
  over: 'HA!',
};

const DIZZY_STAR ='M 0 -3 L 0.9 -0.9 L 3 0 L 0.9 0.9 L 0 3 L -0.9 0.9 L -3 0 L -0.9 -0.9 Z';

/**
 * Sways on the line until the kick, then dives. Afterwards: beaten by a goal →
 * lies there with a spinning head; any miss (save, bar, skied) → gets up and celebrates.
 */
function GoalKeeper({ kick, delay }: { kick: KeeperKick | null; delay: number }) {
  const [aftermath, setAftermath] = useState(false);

  const kind = kick?.kind;
  useEffect(() => {
    if (!kind) return;
    // Goal: dizzy as soon as the keeper lands. Miss: a beat on the floor, then up.
    const wait = delay + DIVE_TIME + (kind === 'goal' ? 0 : 0.55);
    const id = setTimeout(() => setAftermath(true), wait * 1000);
    return () => clearTimeout(id);
  }, [kind, delay]);

  const d = kick?.dir ?? 1;
  const isSave = kick?.kind === 'save';
  const celebrating = kick?.kind !== 'goal' && aftermath;
  const dizzy = kick?.kind === 'goal' && aftermath;
  const shift = d * (isSave ? SAVE_SHIFT : FULL_SHIFT);

  const pose = !kick ? KEEPER_POSE.ready : celebrating ? KEEPER_POSE.celebrate : KEEPER_POSE.dive;
  const limb = { duration: 0.25, delay: kick && !aftermath ? delay : 0 };

  const body = !kick
    ? {
        animate: { x: [-9, 9, -9], y: [0, -1.5, 0, -1.5, 0] },
        transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' as const },
      }
    : celebrating
      ? {
          // Back on the feet (the bounce lives on the inner group)
          animate: { x: shift, y: 0, rotate: 0 },
          transition: { duration: 0.3, ease: 'easeOut' as const },
        }
      : isSave
        ? {
            // Airborne at full stretch when the ball arrives, then drops to the grass
            animate: { x: shift, y: [0, -16, -4, GROUNDED_Y], rotate: [0, d * SAVE_TILT, d * LYING_TILT] },
            transition: {
              x: { duration: DIVE_TIME, delay, ease: 'easeOut' as const },
              y: { duration: SAVE_FALL_TIME, delay, times: [0, 0.35, 0.6, 1], ease: 'easeOut' as const },
              rotate: { duration: SAVE_FALL_TIME, delay, times: [0, 0.6, 1], ease: 'easeOut' as const },
            },
          }
        : {
            animate: { x: shift, y: [0, -18, GROUNDED_Y], rotate: d * LYING_TILT },
            transition: {
              duration: DIVE_TIME,
              delay,
              ease: 'easeOut' as const,
              y: { duration: DIVE_TIME, delay, times: [0, 0.45, 1] },
            },
          };

  return (
    <g>
      {/* Ground shadow tracks the keeper sideways only */}
      <motion.ellipse
        cx="200" cy="188" rx="14" ry="2.6" fill="rgba(0,0,0,0.45)"
        animate={!kick ? { x: [-9, 9, -9] } : { x: shift, rx: celebrating ? 14 : 24, opacity: 0.6 }}
        transition={!kick
          ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
          : { duration: celebrating ? 0.3 : DIVE_TIME, delay: celebrating ? 0 : delay, ease: 'easeOut' }}
      />
      {/* Celebration bounce, layered over the get-up so the two don't fight */}
      <motion.g
        animate={celebrating ? { y: [0, -14, 0] } : { y: 0 }}
        transition={celebrating
          ? { duration: 0.5, delay: 0.3, repeat: Infinity, repeatDelay: 0.1, ease: 'easeOut' }
          : { duration: 0 }}
      >
        <motion.g
          initial={{ x: 0, y: 0, rotate: 0 }}
          {...body}
          style={viewBoxOrigin(200, 156)}
        >
          {/* Legs + boots */}
          {(['legL', 'legR'] as const).map(k => (
            <motion.path
              key={k}
              initial={{ d: KEEPER_POSE.ready[k] }}
              animate={{ d: pose[k] }}
              transition={limb}
              stroke="#18181b" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none"
            />
          ))}
          {/* Shorts */}
          <rect x="190" y="159" width="20" height="9" rx="2.5" fill="#27272a" />
          {/* Jersey */}
          <rect x="189" y="140" width="22" height="23" rx="6" fill={KIT} />
          <path d="M 189.5 150 L 210.5 150" stroke="rgba(0,0,0,0.18)" strokeWidth="1.2" />
          <text x="200" y="160" textAnchor="middle" fontSize="8" fontWeight="900" fill="rgba(0,0,0,0.5)" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>1</text>
          {/* Arms + gloves */}
          {(['L', 'R'] as const).map(s => (
            <g key={s}>
              <motion.path
                initial={{ d: KEEPER_POSE.ready[`arm${s}`] }}
                animate={{ d: pose[`arm${s}`] }}
                transition={limb}
                stroke={KIT} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none"
              />
              <motion.circle
                initial={KEEPER_POSE.ready[`glove${s}`]}
                animate={pose[`glove${s}`]}
                transition={limb}
                r="3.6" fill="#f4f4f5" stroke="#a1a1aa" strokeWidth="0.6"
              />
            </g>
          ))}
          {/* Head — spins when the keeper's been sent the wrong way */}
          <motion.g
            animate={dizzy ? { rotate: 360 } : { rotate: 0 }}
            transition={dizzy ? { duration: 0.5, repeat: Infinity, ease: 'linear' } : { duration: 0 }}
            style={{ transformOrigin: 'center', transformBox: 'fill-box' }}
          >
            <circle cx="200" cy="133" r="6.5" fill="#c68b59" />
            <path d="M 193.6 132 A 6.5 6.5 0 0 1 206.4 132 Q 200 128.6 193.6 132 Z" fill="#1c1917" />
          </motion.g>
          {dizzy && (
            <motion.g
              initial={{ opacity: 0, rotate: 0 }}
              animate={{ opacity: 1, rotate: -360 }}
              transition={{ opacity: { duration: 0.2 }, rotate: { duration: 1.4, repeat: Infinity, ease: 'linear' } }}
              style={{ transformOrigin: 'center', transformBox: 'fill-box' }}
            >
              {/* Four stars, symmetric so the group's box is centred on the head */}
              {[0, 90, 180, 270].map(deg => {
                const r = (deg * Math.PI) / 180;
                return (
                  <path
                    key={deg}
                    d={DIZZY_STAR}
                    transform={`translate(${200 + Math.cos(r) * 12} ${133 + Math.sin(r) * 12})`}
                    fill="#fde047"
                  />
                );
              })}
            </motion.g>
          )}
        </motion.g>
      </motion.g>
      {/* Victory shout over the keeper's head */}
      {celebrating && (
        <motion.text
          x={200 + shift}
          y="104"
          textAnchor="middle"
          fontSize="11"
          fontWeight="900"
          fill={KIT}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: [0.4, 1.25, 1] }}
          transition={{ duration: 0.4 }}
          style={{ fontFamily: "'Space Grotesk', sans-serif", transformOrigin: 'center', transformBox: 'fill-box' }}
        >
          {kick && KEEPER_SHOUT[kick.kind]}
        </motion.text>
      )}
    </g>
  );
}

// ── Penalty scene ─────────────────────────────────────────────────

/**
 * Penalty-shootout view scoped to ONE target word: its last 5 cloze attempts
 * (from cloze_attempts, across all past sessions). Correct answers bury the
 * ball in the net; misses clip the bar, rattle the post or fly wide/over,
 * tagged with what was actually typed.
 */
function PenaltyScene({ attempts, kick }: { attempts: SpellingAttempt[]; kick: SpellingAttempt | null }) {
  // Only the current kick is played out on the pitch; history lives in the
  // scoreboard + shootout tracker. Before submitting, the ball waits on the spot.
  const latest = kick ? { attempt: kick, shot: planShot(kick) } : null;
  const goals = attempts.filter(a => a.wasCorrect).length;
  const misses = attempts.length - goals;
  // Shootout tracker reads left → right, oldest first
  const chronological = [...attempts].reverse();

  return (
    <div className="h-full flex flex-col select-none">
      {/* ── Scoreboard ─────────────────────────────────────────────── */}
      <div className="shrink-0 hidden lg:flex items-center justify-between px-7 pt-6">
        <div>
          <p className="text-[9px] uppercase tracking-[0.25em] font-bold text-zinc-500">Penalty record</p>
          <p className="text-[11px] text-zinc-600 mt-0.5">Last {MAX_SLOTS} attempts on this word</p>
        </div>
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-2 font-black tabular-nums"
          style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.06)', fontFamily: "'Space Grotesk', sans-serif" }}
        >
          <div className="text-center">
            <motion.p key={goals} initial={{ scale: 1.4 }} animate={{ scale: 1 }} className="text-2xl leading-none text-emerald-400">{goals}</motion.p>
            <p className="text-[8px] uppercase tracking-widest text-emerald-400/60 mt-1">Goals</p>
          </div>
          <span className="text-xl text-zinc-600">–</span>
          <div className="text-center">
            <motion.p
              key={misses}
              initial={{ scale: 1.4 }}
              animate={{ scale: 1 }}
              className="text-2xl leading-none text-rose-500"
              style={{ textShadow: misses ? '0 0 14px rgba(244,63,94,0.4)' : 'none' }}
            >
              {misses}
            </motion.p>
            <p className="text-[8px] uppercase tracking-widest text-rose-400/60 mt-1">Missed</p>
          </div>
        </div>
      </div>

      {/* ── Pitch ─────────────────────────────────────────────────── */}
      <div className="relative flex-1 min-h-0">
        {/* Live commentary for the latest shot */}
        <div className="absolute top-2 lg:top-4 inset-x-0 flex justify-center z-10 pointer-events-none">
          <AnimatePresence mode="wait">
            {latest ? (
              <motion.div
                key={latest.attempt.id}
                initial={{ opacity: 0, y: -8, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ type: 'spring', stiffness: 320, damping: 18, delay: 0.2 + FLIGHT }}
                className="px-3 py-1 rounded-full text-[10px] lg:text-xs font-black uppercase tracking-wider"
                style={latest.shot.kind === 'goal'
                  ? { background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.4)' }
                  : { background: 'rgba(244,63,94,0.15)', color: '#fb7185', border: '1px solid rgba(244,63,94,0.4)' }}
              >
                {COMMENTARY[latest.shot.kind]}
                {latest.shot.kind !== 'goal' && (
                  <span className="normal-case font-semibold opacity-80"> · "{latest.attempt.userAnswer || 'blank'}"</span>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-3 py-1 rounded-full text-[10px] lg:text-xs font-bold uppercase tracking-wider text-zinc-500"
                style={{ border: '1px solid rgba(255,255,255,0.08)' }}
              >
                Step up — take the kick
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <svg viewBox="0 0 400 270" preserveAspectRatio="xMidYMax meet" className="absolute inset-0 w-full h-full">
          <defs>
            <pattern id="ct-net" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <path d="M 0 0 L 0 9 M 0 0 L 9 0" stroke="rgba(255,255,255,0.13)" strokeWidth="0.7" fill="none" />
            </pattern>
            <linearGradient id="ct-grass" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0f2a1e" />
              <stop offset="1" stopColor="#0a1a13" />
            </linearGradient>
            <radialGradient id="ct-spot-light" cx="0.5" cy="0" r="0.8">
              <stop offset="0" stopColor="rgba(255,255,255,0.07)" />
              <stop offset="1" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
            <radialGradient id="ct-ball" cx="0.35" cy="0.3" r="0.8">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="1" stopColor="#c9c9d1" />
            </radialGradient>
          </defs>

          {/* Floodlight wash */}
          <ellipse cx="200" cy="40" rx="220" ry="150" fill="url(#ct-spot-light)" />

          {/* Grass with mowing stripes */}
          <path d="M 0 182 L 400 182 L 400 270 L 0 270 Z" fill="url(#ct-grass)" />
          {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
            <path
              key={i}
              d={`M ${i * 50} 182 L ${i * 50 + 50} 182 L ${(i * 50 + 50 - 200) * 1.6 + 200} 270 L ${(i * 50 - 200) * 1.6 + 200} 270 Z`}
              fill={i % 2 ? 'rgba(255,255,255,0.025)' : 'transparent'}
            />
          ))}
          {/* Six-yard box + penalty spot */}
          <path d="M 60 190 L 40 222 L 360 222 L 340 190" stroke="rgba(255,255,255,0.18)" strokeWidth="1" fill="none" />
          <line x1="0" y1={LINE_Y} x2="400" y2={LINE_Y} stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
          <ellipse cx={SPOT.x} cy={SPOT.y + 6} rx="4" ry="1.6" fill="rgba(255,255,255,0.4)" />

          {/* Net (back plane + side panels) */}
          <path
            d={`M ${GOAL_L} ${BAR_Y} L ${GOAL_L + 22} ${BAR_Y + 18} L ${GOAL_R - 22} ${BAR_Y + 18} L ${GOAL_R} ${BAR_Y} L ${GOAL_R} ${LINE_Y} L ${GOAL_R - 22} ${LINE_Y - 8} L ${GOAL_L + 22} ${LINE_Y - 8} L ${GOAL_L} ${LINE_Y} Z`}
            fill="rgba(10,10,14,0.55)"
          />
          <rect x={GOAL_L} y={BAR_Y} width={GOAL_R - GOAL_L} height={LINE_Y - BAR_Y} fill="url(#ct-net)" />
          <path
            d={`M ${GOAL_L + 22} ${BAR_Y + 18} L ${GOAL_R - 22} ${BAR_Y + 18} L ${GOAL_R - 22} ${LINE_Y - 8} L ${GOAL_L + 22} ${LINE_Y - 8} Z`}
            stroke="rgba(255,255,255,0.1)" strokeWidth="0.8" fill="none"
          />
          <path
            d={`M ${GOAL_L} ${BAR_Y} L ${GOAL_L + 22} ${BAR_Y + 18} M ${GOAL_R} ${BAR_Y} L ${GOAL_R - 22} ${BAR_Y + 18} M ${GOAL_L} ${LINE_Y} L ${GOAL_L + 22} ${LINE_Y - 8} M ${GOAL_R} ${LINE_Y} L ${GOAL_R - 22} ${LINE_Y - 8}`}
            stroke="rgba(255,255,255,0.12)" strokeWidth="0.8"
          />

          {/* Frame — flashes on woodwork hits */}
          <rect x={GOAL_L - 4} y={BAR_Y - 4} width={GOAL_R - GOAL_L + 8} height="5" rx="2" fill="#e4e4e7" />
          <rect x={GOAL_L - 4} y={BAR_Y - 4} width="5" height={LINE_Y - BAR_Y + 4} rx="2" fill="#e4e4e7" />
          <rect x={GOAL_R - 1} y={BAR_Y - 4} width="5" height={LINE_Y - BAR_Y + 4} rx="2" fill="#e4e4e7" />

          {/* Keeper — sways on the line, then dives once the ball is struck */}
          <GoalKeeper
            key={latest?.attempt.id ?? 'keeper-idle'}
            kick={latest ? keeperKick(latest.shot) : null}
            delay={latest ? keeperDelay(latest.shot) : 0}
          />

          {/* Ball waiting on the spot */}
          {!latest && (
            <motion.g
              key="ball-on-spot"
              initial={{ opacity: 0, x: SPOT.x, y: SPOT.y - 4 }}
              animate={{ opacity: 1, x: SPOT.x, y: [SPOT.y - 4, SPOT.y - 1, SPOT.y - 4] }}
              transition={{ opacity: { duration: 0.3 }, y: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } }}
            >
              <circle r="8" fill="url(#ct-ball)" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
              <path d="M 0 -3 L 2.9 -0.9 L 1.8 2.4 L -1.8 2.4 L -2.9 -0.9 Z" fill="#27272a" />
            </motion.g>
          )}

          {/* The current kick */}
          {latest && [latest].map(({ attempt, shot }) => {
            const slot = 0;
            const isLatest = true;
            const delay = KICK_DELAY + slot * 0.12;
            const kf = shotKeyframes(shot);
            const rest = shot.rebound[shot.rebound.length - 1] ?? shot.contact;
            const isGoal = shot.kind === 'goal';
            const hitsSomething = deflects(shot);
            const accent = isGoal ? '#34d399' : '#f43f5e';
            const fade = isLatest ? 1 : 0.45;
            const duration = shotDuration(shot);

            return (
              <g key={attempt.id}>
                {/* Flight trail */}
                <motion.path
                  d={shotPath(shot)}
                  fill="none"
                  stroke={accent}
                  strokeWidth={isLatest ? 1.6 : 1}
                  strokeDasharray="3 4"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: isLatest ? 0.75 : 0.18 }}
                  transition={{ duration: duration, delay, ease: 'easeOut' }}
                />

                {/* Net bulge on a goal */}
                {isGoal && (
                  <motion.ellipse
                    cx={shot.contact.x}
                    cy={shot.contact.y}
                    fill="none"
                    stroke="#34d399"
                    strokeWidth="1.5"
                    initial={{ rx: 2, ry: 2, opacity: 0 }}
                    animate={{ rx: [2, 26], ry: [2, 16], opacity: [0.9, 0] }}
                    transition={{ duration: 0.7, delay: delay + FLIGHT, ease: 'easeOut' }}
                  />
                )}

                {/* Impact burst on the woodwork / gloves */}
                {hitsSomething && (
                  <motion.g
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: [0, 1.2, 1], opacity: [0, 1, fade] }}
                    transition={{ duration: 0.4, delay: delay + duration * kf.times[8] }}
                    style={viewBoxOrigin(shot.contact.x, shot.contact.y)}
                  >
                    {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => {
                      const r = (deg * Math.PI) / 180;
                      return (
                        <line
                          key={deg}
                          x1={shot.contact.x + Math.cos(r) * 7}
                          y1={shot.contact.y + Math.sin(r) * 7}
                          x2={shot.contact.x + Math.cos(r) * 13}
                          y2={shot.contact.y + Math.sin(r) * 13}
                          stroke={shot.kind === 'save' ? '#fbbf24' : '#fb7185'}
                          strokeWidth="1.6"
                          strokeLinecap="round"
                        />
                      );
                    })}
                  </motion.g>
                )}

                {/* Ball */}
                <motion.g
                  initial={{ x: SPOT.x, y: SPOT.y, scale: 1, opacity: 0 }}
                  animate={{ x: kf.xs, y: kf.ys, scale: kf.scale, opacity: fade }}
                  transition={{
                    x: { duration, delay, times: kf.times, ease: 'easeOut' },
                    y: { duration, delay, times: kf.times, ease: 'easeOut' },
                    scale: { duration, delay, times: kf.times },
                    opacity: { duration: 0.15, delay },
                  }}
                >
                  <circle r="8" fill="url(#ct-ball)" stroke={accent} strokeWidth={isLatest ? 1.6 : 1} />
                  <path d="M 0 -3 L 2.9 -0.9 L 1.8 2.4 L -1.8 2.4 L -2.9 -0.9 Z" fill="#27272a" />
                  {isLatest && (
                    <motion.circle
                      r="8"
                      fill="none"
                      stroke={accent}
                      initial={{ opacity: 0 }}
                      animate={{ r: [8, 15], opacity: [0.7, 0] }}
                      transition={{ duration: 1.6, delay: delay + FLIGHT * 1.5, repeat: Infinity }}
                    />
                  )}
                </motion.g>

                {/* What was typed, pinned where the miss ended up */}
                {!isGoal && isLatest && (
                  <motion.g
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: delay + FLIGHT * 1.5 }}
                  >
                    {(() => {
                      const label = (attempt.userAnswer || 'blank').slice(0, 14);
                      const w = label.length * 6 + 14;
                      const lx = Math.min(Math.max(rest.x - w / 2, 4), 396 - w);
                      // Balls skied out of the scene get their label pinned just above the bar
                      const ly = Math.max(rest.y < 50 ? rest.y + 12 : rest.y - 30, 36);
                      return (
                        <>
                          <rect x={lx} y={ly} width={w} height="16" rx="8" fill="#e11d48" />
                          <text
                            x={lx + w / 2}
                            y={ly + 11.5}
                            textAnchor="middle"
                            fontSize="9.5"
                            fontWeight="800"
                            fill="#fff"
                            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                          >
                            {label}
                          </text>
                        </>
                      );
                    })()}
                  </motion.g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* ── Shootout tracker ──────────────────────────────────────── */}
      <div className="shrink-0 hidden lg:flex justify-center gap-3 px-7 pb-6 pt-3">
        {Array.from({ length: MAX_SLOTS }, (_, i) => {
          const a = chronological[i];
          return (
            <div key={a?.id ?? `empty-${i}`} className="flex flex-col items-center gap-1.5 w-14">
              <motion.div
                initial={a ? { scale: 0 } : false}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 16, delay: 0.1 + i * 0.05 }}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={!a
                  ? { border: '1.5px dashed rgba(255,255,255,0.12)' }
                  : a.wasCorrect
                    ? { background: 'rgba(16,185,129,0.18)', border: '1.5px solid #10b981', boxShadow: '0 0 12px rgba(16,185,129,0.3)' }
                    : { background: 'rgba(244,63,94,0.18)', border: '1.5px solid #f43f5e', boxShadow: '0 0 12px rgba(244,63,94,0.3)' }}
              >
                {a && (a.wasCorrect
                  ? <Check className="h-4 w-4 text-emerald-400" strokeWidth={3} />
                  : <X className="h-4 w-4 text-rose-400" strokeWidth={3} />)}
              </motion.div>
              <span
                className={`text-[10px] font-semibold truncate max-w-full ${a && !a.wasCorrect ? 'text-rose-300 line-through' : 'text-zinc-600'}`}
                title={a?.userAnswer}
              >
                {a ? (a.wasCorrect ? 'scored' : a.userAnswer || 'blank') : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Cloze bubble ──────────────────────────────────────────────────
function ClozeLine({
  segments, typed, revealed, correct, sent,
}: { segments: ClozeSegment[]; typed: string; revealed: boolean; correct: boolean; sent: boolean }) {
  return (
    <>
      {segments.map((seg, i) => {
        if (!seg.blank) return <span key={i}>{seg.text}</span>;
        if (revealed) {
          return (
            <motion.span
              key={i}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 380, damping: 20, delay: 0.1 }}
              className="inline-block font-semibold px-1.5 rounded-md"
              // iOS green when right; search-highlight yellow showing the real word when wrong
              style={correct
                ? { color: '#fff', background: '#34C759' }
                : { color: '#000', background: '#FFD60A' }}
            >
              {seg.text}
            </motion.span>
          );
        }
        return (
          <span
            key={i}
            className="inline-block text-center font-semibold px-1.5 rounded-md align-baseline"
            style={{
              minWidth: `${Math.max(4, seg.text.length) * 0.55}em`,
              color: sent ? '#fff' : '#000',
              background: sent ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.06)',
              borderBottom: `2px dashed ${sent ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.35)'}`,
            }}
          >
            {typed || ' '}
          </span>
        );
      })}
    </>
  );
}

// ── iMessage (light mode) ─────────────────────────────────────────
type StageMood = 'idle' | 'correct' | 'wrong';

const IOS_FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', system-ui, sans-serif";
const IOS_SCREEN = '#FFFFFF';
const IOS_BLUE = '#0B84FE';
const IOS_GRAY = '#E9E9EB';
const IOS_LABEL = '#8E8E93';
const IOS_RED = '#FF3B30';

/**
 * iMessage bubble with the classic curled tail: a rounded nub in the bubble
 * colour, then a screen-coloured cutout carving the curl out of it.
 */
function IMessageBubble({ sent, children }: { sent: boolean; children: React.ReactNode }) {
  const fill = sent ? IOS_BLUE : IOS_GRAY;
  return (
    <div
      className="relative min-w-0 px-3 py-[6px] rounded-[18px] text-[15px] lg:text-[16px] leading-[1.3]"
      style={{ background: fill, color: sent ? '#fff' : '#000', letterSpacing: '-0.01em' }}
    >
      <span
        aria-hidden
        className="absolute bottom-0 w-5 h-5"
        style={sent
          ? { right: -7, background: fill, borderBottomLeftRadius: '16px 14px' }
          : { left: -7, background: fill, borderBottomRightRadius: '16px 14px' }}
      />
      <span
        aria-hidden
        className="absolute bottom-0 w-[10px] h-5"
        style={sent
          ? { right: -10, background: IOS_SCREEN, borderBottomLeftRadius: 10 }
          : { left: -10, background: IOS_SCREEN, borderBottomRightRadius: 10 }}
      />
      <span className="relative">{children}</span>
    </div>
  );
}

/** Scene partner's reaction on your message — ♥ when right, ? when wrong. */
function Tapback({ correct }: { correct: boolean }) {
  return (
    <motion.span
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 520, damping: 16, delay: 0.3 }}
      className="absolute -top-5 -left-5 z-[2] w-7 h-7 rounded-full flex items-center justify-center"
      style={{ background: IOS_GRAY, border: `2px solid ${IOS_SCREEN}` }}
    >
      {correct
        ? <span className="text-[13px] leading-none" style={{ color: '#FF2D55' }}>♥</span>
        : <span className="text-[13px] font-bold leading-none" style={{ color: IOS_LABEL }}>?</span>}
      <span
        aria-hidden
        className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
        style={{ background: IOS_GRAY, border: `1.5px solid ${IOS_SCREEN}` }}
      />
    </motion.span>
  );
}

/** Ring that fills in, then a check / cross drawn stroke by stroke. */
function VerdictBadge({ correct }: { correct: boolean }) {
  const color = correct ? '#00FFC8' : '#fb7185';
  return (
    <motion.svg
      viewBox="0 0 40 40"
      className="shrink-0 w-10 h-10"
      initial={{ scale: 0.6 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 14 }}
    >
      <circle cx="20" cy="20" r="18" fill={correct ? 'rgba(0,255,200,0.1)' : 'rgba(244,63,94,0.1)'} />
      <motion.circle
        cx="20" cy="20" r="18" fill="none" stroke={color} strokeWidth="2"
        style={{ rotate: -90, transformOrigin: '50% 50%' }}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />
      {correct ? (
        <motion.path
          d="M12.5 20.5 L17.5 25.5 L27.5 15" fill="none" stroke={color} strokeWidth="3"
          strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, delay: 0.35, ease: 'easeOut' }}
        />
      ) : (
        <>
          <motion.path
            d="M14 14 L26 26" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 0.18, delay: 0.35 }}
          />
          <motion.path
            d="M26 14 L14 26" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 0.18, delay: 0.5 }}
          />
        </>
      )}
    </motion.svg>
  );
}

// ── Main Component ────────────────────────────────────────────────
export function ContextPhase({
  currentItem, currentIndex, clozeDialogue, clozeLoading,
  clozeAnswer, clozeSubmitted, onClozeAnswerChange, onClozeSubmit, onClozeNext, onClozeRetry,
}: ContextPhaseProps) {
  const [winPhrase] = useState(() => WIN_PHRASES[Math.floor(Math.random() * WIN_PHRASES.length)]);
  const [lossPhrase] = useState(() => LOSS_PHRASES[Math.floor(Math.random() * LOSS_PHRASES.length)]);

  // Penalty Kick History State — scoped to THIS word only
  const [attemptHistory, setAttemptHistory] = useState<SpellingAttempt[]>([]);

  // Seed from this word's persisted history (across all past sessions)
  const { data: pastAttemptsForWord } = useClozeAttemptHistoryForWord(currentItem.word.id, MAX_SLOTS);

  // Reset immediately on word change so we never show the previous word's bar
  useEffect(() => {
    setAttemptHistory([]);
  }, [currentItem.word.id]);

  // Fill in once this word's history resolves (react-query caches per word_id,
  // so revisiting an already-fetched word is instant)
  useEffect(() => {
    if (!pastAttemptsForWord) return;
    setAttemptHistory(
      pastAttemptsForWord.map(a => ({
        id: a.id,
        word: currentItem.word.word,
        userAnswer: a.userAnswer,
        wasCorrect: a.wasCorrect,
        timestamp: a.timestamp,
      }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pastAttemptsForWord, currentItem.word.id]);

  const setupSegments = clozeDialogue?.setup
    ? splitCloze(clozeDialogue.setup, currentItem.word.word)
    : undefined;
  const responseSegments = clozeDialogue?.response
    ? splitCloze(clozeDialogue.response, currentItem.word.word)
    : undefined;
  const isClozeCorrect = clozeAnswer.toLowerCase().trim() === currentItem.word.word.toLowerCase();

  // The kick being played out on the pitch. Held separately from the history so
  // the DB refetch (which swaps in rows with new ids) can't replay or re-roll it.
  const [currentKick, setCurrentKick] = useState<SpellingAttempt | null>(null);

  // Track attempt when submitted — prepend locally for instant feedback
  // (the DB write + refetch happens in parallel via useSaveClozeAttempt)
  useEffect(() => {
    if (!clozeSubmitted) {
      setCurrentKick(null);
      return;
    }
    const newAttempt: SpellingAttempt = {
      id: generateId(),
      word: currentItem.word.word,
      userAnswer: clozeAnswer,
      wasCorrect: isClozeCorrect,
      timestamp: Date.now(),
    };

    setCurrentKick(newAttempt);
    // Keep only last 5 (FIFO — newest first)
    setAttemptHistory(prev => [newAttempt, ...prev].slice(0, MAX_SLOTS));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clozeSubmitted]);

  // Focus Continue / Try Again only after the submitting Enter has fully
  // dispatched — autoFocus would grab focus mid-keypress and the same Enter
  // would immediately "click" the button, skipping the result.
  const resultButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!clozeSubmitted) return;
    const t = setTimeout(() => resultButtonRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, [clozeSubmitted]);

  // Shrink-to-fit for the chat thread: no scrolling allowed, so if a long
  // dialogue overflows the phone panel, step the thread's zoom down until it fits.
  const threadRef = useRef<HTMLDivElement>(null);
  const threadContentRef = useRef<HTMLDivElement>(null);
  const [threadZoom, setThreadZoom] = useState(1);
  const [viewportH, setViewportH] = useState(() => window.innerHeight);
  useEffect(() => {
    const onResize = () => setViewportH(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  useLayoutEffect(() => {
    setThreadZoom(1);
  }, [currentItem.word.id, clozeDialogue, viewportH]);
  useLayoutEffect(() => {
    const box = threadRef.current;
    const content = threadContentRef.current;
    if (!box || !content) return;
    const available = box.clientHeight - 20; // pt-3 + pb-2
    if (content.getBoundingClientRect().height > available && threadZoom > 0.7) {
      setThreadZoom(z => Math.round((z - 0.05) * 100) / 100);
    }
  }, [threadZoom, clozeSubmitted, isClozeCorrect, clozeDialogue, clozeLoading, viewportH, attemptHistory]);

  const pastMisses = attemptHistory.filter(a => !a.wasCorrect);
  const isRepeatedMiss = pastMisses.length >= 2;
  const mood: StageMood = clozeSubmitted ? (isClozeCorrect ? 'correct' : 'wrong') : 'idle';
  const [chatTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  );

  return (
    <motion.div
      key={`context-${currentIndex}`}
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      // Fixed height sized to the viewport minus the review page chrome,
      // so the whole phase fits without scrolling.
      className="mt-4 flex flex-col lg:flex-row gap-3 lg:gap-5"
      style={{ height: 'min(calc(100dvh - 13rem), 780px)' }}
    >
      {/* ── Pitch: penalty record for this word ──────────────────────── */}
      <div className="rv-glass rounded-[2rem] overflow-hidden shrink-0 h-40 lg:h-auto lg:w-[44%]">
        <PenaltyScene attempts={attemptHistory} kick={clozeSubmitted ? currentKick : null} />
      </div>

      {/* ── Theater ─────────────────────────────────────────────────── */}
      <div
        className="rv-glass rounded-[2rem] overflow-hidden flex flex-col flex-1 min-h-0 min-w-0 relative"
        style={{
          borderColor: clozeSubmitted
            ? isClozeCorrect ? 'rgba(0,255,200,0.45)' : 'rgba(239,68,68,0.45)'
            : 'rgba(255,255,255,0.07)',
          transition: 'border-color 0.45s ease',
        }}
      >

        {/* ── Label + word ───────────────────────────────────────────── */}
        <div className="relative shrink-0 px-6 lg:px-10 pt-5">
          <span
            className="text-[9px] uppercase tracking-[0.25em] font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
            style={{ background: 'rgba(56,189,248,0.07)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.15)' }}
          >
            🎭 Context Theater
          </span>
          <motion.h2
            initial={{ opacity: 0, scale: 0.82, filter: 'blur(8px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ type: 'spring', stiffness: 180, damping: 18, delay: 0.06 }}
            className="font-bold leading-none select-none break-words text-center mt-2 lg:mt-3"
            style={{
              fontSize: 'clamp(1.85rem, 3.5vw, 3.25rem)',
              color: '#38bdf8',
              fontFamily: "'Space Grotesk', sans-serif",
              textShadow: '0 0 40px rgba(56,189,248,0.28)',
              letterSpacing: '-0.01em',
            }}
          >
            {currentItem.word.word}
          </motion.h2>
        </div>

        {/* ── Recurring miss strip — this specific word ──────────────── */}
        <AnimatePresence>
          {isRepeatedMiss && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="relative shrink-0 mx-6 lg:mx-10 mt-4 flex items-center gap-2 rounded-xl px-3 py-2 bg-rose-500/10 border border-rose-500/40 text-xs lg:text-sm"
              style={{ boxShadow: '0 0 18px rgba(244,63,94,0.12)' }}
            >
              <motion.span
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                className="shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5 text-rose-400" />
              </motion.span>
              <span className="shrink-0 font-black uppercase tracking-wider text-rose-400">
                Missed {pastMisses.length}/{attemptHistory.length}
              </span>
              <span className="truncate text-rose-200/90">
                · typed {pastMisses.map(a => `"${a.userAnswer || '(blank)'}"`).join(', ')}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Stage: two actors, one forgotten word ───────────────────── */}
        <div className="relative flex-1 min-h-0 px-6 lg:px-10 pt-4 pb-3 flex flex-col">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 min-h-0 flex flex-col rounded-[1.5rem] overflow-hidden"
            style={{ background: IOS_SCREEN, fontFamily: IOS_FONT, boxShadow: '0 10px 40px rgba(0,0,0,0.35)' }}
          >
            {/* Contact header */}
            <div
              className="shrink-0 flex items-center justify-center gap-2 py-2"
              style={{ background: 'rgba(249,249,249,0.94)', borderBottom: '0.5px solid rgba(0,0,0,0.15)' }}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                style={{ background: 'linear-gradient(180deg, #A5ABB8 0%, #858994 100%)' }}
              >
                🎭
              </div>
              <p className="text-[12px] font-medium text-black">
                Scene Partner <span style={{ color: IOS_LABEL }}>›</span>
              </p>
            </div>

            {/* Thread */}
            <div ref={threadRef} className="flex-1 min-h-0 overflow-hidden px-4 pt-3 pb-2 flex flex-col justify-end">
              {clozeLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-9 w-3/5 rounded-[18px] bg-zinc-200" />
                  <Skeleton className="h-9 w-1/2 rounded-[18px] bg-zinc-200 ml-auto" />
                </div>
              ) : responseSegments ? (
                <div ref={threadContentRef} className="shrink-0 flex flex-col" style={{ zoom: threadZoom }}>
                  <p className="shrink-0 text-center text-[11px] leading-tight mb-2.5" style={{ color: IOS_LABEL }}>
                    iMessage · <span className="font-semibold">Today</span> {chatTime}
                  </p>
                  {setupSegments && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.15, type: 'spring', stiffness: 420, damping: 28 }}
                      className="shrink-0 flex max-w-[75%] origin-bottom-left ml-1"
                    >
                      <IMessageBubble sent={false}>
                        <ClozeLine segments={setupSegments} typed={clozeAnswer} revealed={clozeSubmitted} correct={isClozeCorrect} sent={false} />
                      </IMessageBubble>
                    </motion.div>
                  )}
                  <div className="flex items-center justify-end gap-2.5">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5, type: 'spring', stiffness: 420, damping: 28 }}
                      className="relative flex max-w-[75%] origin-bottom-right mr-1 mt-4"
                    >
                      {mood !== 'idle' && <Tapback correct={mood === 'correct'} />}
                      <IMessageBubble sent>
                        <ClozeLine segments={responseSegments} typed={clozeAnswer} revealed={clozeSubmitted} correct={isClozeCorrect} sent />
                      </IMessageBubble>
                    </motion.div>
                    {mood === 'wrong' && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 20, delay: 0.15 }}
                        className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-[13px] font-bold"
                        style={{ background: IOS_RED }}
                      >
                        !
                      </motion.span>
                    )}
                  </div>
                  <p
                    className={`text-right text-[11px] font-semibold mt-1 h-4 ${mood === 'wrong' ? 'mr-8' : 'mr-1'}`}
                    style={{ color: mood === 'wrong' ? IOS_RED : IOS_LABEL }}
                  >
                    {mood === 'idle' ? '' : mood === 'correct' ? 'Delivered' : 'Not Delivered'}
                  </p>
                </div>
              ) : (
                <p className="text-center text-sm my-auto" style={{ color: IOS_LABEL }}>
                  No context sentence available for this word.
                </p>
              )}
            </div>
          </motion.div>
        </div>

        {/* ── Footer: input / verdict ─────────────────────────────────── */}
        <div className="relative shrink-0 px-6 lg:px-10 pb-6 lg:pb-7 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {clozeLoading ? (
            <Skeleton className="h-12 w-full rounded-2xl bg-zinc-800/60" />
          ) : !responseSegments ? (
            <button onClick={onClozeNext} className="rv-btn-mint">Continue</button>
          ) : !clozeSubmitted ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.24 }}
              className="flex gap-2"
            >
              <input
                className="rv-input flex-1 min-w-0"
                placeholder="Type the missing word…"
                value={clozeAnswer}
                onChange={e => onClozeAnswerChange(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && clozeAnswer.trim() && onClozeSubmit()}
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <button
                onClick={onClozeSubmit}
                disabled={!clozeAnswer.trim()}
                className="rv-btn-mint shrink-0"
                style={{ width: 'auto', padding: '0 1.6rem' }}
              >
                Shoot ⚽
              </button>
            </motion.div>
          ) : (
            // Same height as the input row: the composer morphs into the verdict
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, x: isClozeCorrect ? 0 : [0, -8, 8, -6, 6, -3, 3, 0] }}
              transition={{
                opacity: { duration: 0.2 },
                y: { duration: 0.2 },
                x: isClozeCorrect ? {} : { duration: 0.45, ease: 'easeInOut' },
              }}
              className="flex items-center gap-3 h-12"
            >
              <VerdictBadge correct={isClozeCorrect} />

              <div className="min-w-0 flex-1">
                <p
                  className="text-base lg:text-lg font-bold leading-tight truncate"
                  style={{ color: isClozeCorrect ? '#00FFC8' : '#fb7185', fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {isClozeCorrect ? winPhrase : lossPhrase}
                </p>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className="text-xs text-zinc-500 truncate mt-0.5"
                  title={isClozeCorrect ? undefined : currentItem.word.definition}
                >
                  {isClozeCorrect ? (
                    <>Scene Partner <span className="text-[#FF2D55]">♥</span> loved your message</>
                  ) : (
                    <>
                      <span className="line-through text-rose-400/80">{clozeAnswer}</span>
                      <span className="mx-1 text-zinc-600">→</span>
                      <span className="font-semibold text-[#00FFC8]">{currentItem.word.word}</span>
                      <span className="text-zinc-600"> · {currentItem.word.definition}</span>
                    </>
                  )}
                </motion.p>
              </div>

              <motion.button
                ref={resultButtonRef}
                onClick={isClozeCorrect ? onClozeNext : onClozeRetry}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: isClozeCorrect ? 0.25 : 0.5, type: 'spring', stiffness: 300, damping: 22 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                className="group relative shrink-0 h-12 px-5 rounded-2xl flex items-center gap-2 text-sm font-bold overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                style={isClozeCorrect
                  ? { background: 'linear-gradient(135deg, #2cffca 0%, #00FFC8 100%)', color: '#18181b', boxShadow: '0 0 20px rgba(0,255,200,0.25)' }
                  : { background: 'rgba(244,63,94,0.12)', color: '#fecdd3', border: '1px solid rgba(244,63,94,0.4)' }}
              >
                {isClozeCorrect && (
                  <motion.span
                    aria-hidden
                    className="absolute inset-y-0 w-1/2 -skew-x-12"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)' }}
                    initial={{ left: '-60%' }}
                    animate={{ left: '130%' }}
                    transition={{ duration: 0.9, delay: 0.6, ease: 'easeInOut' }}
                  />
                )}
                {!isClozeCorrect && <RotateCcw className="relative h-4 w-4" />}
                <span className="relative">{isClozeCorrect ? 'Continue' : 'Retry'}</span>
                {isClozeCorrect && (
                  <ArrowRight className="relative h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                )}
                <kbd
                  className="relative hidden sm:inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-md text-[10px] font-semibold"
                  style={{ background: isClozeCorrect ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.08)' }}
                >
                  ↵
                </kbd>
              </motion.button>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
