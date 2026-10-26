import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { ArrowRight, Flame, Zap, Check, RotateCcw } from 'lucide-react';
import {
  useCollocationHistoryForWord,
  useSaveCollocationAttempt,
  type CollocationHistory,
} from '@/hooks/useCollocationAttempts';
import type { DueWordItem, WordCollocation } from './types';

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightWord(phrase: string, word: string) {
  const regex = new RegExp(`(${escapeRegex(word)})`, 'gi');
  const parts = phrase.split(regex);
  return parts.map((part, i) =>
    regex.test(part)
      ? <span key={i} style={{ color: '#00FFC8', fontWeight: 700 }}>{part}</span>
      : <span key={i}>{part}</span>
  );
}

// ── Challenge generation ──────────────────────────────────────────
// Each collocation becomes "fill the partner word": the target word stays,
// the content word that collocates with it is blanked, and the learner picks
// it from 4 options. Decoys are shape-matched (-ing / -ed / base) so tense
// alone doesn't give the answer away.

const STOPWORDS = new Set([
  'a', 'an', 'the', 'of', 'to', 'in', 'on', 'for', 'with', 'at', 'by', 'from', 'and', 'or',
  'into', 'about', 'as', 'up', 'out', 'off', 'over', 'one', "one's", 'someone', 'something',
  'sb', 'sth', 'your', 'my', 'his', 'her', 'their', 'its', 'be', 'is', 'are', 'was', 'were',
]);

const DECOYS_BASE = [
  'make', 'take', 'do', 'have', 'give', 'keep', 'hold', 'pay', 'raise', 'reach', 'draw',
  'break', 'set', 'catch', 'bear', 'meet', 'strong', 'heavy', 'high', 'deep', 'fast',
  'hard', 'common', 'close', 'broad', 'sharp', 'wide', 'bitter', 'keen', 'vast',
];
const DECOYS_ING = [
  'making', 'taking', 'doing', 'having', 'giving', 'keeping', 'holding', 'paying',
  'raising', 'reaching', 'drawing', 'breaking', 'setting', 'catching', 'meeting',
];
const PREPOSITIONS = [
  'for', 'to', 'in', 'on', 'with', 'at', 'into', 'of', 'about', 'from', 'by',
  'up', 'out', 'off', 'over', 'against', 'towards', 'through',
];
const DECOYS_ED = [
  'made', 'taken', 'done', 'had', 'given', 'kept', 'held', 'paid', 'raised', 'reached',
  'drawn', 'broken', 'caught', 'met', 'struck',
];

interface Challenge {
  tokens: string[];
  blankIndex: number;
  answer: string;
  options: string[];
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed || 1;
  for (let i = out.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const clean = (t: string) => t.toLowerCase().replace(/[^a-z'-]/g, '');

function isTargetToken(token: string, word: string): boolean {
  const t = clean(token);
  const parts = word.toLowerCase().trim().split(/\s+/);
  return parts.some(w => {
    const stems = [w];
    if (w.endsWith('e')) stems.push(w.slice(0, -1));
    if (w.endsWith('y')) stems.push(w.slice(0, -1) + 'i');
    return stems.some(s => t.startsWith(s) && t.length - s.length <= 4);
  });
}

/** null → phrase has no usable partner word; shown as a plain read-through card. */
function buildChallenge(col: WordCollocation, word: string): Challenge | null {
  const tokens = col.collocation.trim().split(/\s+/);
  const targets = tokens.map((t, i) => (isTargetToken(t, word) ? i : -1)).filter(i => i >= 0);
  const anchor = targets[0] ?? 0;

  // Dependent preposition right after the target ("opt FOR", "rely ON") is the
  // collocation itself — blank that. Otherwise blank the closest content word.
  let blankIndex = -1;
  const afterTarget = targets.length ? clean(tokens[targets[targets.length - 1] + 1] ?? '') : '';
  if (afterTarget && PREPOSITIONS.includes(afterTarget)) {
    blankIndex = targets[targets.length - 1] + 1;
  } else {
    const candidates = tokens
      .map((_, i) => i)
      .filter(i => !targets.includes(i) && clean(tokens[i]).length > 1 && !STOPWORDS.has(clean(tokens[i])));
    if (candidates.length === 0) return null;
    blankIndex = candidates.reduce((best, i) => (Math.abs(i - anchor) < Math.abs(best - anchor) ? i : best));
  }

  const answer = tokens[blankIndex].replace(/[^A-Za-z'-]/g, '');
  const a = answer.toLowerCase();

  const pool = PREPOSITIONS.includes(a) ? PREPOSITIONS
    : a.endsWith('ing') ? DECOYS_ING
      : a.endsWith('ed') ? DECOYS_ED
        : DECOYS_BASE;
  const inPhrase = new Set(tokens.map(clean));
  const seed = hashString(col.id + col.collocation);
  const decoys = seededShuffle(pool.filter(d => d !== a && !inPhrase.has(d)), seed).slice(0, 3);
  const options = seededShuffle([answer, ...decoys], seed ^ 0x9e3779b9);

  return { tokens, blankIndex, answer, options };
}

// ── Session set selection ─────────────────────────────────────────
// Drilling every collocation on every review is fatiguing (5 phrases × every
// due word), so each session plays at most SESSION_CAP phrases, chosen by need:
//   1. phrases missed last time (most misses first)
//   2. phrases never practised
//   3. phrases practised longest ago
// "repair" mode (mature words) plays ONLY the missed ones.
const SESSION_CAP = 3;

export type ForgeMode = 'full' | 'repair';

function pickSessionSet(
  cols: WordCollocation[],
  history: CollocationHistory,
  mode: ForgeMode,
): WordCollocation[] {
  // Sort by id first so ties resolve the same way every time
  const sorted = [...cols].sort((a, b) => a.id.localeCompare(b.id));
  const struggling = sorted
    .filter(c => history[c.id]?.struggling)
    .sort((a, b) => history[b.id].misses - history[a.id].misses);
  if (mode === 'repair') return struggling.slice(0, SESSION_CAP);

  const rest = sorted
    .filter(c => !history[c.id]?.struggling)
    .sort((a, b) => (history[a.id]?.lastAt ?? 0) - (history[b.id]?.lastAt ?? 0));
  return [...struggling, ...rest].slice(0, SESSION_CAP);
}

// ── Chain progress ────────────────────────────────────────────────
type LinkState = 'forged' | 'cracked' | 'current' | 'pending';

function Chain({ states }: { states: LinkState[] }) {
  return (
    <div className="flex items-center justify-center">
      {states.map((s, i) => (
        <motion.span
          key={i}
          className="block w-8 h-[18px] rounded-full -ml-2 first:ml-0"
          style={{
            border: `2.5px ${s === 'cracked' ? 'dashed' : 'solid'} ${
              s === 'forged' ? '#00FFC8' : s === 'cracked' ? '#fbbf24' : s === 'current' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.12)'
            }`,
            boxShadow: s === 'forged' ? '0 0 10px rgba(0,255,200,0.45)' : 'none',
            zIndex: states.length - i,
            background: 'transparent',
          }}
          animate={
            s === 'current'
              ? { opacity: [0.5, 1, 0.5] }
              : s === 'forged' || s === 'cracked'
                ? { scale: [1.35, 1], opacity: 1 }
                : { opacity: 1 }
          }
          transition={s === 'current' ? { duration: 1.4, repeat: Infinity } : { type: 'spring', stiffness: 400, damping: 14 }}
        />
      ))}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────
interface CollocationPhaseProps {
  currentItem: DueWordItem;
  currentIndex: number;
  collocations: WordCollocation[];
  /** 'repair' = mature word: replay only the phrases missed last time. */
  mode?: ForgeMode;
  onNext: () => void;
}

type CardResult = 'clean' | 'retry';

const CARD_STYLE = { height: 'min(calc(100dvh - 13rem), 640px)' };

export function CollocationPhase({
  currentItem, currentIndex, collocations: allCollocations, mode = 'full', onNext,
}: CollocationPhaseProps) {
  const targetWord = currentItem.word.word;
  const wordId = currentItem.word.id;

  const historyQuery = useCollocationHistoryForWord(wordId);
  const saveAttempt = useSaveCollocationAttempt();

  // Freeze the session set once history has loaded (or failed — then play
  // without it). Saving attempts refetches history, which must not reshuffle
  // the set mid-game.
  const [session, setSession] = useState<{ set: WordCollocation[]; wasStruggling: Set<string> } | null>(null);
  const historyReady = historyQuery.isSuccess || historyQuery.isError;
  useEffect(() => {
    if (session || !historyReady) return;
    const history = historyQuery.data ?? {};
    setSession({
      set: pickSessionSet(allCollocations, history, mode),
      wasStruggling: new Set(Object.keys(history).filter(id => history[id].struggling)),
    });
  }, [session, historyReady, historyQuery.data, allCollocations, mode]);

  const collocations = useMemo(() => session?.set ?? [], [session]);
  const wasStruggling = session?.wasStruggling ?? new Set<string>();
  const total = collocations.length;
  const restingCount = mode === 'full' ? allCollocations.length - total : 0;

  const challenges = useMemo(
    () => collocations.map(c => buildChallenge(c, targetWord)),
    [collocations, targetWord]
  );

  const [cardIndex, setCardIndex] = useState(0);
  const [allDone, setAllDone] = useState(false);
  const [wrongPicks, setWrongPicks] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);
  const [results, setResults] = useState<CardResult[]>([]);
  const [xp, setXp] = useState(0);
  const [lastGain, setLastGain] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);

  const current = collocations[cardIndex];
  const challenge = challenges[cardIndex];
  const isLast = cardIndex === total - 1;
  // Read-through cards (no partner word to blank) count as solved immediately
  const isSolved = solved || (!!current && !challenge);

  const pick = (option: string) => {
    if (!challenge || isSolved || wrongPicks.includes(option)) return;
    if (option === challenge.answer) {
      const firstTry = wrongPicks.length === 0;
      const gained = firstTry ? 100 + combo * 25 : wrongPicks.length === 1 ? 40 : 15;
      const nextCombo = firstTry ? combo + 1 : 0;
      setSolved(true);
      setXp(x => x + gained);
      setLastGain(gained);
      setCombo(nextCombo);
      setBestCombo(b => Math.max(b, nextCombo));
      setResults(r => {
        const copy = [...r];
        copy[cardIndex] = firstTry ? 'clean' : 'retry';
        return copy;
      });
      saveAttempt.mutate(
        { wordId, collocationId: current.id, wasCorrect: firstTry, wrongPick: wrongPicks[0] ?? null },
        { onError: err => console.error('Failed to save collocation attempt:', err) },
      );
    } else {
      setWrongPicks(w => [...w, option]);
      setCombo(0);
    }
  };

  const advance = () => {
    if (!isSolved) return;
    if (!challenge) {
      setResults(r => {
        const copy = [...r];
        copy[cardIndex] = 'clean';
        return copy;
      });
    }
    setWrongPicks([]);
    setSolved(false);
    setLastGain(0);
    if (isLast) setAllDone(true);
    else setCardIndex(i => i + 1);
  };

  // Keyboard: 1–4 to pick, Enter to move on. Ignores key-repeat so a held Enter
  // can't chain through cards or carry over from the previous phase.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (allDone) {
        if (e.key === 'Enter') onNext();
        return;
      }
      if (e.key === 'Enter') {
        advance();
        return;
      }
      const n = Number(e.key);
      if (challenge && n >= 1 && n <= challenge.options.length) pick(challenge.options[n - 1]);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const chainStates: LinkState[] = collocations.map((_, i) =>
    results[i] === 'clean' ? 'forged'
      : results[i] === 'retry' ? 'cracked'
        : i === cardIndex && !allDone ? 'current'
          : 'pending'
  );

  if (!session) {
    return (
      <div className="mt-4 rv-glass rounded-[2rem] flex items-center justify-center" style={CARD_STYLE}>
        <motion.span
          className="text-[10px] uppercase tracking-[0.25em] font-bold text-zinc-600"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        >
          🔗 Heating the forge…
        </motion.span>
      </div>
    );
  }

  if (total === 0) {
    return (
      <motion.div
        key={`col-${currentIndex}`}
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -60 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="mt-4"
      >
        <div className="rv-glass rounded-[2rem] p-8 text-center space-y-5">
          <p className="text-zinc-500 text-sm">No collocations saved for this word yet.</p>
          <button onClick={onNext} className="rv-btn-mint">
            Continue <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      key={`col-${currentIndex}`}
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="mt-4"
    >
      <div className="rv-glass rounded-[2rem] overflow-hidden flex flex-col" style={CARD_STYLE}>
        {/* ── HUD: badge · combo · XP ────────────────────────────────── */}
        <div className="shrink-0 px-6 pt-5 flex items-center gap-2">
          <span
            className="text-[9px] uppercase tracking-[0.25em] font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
            style={{ background: 'rgba(0,255,200,0.07)', color: '#00FFC8', border: '1px solid rgba(0,255,200,0.15)' }}
          >
            🔗 {mode === 'repair' ? 'Repair Round' : 'Collocation Forge'}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <AnimatePresence>
              {combo >= 2 && (
                <motion.span
                  key={combo}
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.4, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-black"
                  style={{ background: 'rgba(251,146,60,0.15)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.35)' }}
                >
                  <Flame className="h-3 w-3" /> x{combo}
                </motion.span>
              )}
            </AnimatePresence>
            <span
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black tabular-nums"
              style={{ background: 'rgba(250,204,21,0.1)', color: '#facc15', border: '1px solid rgba(250,204,21,0.25)' }}
            >
              <Zap className="h-3 w-3" />
              <motion.span key={xp} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>{xp}</motion.span> XP
            </span>
          </div>
        </div>

        {/* ── Word + chain ───────────────────────────────────────────── */}
        <div className="shrink-0 px-6 pt-4 text-center">
          <motion.h2
            initial={{ opacity: 0, scale: 0.82, filter: 'blur(8px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ type: 'spring', stiffness: 180, damping: 18, delay: 0.06 }}
            className="font-bold leading-none select-none"
            style={{
              fontSize: 'clamp(1.9rem, 6vw, 2.6rem)',
              color: '#00FFC8',
              fontFamily: "'Space Grotesk', sans-serif",
              textShadow: '0 0 32px rgba(0,255,200,0.25)',
              letterSpacing: '-0.01em',
            }}
          >
            {targetWord}
          </motion.h2>
          <div className="mt-4">
            <Chain states={chainStates} />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {allDone ? (
            /* ── Results ─────────────────────────────────────────────── */
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1 min-h-0 flex flex-col px-6 pt-5 pb-6"
            >
              <p
                className="text-center text-lg font-bold"
                style={{ color: '#00FFC8', fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {mode === 'repair' ? 'Weak links repaired! 🔧' : 'Chain forged! ⛓️'}
              </p>
              {restingCount > 0 && (
                <p className="text-center text-[11px] text-zinc-500 mt-1">
                  {restingCount} more phrase{restingCount > 1 ? 's' : ''} rotate in on your next reviews
                </p>
              )}

              <div className="grid grid-cols-3 gap-2 mt-4">
                {[
                  { label: 'XP earned', value: xp, color: '#facc15' },
                  {
                    label: 'First try',
                    value: `${Math.round((results.filter(r => r === 'clean').length / total) * 100)}%`,
                    color: '#00FFC8',
                  },
                  { label: 'Best combo', value: `x${bestCombo}`, color: '#fb923c' },
                ].map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.08 }}
                    className="rounded-2xl py-2.5 text-center"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <p className="text-xl font-black tabular-nums" style={{ color: s.color, fontFamily: "'Space Grotesk', sans-serif" }}>
                      {s.value}
                    </p>
                    <p className="text-[9px] uppercase tracking-widest text-zinc-500 mt-0.5">{s.label}</p>
                  </motion.div>
                ))}
              </div>

              {/* Wrapped pills instead of rows so every phrase fits without scrolling */}
              <div className="flex-1 min-h-0 overflow-hidden mt-4 flex flex-wrap content-start justify-center gap-1.5">
                {collocations.map((col, i) => {
                  const retry = results[i] === 'retry';
                  const fixed = !retry && wasStruggling.has(col.id);
                  return (
                    <motion.span
                      key={col.id}
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 + i * 0.05, type: 'spring', stiffness: 400, damping: 22 }}
                      title={retry ? 'Needed a retry — worth another look' : undefined}
                      className="inline-flex items-center gap-1.5 rounded-full pl-2 pr-3 py-1 text-[13px] font-semibold text-white max-w-full"
                      style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        background: retry ? 'rgba(251,191,36,0.06)' : 'rgba(0,255,200,0.05)',
                        border: `1px solid ${retry ? 'rgba(251,191,36,0.3)' : 'rgba(0,255,200,0.15)'}`,
                      }}
                    >
                      {retry
                        ? <RotateCcw className="h-3 w-3 shrink-0 text-amber-400" />
                        : <Check className="h-3 w-3 shrink-0 text-[#00FFC8]" />}
                      <span className="truncate">{highlightWord(col.collocation, targetWord)}</span>
                      {fixed && <span className="shrink-0 text-[10px] font-bold text-[#00FFC8]">fixed ✨</span>}
                    </motion.span>
                  );
                })}
              </div>

              <button onClick={onNext} className="rv-btn-mint mt-4 shrink-0">
                Let's Write <ArrowRight className="h-4 w-4" />
                <kbd className="hidden sm:inline-flex items-center justify-center h-5 px-1 rounded-md text-[10px]" style={{ background: 'rgba(0,0,0,0.12)' }}>↵</kbd>
              </button>
            </motion.div>
          ) : (
            /* ── Active challenge ────────────────────────────────────── */
            <motion.div
              key={cardIndex}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1 min-h-0 flex flex-col px-6 pt-4 pb-6"
            >
              <LayoutGroup id={`forge-${cardIndex}`}>
                {/* Phrase with the blank */}
                <div className="relative flex-1 min-h-0 flex flex-col items-center justify-center text-center">
                  {wasStruggling.has(current.id) && (
                    <span
                      className="mb-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}
                    >
                      <RotateCcw className="h-2.5 w-2.5" /> Missed last time
                    </span>
                  )}
                  <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-3">
                    {challenge ? 'Which word completes it?' : 'Read it in'}
                  </p>
                  <p className="text-2xl lg:text-[1.7rem] font-bold leading-snug" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {challenge
                      ? challenge.tokens.map((tok, i) => {
                          const spacer = i < challenge.tokens.length - 1 ? ' ' : '';
                          if (i !== challenge.blankIndex) {
                            return (
                              <span key={i}>
                                {isTargetToken(tok, targetWord)
                                  ? <span style={{ color: '#00FFC8' }}>{tok}</span>
                                  : <span className="text-zinc-200">{tok}</span>}
                                {spacer}
                              </span>
                            );
                          }
                          return (
                            <span key={i}>
                              {isSolved ? (
                                <motion.span
                                  layoutId="answer-chip"
                                  className="inline-block px-2 rounded-lg"
                                  style={{ background: 'rgba(0,255,200,0.15)', color: '#fff', boxShadow: '0 0 18px rgba(0,255,200,0.3)' }}
                                  transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                                >
                                  {challenge.answer}
                                </motion.span>
                              ) : (
                                <span
                                  className="inline-block align-baseline rounded-lg"
                                  style={{
                                    minWidth: `${Math.max(3, challenge.answer.length) * 0.6}em`,
                                    borderBottom: '3px dashed rgba(255,255,255,0.3)',
                                    background: 'rgba(255,255,255,0.03)',
                                  }}
                                >
                                  &nbsp;
                                </span>
                              )}
                              {spacer}
                            </span>
                          );
                        })
                      : highlightWord(current.collocation, targetWord)}
                  </p>

                  {/* XP pop */}
                  <AnimatePresence>
                    {lastGain > 0 && (
                      <motion.p
                        key={`gain-${cardIndex}`}
                        initial={{ opacity: 0, y: 10, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 16, delay: 0.2 }}
                        className="mt-4 text-sm font-black"
                        style={{ color: '#facc15' }}
                      >
                        +{lastGain} XP
                        {combo >= 2 && <span className="ml-2 text-[#fb923c]">🔥 combo x{combo}</span>}
                        {wrongPicks.length > 0 && <span className="ml-2 text-amber-400/80 font-semibold">· link cracked</span>}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Options / next */}
                <div className="shrink-0">
                  {challenge && (
                    <div className="grid grid-cols-2 gap-2.5">
                      {challenge.options.map((opt, i) => {
                        const isWrong = wrongPicks.includes(opt);
                        const isAnswer = opt === challenge.answer;
                        if (isSolved && isAnswer) {
                          // Placeholder keeps the grid from jumping while the chip flies into the blank
                          return <div key={opt} className="h-12 rounded-2xl" style={{ border: '1px dashed rgba(0,255,200,0.2)' }} />;
                        }
                        return (
                          <motion.button
                            key={opt}
                            layoutId={isAnswer ? 'answer-chip' : undefined}
                            onClick={() => pick(opt)}
                            disabled={isSolved || isWrong}
                            animate={isWrong ? { x: [0, -7, 7, -5, 5, 0] } : { x: 0 }}
                            transition={{ duration: 0.35 }}
                            whileHover={!isSolved && !isWrong ? { scale: 1.03, y: -1 } : undefined}
                            whileTap={!isSolved && !isWrong ? { scale: 0.96 } : undefined}
                            className="relative h-12 rounded-2xl px-4 flex items-center justify-center text-[15px] font-bold transition-colors"
                            style={{
                              fontFamily: "'Space Grotesk', sans-serif",
                              background: isWrong ? 'rgba(244,63,94,0.08)' : 'rgba(255,255,255,0.05)',
                              border: `1px solid ${isWrong ? 'rgba(244,63,94,0.35)' : 'rgba(255,255,255,0.1)'}`,
                              color: isWrong ? 'rgba(251,113,133,0.6)' : isSolved ? '#52525b' : '#fff',
                              textDecoration: isWrong ? 'line-through' : 'none',
                            }}
                          >
                            <kbd
                              className="absolute left-3 hidden sm:flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-semibold"
                              style={{ background: 'rgba(255,255,255,0.06)', color: '#71717a' }}
                            >
                              {i + 1}
                            </kbd>
                            {opt}
                          </motion.button>
                        );
                      })}
                    </div>
                  )}

                  <div className="h-12 mt-3">
                    <AnimatePresence>
                      {isSolved && (
                        <motion.button
                          key="next"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: challenge ? 0.25 : 0.1, duration: 0.22 }}
                          onClick={advance}
                          className="rv-btn-mint h-12"
                          style={{ padding: 0 }}
                        >
                          {isLast ? 'Finish the chain' : 'Next link'} <ArrowRight className="h-4 w-4" />
                          <kbd className="hidden sm:inline-flex items-center justify-center h-5 px-1 rounded-md text-[10px]" style={{ background: 'rgba(0,0,0,0.12)' }}>↵</kbd>
                        </motion.button>
                      )}
                      {!isSolved && (
                        <motion.button
                          key="skip"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          onClick={onNext}
                          className="w-full h-12 text-center text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                        >
                          Skip to Generation Lab →
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </LayoutGroup>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
