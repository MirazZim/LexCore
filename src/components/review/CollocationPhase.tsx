import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import type { DueWordItem, WordCollocation } from './types';

const WIN_PHRASES  = ['Nailed it.', 'Natural.', 'Sharp.', 'Locked in.', 'Crisp.'];
const LOSS_PHRASES = ['Not quite.', 'Study the phrase.', 'Almost.', 'Try again.'];

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

interface CollocationPhaseProps {
  currentItem: DueWordItem;
  currentIndex: number;
  collocations: WordCollocation[];
  onNext: () => void;
}

export function CollocationPhase({
  currentItem, currentIndex, collocations, onNext,
}: CollocationPhaseProps) {
  const [cardIndex, setCardIndex] = useState(0);
  const [allDone, setAllDone] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [answered, setAnswered] = useState<string | null>(null);

  // Pick phrases once per component mount
  const [winPhrase]  = useState(() => WIN_PHRASES[Math.floor(Math.random()  * WIN_PHRASES.length)]);
  const [lossPhrase] = useState(() => LOSS_PHRASES[Math.floor(Math.random() * LOSS_PHRASES.length)]);

  const targetWord = currentItem.word.word;
  const total = collocations.length;
  const current = collocations[cardIndex];
  const reviewed = allDone ? collocations : collocations.slice(0, cardIndex);
  const isLast = cardIndex === total - 1;

  const targetRegex = useMemo(
    () => new RegExp(`^${escapeRegex(targetWord)}$`, 'i'),
    [targetWord],
  );

  const blankPhrase = useMemo(
    () => current.collocation.replace(new RegExp(`\\b${escapeRegex(targetWord)}\\b`, 'gi'), '______'),
    [current.collocation, targetWord],
  );

  const hasBlank = blankPhrase !== current.collocation;
  const isCorrect = answered !== null && targetRegex.test(answered.trim());

  const submit = () => {
    if (!inputValue.trim()) return;
    setAnswered(inputValue);
  };

  const advance = () => {
    setAnswered(null);
    setInputValue('');
    if (isLast) setAllDone(true);
    else setCardIndex(i => i + 1);
  };

  // Enter-to-advance after answer is shown
  useEffect(() => {
    if (answered === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      setAnswered(null);
      setInputValue('');
      if (isLast) setAllDone(true);
      else setCardIndex(i => i + 1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [answered, isLast]);

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
      className="mt-4 space-y-3"
    >
      {/* ── Header card — persistent word ──────────────────────────── */}
      <div className="rv-glass rounded-[2rem] px-8 py-6">
        <div className="mb-4">
          <span
            className="text-[9px] uppercase tracking-[0.25em] font-bold px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(0,255,200,0.07)', color: '#00FFC8', border: '1px solid rgba(0,255,200,0.15)' }}
          >
            🔗 Collocation Workshop
          </span>
        </div>
        <motion.h2
          initial={{ opacity: 0, scale: 0.82, filter: 'blur(8px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ type: 'spring', stiffness: 180, damping: 18, delay: 0.06 }}
          className="font-bold leading-none select-none"
          style={{
            fontSize: 'clamp(2.2rem, 7vw, 3.2rem)',
            color: '#00FFC8',
            fontFamily: "'Space Grotesk', sans-serif",
            textShadow: '0 0 32px rgba(0,255,200,0.25)',
            letterSpacing: '-0.01em',
          }}
        >
          {currentItem.word.word}
        </motion.h2>
        <p className="text-zinc-500 text-xs mt-2">Fill in the missing word to complete each phrase.</p>
      </div>

      {/* ── All-done summary ───────────────────────────────────────── */}
      <AnimatePresence>
        {allDone && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="rv-glass rounded-[2rem] p-7 space-y-4"
            style={{ border: '1px solid rgba(0,255,200,0.25)' }}
          >
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-1">Quick Review</p>
              <p className="text-sm text-zinc-400">
                All collocations for <span className="text-white font-semibold">{currentItem.word.word}</span> — scan them once before writing.
              </p>
            </div>
            <div className="space-y-2">
              {collocations.map((col, i) => (
                <motion.div
                  key={col.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.22 }}
                  className="flex items-center gap-3 rounded-xl px-4 py-3"
                  style={{ background: 'rgba(0,255,200,0.04)', border: '1px solid rgba(0,255,200,0.1)' }}
                >
                  <span className="text-[9px] font-bold text-zinc-600 w-4 shrink-0">#{i + 1}</span>
                  <span className="text-sm font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {highlightWord(col.collocation, currentItem.word.word)}
                  </span>
                </motion.div>
              ))}
            </div>
            <button onClick={onNext} autoFocus className="rv-btn-mint">
              Let's Write <ArrowRight className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Active card stack ──────────────────────────────────────── */}
      {!allDone && (
        <>
          {/* Reviewed stack */}
          <AnimatePresence>
            {reviewed.map((col, i) => {
              const age = reviewed.length - 1 - i;
              return (
                <motion.div
                  key={col.id}
                  initial={{ opacity: 0, y: 16, scale: 0.96 }}
                  animate={{ opacity: Math.max(0.35, 1 - age * 0.18), y: 0, scale: Math.max(0.93, 1 - age * 0.025) }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="rounded-2xl px-5 py-3 flex items-center justify-between"
                  style={{ background: 'rgba(0,255,200,0.04)', border: '1px solid rgba(0,255,200,0.12)', transformOrigin: 'center top' }}
                >
                  <span className="text-sm font-semibold text-zinc-300" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {highlightWord(col.collocation, currentItem.word.word)}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 ml-4 shrink-0">#{i + 1}</span>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Active card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={cardIndex}
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="rv-glass rounded-[2rem] p-7 space-y-5"
              style={{ border: '1px solid rgba(0,255,200,0.2)' }}
            >
              {/* Progress dots */}
              <div className="flex items-center gap-1.5">
                {collocations.map((_, i) => (
                  <span
                    key={i}
                    className="rounded-full transition-all duration-300"
                    style={{
                      width: i === cardIndex ? 20 : 6,
                      height: 6,
                      background: i < cardIndex ? 'rgba(0,255,200,0.35)' : i === cardIndex ? '#00FFC8' : 'rgba(255,255,255,0.1)',
                    }}
                  />
                ))}
                <span className="ml-auto text-[10px] font-bold text-zinc-600">{cardIndex + 1} / {total}</span>
              </div>

              {hasBlank ? (
                <>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-3">Complete the phrase</p>
                    <p className="text-2xl font-bold text-white leading-snug" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {answered ? highlightWord(current.collocation, targetWord) : blankPhrase}
                    </p>
                  </div>

                  {!answered ? (
                    <div className="space-y-3">
                      <input
                        className="rv-input"
                        placeholder="Type the missing word…"
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        onKeyUp={e => e.key === 'Enter' && submit()}
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        autoFocus
                      />
                      <button onClick={submit} disabled={!inputValue.trim()} className="rv-btn-mint">
                        Check
                      </button>
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                        x: isCorrect ? 0 : [0, -9, 9, -7, 7, -4, 4, 0],
                      }}
                      transition={{
                        opacity: { duration: 0.22 },
                        scale:   { duration: 0.22 },
                        x:       isCorrect ? {} : { duration: 0.45, ease: 'easeInOut' },
                      }}
                      className="space-y-4"
                    >
                      <div className="text-center">
                        <motion.div
                          initial={{ scale: 0.35, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: 'spring', stiffness: 280, damping: 16, delay: 0.04 }}
                          className="inline-block mb-2"
                        >
                          {isCorrect
                            ? <CheckCircle2 className="h-12 w-12 mx-auto" style={{ color: '#00FFC8' }} />
                            : <XCircle     className="h-12 w-12 mx-auto" style={{ color: '#ef4444' }} />
                          }
                        </motion.div>
                        <motion.p
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.14, duration: 0.2 }}
                          className="text-lg font-bold"
                          style={{ color: isCorrect ? '#00FFC8' : '#ef4444', fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                          {isCorrect ? winPhrase : lossPhrase}
                        </motion.p>
                      </div>

                      {!isCorrect && (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.22, duration: 0.22 }}
                          className="rounded-2xl p-4 space-y-2"
                          style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.14)' }}
                        >
                          <div>
                            <p className="text-[9px] uppercase tracking-widest text-zinc-600 mb-1">Your answer</p>
                            <p className="text-sm line-through font-medium" style={{ color: '#ef4444' }}>{answered}</p>
                          </div>
                          <div className="h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
                          <div>
                            <p className="text-[9px] uppercase tracking-widest text-zinc-600 mb-1">The word</p>
                            <p className="text-sm font-semibold" style={{ color: '#00FFC8' }}>{targetWord}</p>
                          </div>
                        </motion.div>
                      )}

                      <motion.button
                        onClick={advance}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: isCorrect ? 0.2 : 0.46, duration: 0.22 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        className="rv-btn-mint"
                      >
                        {isLast ? <>See all collocations <ArrowRight className="h-4 w-4" /></> : <>Next <ArrowRight className="h-4 w-4" /></>}
                      </motion.button>
                    </motion.div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {highlightWord(current.collocation, targetWord)}
                  </p>
                  <button onClick={advance} autoFocus className="rv-btn-mint">
                    {isLast ? <>See all collocations <ArrowRight className="h-4 w-4" /></> : <>Next <ArrowRight className="h-4 w-4" /></>}
                  </button>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {!isLast && (
            <button
              onClick={onNext}
              className="w-full text-center text-xs text-zinc-600 hover:text-zinc-400 transition-colors pt-1"
            >
              Skip to Generation Lab →
            </button>
          )}
        </>
      )}
    </motion.div>
  );
}
