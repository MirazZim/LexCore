import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { DueWordItem, WordContext } from './types';

const WIN_PHRASES  = ['In context. Owned.', 'Nailed it.', 'Sharp recall.', 'Perfect.', 'Locked in.'];
const LOSS_PHRASES = ['Not quite.', 'Read it again.', 'Study the context.', 'Almost.'];

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

// Mask every token that looks like a form of the target word so inflections
// ("making" for make, "flies" for fly) can't leak the answer. Over-masking a
// neighbouring word is acceptable; showing the answer is not.
function maskTargetWord(sentence: string, word: string): string {
  const w = word.toLowerCase().trim();
  if (!/^[a-z]+$/.test(w)) {
    // Phrase or hyphenated entry: exact (escaped) match only.
    const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return sentence.replace(new RegExp(escaped, 'gi'), '______');
  }
  const stems = [w];
  if (w.endsWith('e')) stems.push(w.slice(0, -1));       // make → making
  if (w.endsWith('y')) stems.push(w.slice(0, -1) + 'i'); // fly → flies
  return sentence.replace(/[A-Za-z]+/g, token => {
    const t = token.toLowerCase();
    return stems.some(s => t.startsWith(s) && t.length - s.length <= 4) ? '______' : token;
  });
}

export function ContextPhase({
  currentItem, currentIndex, clozeContext, clozeLoading,
  clozeAnswer, clozeSubmitted, onClozeAnswerChange, onClozeSubmit, onClozeNext,
}: ContextPhaseProps) {
  const [winPhrase]  = useState(() => WIN_PHRASES[Math.floor(Math.random()  * WIN_PHRASES.length)]);
  const [lossPhrase] = useState(() => LOSS_PHRASES[Math.floor(Math.random() * LOSS_PHRASES.length)]);

  const clozeSentence = clozeContext
    ? maskTargetWord(clozeContext.sentence, currentItem.word.word)
    : undefined;
  const isClozeCorrect = clozeAnswer.toLowerCase().trim() === currentItem.word.word.toLowerCase();

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
                    scale:   { duration: 0.22 },
                    x:       isClozeCorrect ? {} : { duration: 0.45, ease: 'easeInOut' },
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
                        : <XCircle     className="h-12 w-12 mx-auto" style={{ color: '#ef4444' }} />
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
