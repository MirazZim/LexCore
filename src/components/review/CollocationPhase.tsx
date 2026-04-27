import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
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
    [cardIndex, targetWord],
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

  if (total === 0) {
    return (
      <motion.div
        key={`col-${currentIndex}`}
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -60 }}
        transition={{ duration: 0.3 }}
      >
        <div className="rv-glass rounded-[2rem] p-8 mt-4 text-center space-y-5">
          <p className="text-zinc-500 text-sm">No collocations saved for this word yet.</p>
          <button onClick={onNext} className="rv-btn-mint">
            Continue to Generation Lab
            <ArrowRight className="h-4 w-4" />
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
      transition={{ duration: 0.3 }}
      className="mt-4 space-y-3"
    >
      {/* Header */}
      <div className="rv-glass rounded-[2rem] px-8 py-5">
        <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-0.5">
          Collocation Workshop
        </p>
        <h2
          className="text-3xl font-bold"
          style={{ color: '#00FFC8', fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {currentItem.word.word}
        </h2>
        <p className="text-zinc-500 text-xs mt-1">
          Fill in the missing word to complete each phrase.
        </p>
      </div>

      {/* ── All-done summary screen ── */}
      <AnimatePresence>
        {allDone && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="rv-glass rounded-[2rem] p-7 space-y-4"
            style={{ border: '1px solid rgba(0,255,200,0.25)' }}
          >
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-1">Quick Review</p>
              <p className="text-sm text-zinc-400">All collocations for <span className="text-white font-semibold">{currentItem.word.word}</span> — scan them once before writing.</p>
            </div>
            <div className="space-y-2">
              {collocations.map((col, i) => (
                <div
                  key={col.id}
                  className="flex items-center gap-3 rounded-xl px-4 py-3"
                  style={{ background: 'rgba(0,255,200,0.04)', border: '1px solid rgba(0,255,200,0.1)' }}
                >
                  <span className="text-[9px] font-bold text-zinc-600 w-4 shrink-0">#{i + 1}</span>
                  <span className="text-sm font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {highlightWord(col.collocation, currentItem.word.word)}
                  </span>
                </div>
              ))}
            </div>
            <button onClick={onNext} className="rv-btn-mint">
              Let's Write <ArrowRight className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stack + active card */}
      {!allDone && (
        <>
          {/* Stack of reviewed cards */}
          <AnimatePresence>
            {reviewed.map((col, i) => {
              const age = reviewed.length - 1 - i;
              const opacity = Math.max(0.35, 1 - age * 0.18);
              const scale = Math.max(0.93, 1 - age * 0.025);
              return (
                <motion.div
                  key={col.id}
                  initial={{ opacity: 0, y: 16, scale: 0.96 }}
                  animate={{ opacity, y: 0, scale }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="rounded-2xl px-5 py-3 flex items-center justify-between"
                  style={{
                    background: 'rgba(0,255,200,0.04)',
                    border: '1px solid rgba(0,255,200,0.12)',
                    transformOrigin: 'center top',
                  }}
                >
                  <span className="text-sm font-semibold text-zinc-300" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {highlightWord(col.collocation, currentItem.word.word)}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 ml-4 shrink-0">
                    #{i + 1}
                  </span>
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
                      background: i < cardIndex
                        ? 'rgba(0,255,200,0.35)'
                        : i === cardIndex
                        ? '#00FFC8'
                        : 'rgba(255,255,255,0.1)',
                    }}
                  />
                ))}
                <span className="ml-auto text-[10px] font-bold text-zinc-600">
                  {cardIndex + 1} / {total}
                </span>
              </div>

              {hasBlank ? (
                <>
                  {/* Phrase: blank while unanswered, revealed after */}
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-3">
                      Complete the phrase
                    </p>
                    <p
                      className="text-2xl font-bold text-white leading-snug"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {answered
                        ? highlightWord(current.collocation, targetWord)
                        : blankPhrase}
                    </p>
                  </div>

                  {/* Input */}
                  {!answered ? (
                    <div className="space-y-3">
                      <input
                        className="rv-input"
                        placeholder="Type the missing word…"
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && submit()}
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                      />
                      <button
                        onClick={submit}
                        disabled={!inputValue.trim()}
                        className="rv-btn-mint"
                      >
                        Check
                      </button>
                    </div>
                  ) : (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                      <div
                        className="flex items-center gap-3 rounded-xl px-4 py-3"
                        style={{
                          background: isCorrect ? 'rgba(0,255,200,0.08)' : 'rgba(239,68,68,0.08)',
                          border: `1px solid ${isCorrect ? 'rgba(0,255,200,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        }}
                      >
                        {isCorrect
                          ? <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: '#00FFC8' }} />
                          : <XCircle className="h-5 w-5 shrink-0" style={{ color: '#ef4444' }} />}
                        <p className="font-bold text-sm" style={{ color: isCorrect ? '#00FFC8' : '#ef4444' }}>
                          {isCorrect ? 'Correct!' : `Answer: ${targetWord}`}
                        </p>
                      </div>
                      <button onClick={advance} className="rv-btn-mint">
                        {isLast
                          ? <>See all collocations <ArrowRight className="h-4 w-4" /></>
                          : <>Next <ArrowRight className="h-4 w-4" /></>}
                      </button>
                    </motion.div>
                  )}
                </>
              ) : (
                /* Fallback: collocation doesn't contain target word */
                <>
                  <p className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {highlightWord(current.collocation, targetWord)}
                  </p>
                  <button onClick={advance} className="rv-btn-mint">
                    {isLast
                      ? <>See all collocations <ArrowRight className="h-4 w-4" /></>
                      : <>Next <ArrowRight className="h-4 w-4" /></>}
                  </button>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Skip */}
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
