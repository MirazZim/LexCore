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

// ── FIFA Goal Post Visualization ──────────────────────────────────

/**
 * FIFA Penalty Kick Goal Post
 *
 * Visual metaphor:
 * - CORRECT   → ball in the net (subtle green dot inside the goal)
 * - MISSPELLED → ball HITS THE CROSSBAR / POST (loud red segment on the bar)
 *
 * The crossbar is divided into 5 segments. Each segment corresponds to
 * one of the last 5 attempts. Misspellings light up the bar in
 * aggressive red. Correct answers are quiet dots inside the net.
 */
function GoalPost({
  attempts,
  repeatedMistakes,
}: {
  attempts: SpellingAttempt[];
  repeatedMistakes: Record<string, number>;
}) {
  const MAX_SLOTS = 5;

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
      {/* ── Goal Structure ─────────────────────────────────────────── */}
      <div className="relative mx-auto" style={{ maxWidth: 340 }}>

        {/* Crossbar + Posts Frame */}
        <div className="relative" style={{ aspectRatio: '2 / 1.15' }}>

          {/* Top Crossbar */}
          <div className="absolute top-0 left-0 right-0 h-3 flex gap-1 px-0.5">
            {slots.map((attempt, index) => {
              const isFilled = attempt !== null;
              const isMiss = isFilled && !attempt.wasCorrect;
              const isRepeated = isMiss && repeatedMistakes[attempt.word.toLowerCase()] >= 2;

              return (
                <motion.div
                  key={isFilled ? attempt.id : `bar-${index}`}
                  className="flex-1 rounded-sm relative overflow-hidden"
                  style={{
                    background: isMiss
                      ? isRepeated
                        ? 'linear-gradient(180deg, #f43f5e 0%, #e11d48 100%)'
                        : 'linear-gradient(180deg, #fb7185 0%, #f43f5e 100%)'
                      : 'rgba(255,255,255,0.08)',
                    boxShadow: isMiss
                      ? isRepeated
                        ? '0 0 20px rgba(244,63,94,0.6), inset 0 1px 0 rgba(255,255,255,0.2)'
                        : '0 0 12px rgba(244,63,94,0.4), inset 0 1px 0 rgba(255,255,255,0.15)'
                      : 'inset 0 1px 0 rgba(255,255,255,0.05)',
                    border: isMiss
                      ? '1px solid rgba(244,63,94,0.5)'
                      : '1px solid rgba(255,255,255,0.06)',
                  }}
                  initial={isFilled ? { scaleY: 0.3, opacity: 0 } : {}}
                  animate={{ scaleY: 1, opacity: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 500,
                    damping: 20,
                    delay: index * 0.06,
                  }}
                >
                  {/* Miss label inside the bar segment */}
                  {isMiss && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + index * 0.06 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <span
                        className="text-[9px] font-bold uppercase tracking-wider truncate px-1"
                        style={{
                          color: isRepeated ? '#fff' : 'rgba(255,255,255,0.9)',
                          textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                        }}
                      >
                        {attempt.word}
                      </span>
                    </motion.div>
                  )}

                  {/* Pulse ring for repeated misses */}
                  {isRepeated && (
                    <motion.div
                      className="absolute inset-0 rounded-sm"
                      style={{ border: '2px solid #f43f5e' }}
                      animate={{ opacity: [0.6, 0, 0.6] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Side Posts */}
          <div
            className="absolute top-3 left-0 w-1.5 h-full rounded-b-sm"
            style={{ background: 'rgba(255,255,255,0.12)' }}
          />
          <div
            className="absolute top-3 right-0 w-1.5 h-full rounded-b-sm"
            style={{ background: 'rgba(255,255,255,0.12)' }}
          />

          {/* Goal Net Area */}
          <div
            className="absolute top-3 left-1.5 right-1.5 bottom-0 rounded-b-sm overflow-hidden"
            style={{
              background: 'rgba(20,20,25,0.5)',
              borderLeft: '1px solid rgba(255,255,255,0.06)',
              borderRight: '1px solid rgba(255,255,255,0.06)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {/* Hexagonal net pattern */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='24' viewBox='0 0 14 24'%3E%3Cpath d='M7 0L14 4v8L7 16 0 12V4z' fill='none' stroke='rgba(255,255,255,0.1)' stroke-width='0.8'/%3E%3C/svg%3E")`,
                backgroundSize: '14px 24px',
                opacity: 0.6,
              }}
            />

            {/* Correct shots — subtle dots in the net */}
            <div className="absolute inset-0 flex items-center justify-center gap-6">
              {slots.map((attempt, index) => {
                if (!attempt?.wasCorrect) return null;
                // Scatter correct dots slightly
                const offsets = [
                  { x: -30, y: -15 },
                  { x: 0, y: -25 },
                  { x: 30, y: -10 },
                  { x: -20, y: 15 },
                  { x: 25, y: 20 },
                ];
                const off = offsets[index] || { x: 0, y: 0 };

                return (
                  <motion.div
                    key={attempt.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 0.5 }}
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 20,
                      delay: 0.2 + index * 0.05,
                    }}
                    className="absolute w-2.5 h-2.5 rounded-full bg-emerald-400"
                    style={{
                      transform: `translate(${off.x}px, ${off.y}px)`,
                      boxShadow: '0 0 8px rgba(52,211,153,0.3)',
                    }}
                  />
                );
              })}
            </div>

            {/* Empty state hint */}
            {slots.every(s => s === null) && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] text-white/10 uppercase tracking-widest">
                  5 attempts
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Ground / Goal Line */}
        <div
          className="h-1.5 mx-auto rounded-full mt-1"
          style={{
            width: '108%',
            marginLeft: '-4%',
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.08), transparent)',
          }}
        />
      </div>

      {/* ── Stats Row ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-10 mt-5">
        {/* Missed — EMPHASIZED */}
        <div className="flex flex-col items-center gap-1.5">
          <motion.span
            key={missedCount}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            className="text-2xl font-black text-rose-500 tabular-nums"
            style={{ textShadow: '0 0 16px rgba(244,63,94,0.35)' }}
          >
            {missedCount}
          </motion.span>
          <div className="w-7 h-2 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]" />
          <span className="text-[10px] text-rose-400/80 uppercase tracking-wider font-bold">
            Missed
          </span>
        </div>

        {/* Correct — subtle */}
        <div className="flex flex-col items-center gap-1.5 opacity-50">
          <span className="text-lg font-semibold text-emerald-400/60 tabular-nums">
            {scoredCount}
          </span>
          <div className="w-2 h-2 rounded-full bg-emerald-400/40" />
          <span className="text-[10px] text-emerald-400/40 uppercase tracking-wider font-medium">
            Scored
          </span>
        </div>

        {/* Empty */}
        <div className="flex flex-col items-center gap-1.5 opacity-30">
          <span className="text-lg font-semibold text-white/20 tabular-nums">
            {emptyCount}
          </span>
          <div className="w-2 h-2 rounded-full bg-white/[0.06]" />
          <span className="text-[10px] text-white/20 uppercase tracking-wider font-medium">
            Left
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
            <div className="rounded-xl p-3.5 bg-rose-500/[0.06] border border-rose-500/20">
              <div className="flex items-start gap-2.5">
                <RotateCcw className="h-3.5 w-3.5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-rose-400/90 uppercase tracking-wider">
                    Recurring Misses
                  </p>
                  {repeatedWords.map(([word, count]) => (
                    <p key={word} className="text-[11px] text-rose-300/70">
                      "<span className="font-semibold text-rose-300">{word}</span>" — missed{' '}
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

  // Penalty Kick History State
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

              {/* ── FIFA Goal Post ──────────────────────────────────────── */}
              <GoalPost
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