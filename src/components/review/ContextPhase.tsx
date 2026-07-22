import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { DueWordItem, WordContext } from './types';

const WIN_PHRASES = ['In context. Owned.', 'Nailed it.', 'Sharp recall.', 'Perfect.', 'Locked in.'];
const LOSS_PHRASES = ['Not quite.', 'Read it again.', 'Study the context.', 'Almost.'];

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
  clozeContext: WordContext | null;
  clozeLoading: boolean;
  clozeAnswer: string;
  clozeSubmitted: boolean;
  onClozeAnswerChange: (value: string) => void;
  onClozeSubmit: () => void;
  onClozeNext: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────
function maskTargetWord(sentence: string, word: string): string {
  const w = word.toLowerCase().trim();
  if (!/^[a-z]+$/.test(w)) {
    const escaped = w.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
    return sentence.replace(new RegExp(escaped, 'gi'), '______');
  }
  const stems = [w];
  if (w.endsWith('e')) stems.push(w.slice(0, -1));
  if (w.endsWith('y')) stems.push(w.slice(0, -1) + 'i');
  return sentence.replace(/[A-Za-z]+/g, token => {
    const t = token.toLowerCase();
    return stems.some(s => t.startsWith(s) && t.length - s.length <= 4) ? '______' : token;
  });
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// ── Goal Net Visualization ──────────────────────────────────────

/**
 * FIFA Penalty Kick Goal Net
 *
 * A soccer goal with a hexagonal net pattern. Each of the last 5 attempts
 * is shown as a colored circle positioned within the goal area:
 * - Green circle  = correct (scored penalty)
 * - Red circle    = misspelled (saved/missed penalty)
 * - Gray circle   = empty slot (not yet taken)
 *
 * Circles are positioned pseudo-randomly within the goal net so they
 * don't overlap, mimicking real penalty kick placement scatter.
 */
function GoalNet({
  attempts,
  repeatedMistakes,
}: {
  attempts: SpellingAttempt[];
  repeatedMistakes: Record<string, number>;
}) {
  const MAX_SLOTS = 5;

  // Pre-defined positions within the goal net (percent-based: left%, top%)
  // These spread the 5 kicks across the goal area without overlap
  const POSITIONS = [
    { left: 18, top: 22 },   // upper left
    { left: 50, top: 18 },   // upper center
    { left: 78, top: 30 },   // upper right
    { left: 32, top: 62 },   // lower left
    { left: 65, top: 55 },   // lower right
  ];

  const slots = Array.from({ length: MAX_SLOTS }, (_, i) => attempts[i] || null);
  const scoredCount = slots.filter(a => a?.wasCorrect).length;
  const missedCount = slots.filter(a => a && !a.wasCorrect).length;
  const emptyCount = MAX_SLOTS - scoredCount - missedCount;
  const repeatedWords = Object.entries(repeatedMistakes).filter(([_, count]) => count >= 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="mt-6 select-none"
    >
      {/* ── Goal Frame + Net ─────────────────────────────────────── */}
      <div className="relative mx-auto" style={{ maxWidth: 320 }}>
        {/* Goal posts (white frame) */}
        <div
          className="relative rounded-t-lg overflow-hidden"
          style={{
            border: '3px solid rgba(255,255,255,0.85)',
            borderBottom: 'none',
            aspectRatio: '2 / 1.3',
            background: 'rgba(20,20,25,0.6)',
          }}
        >
          {/* Hexagonal net pattern */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='24' viewBox='0 0 14 24'%3E%3Cpath d='M7 0L14 4v8L7 16 0 12V4z' fill='none' stroke='rgba(255,255,255,0.12)' stroke-width='0.8'/%3E%3C/svg%3E")
              `,
              backgroundSize: '14px 24px',
              opacity: 0.7,
            }}
          />

          {/* Kick circles positioned in the net */}
          {slots.map((attempt, index) => {
            const pos = POSITIONS[index];
            const isFilled = attempt !== null;
            const isMiss = isFilled && !attempt.wasCorrect;
            const isRepeated = isMiss && repeatedMistakes[attempt.word.toLowerCase()] >= 2;

            return (
              <div
                key={isFilled ? attempt.id : `slot-${index}`}
                className="absolute"
                style={{
                  left: `${pos.left}%`,
                  top: `${pos.top}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <AnimatePresence>
                  {isFilled ? (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{
                        type: 'spring',
                        stiffness: 400,
                        damping: 18,
                        delay: index * 0.08,
                      }}
                      className="relative"
                    >
                      {/* Outer ring */}
                      <div
                        className={`
                          w-8 h-8 rounded-full flex items-center justify-center
                          ${attempt.wasCorrect
                            ? 'bg-emerald-500/20 border-2 border-emerald-400'
                            : isRepeated
                              ? 'bg-rose-500/25 border-2 border-rose-400 shadow-[0_0_14px_rgba(244,63,94,0.45)]'
                              : 'bg-rose-500/15 border-2 border-rose-400/70'
                          }
                        `}
                      >
                        {/* Inner solid circle */}
                        <div
                          className={`
                            w-4 h-4 rounded-full
                            ${attempt.wasCorrect
                              ? 'bg-emerald-400'
                              : isRepeated
                                ? 'bg-rose-400'
                                : 'bg-rose-400/80'
                            }
                          `}
                        />
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="w-8 h-8 rounded-full border-2 border-white/10 bg-white/[0.03] flex items-center justify-center"
                    >
                      <div className="w-3.5 h-3.5 rounded-full bg-white/[0.06]" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Ground line */}
        <div
          className="h-2 rounded-b-full mx-auto"
          style={{
            width: '110%',
            marginLeft: '-5%',
            background: 'linear-gradient(to bottom, rgba(16,185,129,0.35), rgba(16,185,129,0.1))',
          }}
        />
      </div>

      {/* ── Legend / Stats Row ───────────────────────────────────── */}
      <div className="flex items-center justify-center gap-8 mt-5">
        {/* Scored */}
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-lg font-bold text-emerald-400 tabular-nums">{scoredCount}</span>
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-emerald-400" />
          </div>
          <span className="text-[10px] text-emerald-400/70 uppercase tracking-wider font-medium">
            Correct
          </span>
        </div>

        {/* Missed (saved) */}
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-lg font-bold text-rose-400 tabular-nums">{missedCount}</span>
          <div className="w-6 h-6 rounded-full bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-rose-400" />
          </div>
          <span className="text-[10px] text-rose-400/70 uppercase tracking-wider font-medium">
            Misspelled
          </span>
        </div>

        {/* Empty / Remaining */}
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-lg font-bold text-white/25 tabular-nums">{emptyCount}</span>
          <div className="w-6 h-6 rounded-full border-2 border-white/10 bg-white/[0.03] flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-white/[0.06]" />
          </div>
          <span className="text-[10px] text-white/25 uppercase tracking-wider font-medium">
            Remaining
          </span>
        </div>
      </div>

      {/* ── Recurring Misses Alert ───────────────────────────────── */}
      <AnimatePresence>
        {repeatedWords.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="mt-5 overflow-hidden"
          >
            <div className="rounded-xl p-3.5 bg-rose-500/[0.05] border border-rose-500/15">
              <div className="flex items-start gap-2.5">
                <RotateCcw className="h-3.5 w-3.5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-rose-400/80 uppercase tracking-wider">
                    Recurring Misses
                  </p>
                  {repeatedWords.map(([word, count]) => (
                    <p key={word} className="text-[11px] text-rose-300/60">
                      "<span className="font-semibold text-rose-300/80">{word}</span>" — missed{' '}
                      <span className="font-bold text-rose-400">{count}</span> times
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────
export function ContextPhase({
  currentItem, currentIndex, clozeContext, clozeLoading,
  clozeAnswer, clozeSubmitted, onClozeAnswerChange, onClozeSubmit, onClozeNext,
}: ContextPhaseProps) {
  const [winPhrase] = useState(() => WIN_PHRASES[Math.floor(Math.random() * WIN_PHRASES.length)]);
  const [lossPhrase] = useState(() => LOSS_PHRASES[Math.floor(Math.random() * LOSS_PHRASES.length)]);

  // FIFA Penalty Kick History State
  const [attemptHistory, setAttemptHistory] = useState<SpellingAttempt[]>([]);
  const [repeatedMistakes, setRepeatedMistakes] = useState<Record<string, number>>({});

  const clozeSentence = clozeContext
    ? maskTargetWord(clozeContext.sentence, currentItem.word.word)
    : undefined;
  const isClozeCorrect = clozeAnswer.toLowerCase().trim() === currentItem.word.word.toLowerCase();

  // Track attempt when submitted
  useEffect(() => {
    if (clozeSubmitted) {
      const newAttempt: SpellingAttempt = {
        id: generateId(),
        word: currentItem.word.word,
        userAnswer: clozeAnswer,
        wasCorrect: isClozeCorrect,
        timestamp: Date.now(),
      };

      // Keep only last 5 (FIFO — newest first)
      setAttemptHistory(prev => [newAttempt, ...prev].slice(0, 5));

      // Track repeated mistakes
      if (!isClozeCorrect) {
        setRepeatedMistakes(prev => ({
          ...prev,
          [currentItem.word.word.toLowerCase()]: (prev[currentItem.word.word.toLowerCase()] || 0) + 1,
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clozeSubmitted]);

  return (
    <motion.div
      key={`context-${currentIndex}`}
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="mt-4"
    >
      <div
        className="rv-glass rounded-[2rem] overflow-hidden"
        style={{
          borderColor: clozeSubmitted
            ? isClozeCorrect ? 'rgba(0,255,200,0.45)' : 'rgba(239,68,68,0.45)'
            : 'rgba(255,255,255,0.07)',
          transition: 'border-color 0.45s ease',
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="px-8 pt-7">
          <span
            className="text-[9px] uppercase tracking-[0.25em] font-bold px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(56,189,248,0.07)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.15)' }}
          >
            📖 Context Theater
          </span>
        </div>

        {/* ── Word — spring blur-in ───────────────────────────────────── */}
        <div className="px-8 pt-5 pb-5 text-center">
          <motion.h2
            initial={{ opacity: 0, scale: 0.82, filter: 'blur(8px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ type: 'spring', stiffness: 180, damping: 18, delay: 0.06 }}
            className="font-bold leading-none select-none"
            style={{
              fontSize: 'clamp(2.6rem, 8vw, 4rem)',
              color: '#38bdf8',
              fontFamily: "'Space Grotesk', sans-serif",
              textShadow: '0 0 40px rgba(56,189,248,0.28)',
              letterSpacing: '-0.01em',
            }}
          >
            {currentItem.word.word}
          </motion.h2>
        </div>

        {/* Hairline */}
        <div className="mx-8 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

        {/* ── Content ────────────────────────────────────────────────── */}
        <div className="px-8 pt-6 pb-8">
          {clozeLoading ? (
            <div className="space-y-3 py-2">
              <Skeleton className="h-4 w-full rounded-lg bg-zinc-800/60" />
              <Skeleton className="h-4 w-4/5 rounded-lg bg-zinc-800/60" />
              <Skeleton className="h-4 w-3/5 rounded-lg bg-zinc-800/60" />
            </div>
          ) : clozeSentence ? (
            <>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14, duration: 0.28 }}
                className="text-zinc-300 text-base leading-relaxed mb-6 p-5 rounded-2xl italic"
                style={{ background: 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.1)' }}
              >
                "{clozeSentence}"
              </motion.p>

              {!clozeSubmitted ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.22, duration: 0.24 }}
                  className="space-y-3"
                >
                  <input
                    className="rv-input"
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
                    className="rv-btn-mint"
                  >
                    Check
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    x: isClozeCorrect ? 0 : [0, -9, 9, -7, 7, -4, 4, 0],
                  }}
                  transition={{
                    opacity: { duration: 0.22 },
                    scale: { duration: 0.22 },
                    x: isClozeCorrect ? {} : { duration: 0.45, ease: 'easeInOut' },
                  }}
                  className="space-y-4"
                >
                  <div className="text-center mb-2">
                    <motion.div
                      initial={{ scale: 0.35, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 280, damping: 16, delay: 0.04 }}
                      className="inline-block mb-2"
                    >
                      {isClozeCorrect
                        ? <CheckCircle2 className="h-12 w-12 mx-auto" style={{ color: '#00FFC8' }} />
                        : <XCircle className="h-12 w-12 mx-auto" style={{ color: '#ef4444' }} />
                      }
                    </motion.div>
                    <motion.p
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.14, duration: 0.2 }}
                      className="text-xl font-bold"
                      style={{ color: isClozeCorrect ? '#00FFC8' : '#ef4444', fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {isClozeCorrect ? winPhrase : lossPhrase}
                    </motion.p>
                  </div>

                  {!isClozeCorrect && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.22, duration: 0.22 }}
                      className="rounded-2xl p-4 space-y-3"
                      style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.14)' }}
                    >
                      <div>
                        <p className="text-[9px] uppercase tracking-widest text-zinc-600 mb-1">Your answer</p>
                        <p className="text-sm line-through font-medium" style={{ color: '#ef4444' }}>{clozeAnswer}</p>
                      </div>
                      <div className="h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
                      <div>
                        <p className="text-[9px] uppercase tracking-widest text-zinc-600 mb-1">The word</p>
                        <p className="text-sm font-semibold" style={{ color: '#00FFC8' }}>{currentItem.word.word}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{currentItem.word.definition}</p>
                      </div>
                    </motion.div>
                  )}

                  <motion.button
                    onClick={onClozeNext}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: isClozeCorrect ? 0.2 : 0.46, duration: 0.22 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="rv-btn-mint"
                  >
                    Continue
                  </motion.button>
                </motion.div>
              )}

              {/* ── FIFA Goal Net ───────────────────────────────────────── */}
              <GoalNet
                attempts={attemptHistory}
                repeatedMistakes={repeatedMistakes}
              />
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 }}
              className="text-center py-6 space-y-4"
            >
              <p className="text-zinc-500 text-sm">No context sentence available for this word.</p>
              <button onClick={onClozeNext} className="rv-btn-mint">Continue</button>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}