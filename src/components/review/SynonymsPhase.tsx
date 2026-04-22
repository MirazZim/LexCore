import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import type { DueWordItem } from './types';

interface SynonymsPhaseProps {
  currentItem: DueWordItem;
  currentIndex: number;
  totalWords: number;
  synonyms: string[];
  onNext: () => void;
}

export function SynonymsPhase({
  currentItem, currentIndex, synonyms, totalWords, onNext,
}: SynonymsPhaseProps) {
  const [cardIndex, setCardIndex] = useState(0);
  const [allDone, setAllDone] = useState(false);

  const total = synonyms.length;
  const current = synonyms[cardIndex];
  const reviewed = allDone ? synonyms : synonyms.slice(0, cardIndex);
  const isLast = cardIndex === total - 1;

  const advance = () => {
    if (isLast) setAllDone(true);
    else setCardIndex(i => i + 1);
  };

  if (total === 0) {
    return (
      <motion.div
        key={`syn-${currentIndex}`}
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -60 }}
        transition={{ duration: 0.3 }}
      >
        <div className="rv-glass rounded-[2rem] p-8 mt-4 text-center space-y-5">
          <p className="text-zinc-500 text-sm">No synonyms saved for this word yet.</p>
          <button onClick={onNext} className="rv-btn-mint">
            {currentIndex + 1 >= totalWords ? 'View Summary' : 'Next Word'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      key={`syn-${currentIndex}`}
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.3 }}
      className="mt-4 space-y-3"
    >
      {/* Header */}
      <div className="rv-glass rounded-[2rem] px-8 py-5">
        <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-0.5">
          Synonym Drill
        </p>
        <h2
          className="text-3xl font-bold"
          style={{ color: '#8b5cf6', fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {currentItem.word.word}
        </h2>
        <p className="text-zinc-500 text-xs mt-1">
          Build your semantic network — words that share the same meaning.
        </p>
      </div>

      {/* All-done summary screen */}
      <AnimatePresence>
        {allDone && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="rv-glass rounded-[2rem] p-7 space-y-4"
            style={{ border: '1px solid rgba(139,92,246,0.25)' }}
          >
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-1">Quick Review</p>
              <p className="text-sm text-zinc-400">
                All synonyms for <span className="text-white font-semibold">{currentItem.word.word}</span> — words you can swap in.
              </p>
            </div>
            <div className="space-y-2">
              {synonyms.map((syn, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl px-4 py-3"
                  style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.12)' }}
                >
                  <span className="text-[9px] font-bold text-zinc-600 w-4 shrink-0">#{i + 1}</span>
                  <span
                    className="text-sm font-semibold"
                    style={{ color: '#a78bfa', fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {syn}
                  </span>
                </div>
              ))}
            </div>
            <button onClick={onNext} className="rv-btn-mint">
              {currentIndex + 1 >= totalWords ? 'View Summary' : 'Next Word'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stack + active card — hidden once all done */}
      {!allDone && (
        <>
          {/* Stack of reviewed synonyms */}
          <AnimatePresence>
            {reviewed.map((syn, i) => {
              const age = reviewed.length - 1 - i;
              const opacity = Math.max(0.35, 1 - age * 0.18);
              const scale = Math.max(0.93, 1 - age * 0.025);
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16, scale: 0.96 }}
                  animate={{ opacity, y: 0, scale }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="rounded-2xl px-5 py-3 flex items-center justify-between"
                  style={{
                    background: 'rgba(139,92,246,0.04)',
                    border: '1px solid rgba(139,92,246,0.12)',
                    transformOrigin: 'center top',
                  }}
                >
                  <span
                    className="text-sm font-semibold text-zinc-300"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {syn}
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
              className="rv-glass rounded-[2rem] p-7 space-y-4"
              style={{ border: '1px solid rgba(139,92,246,0.2)' }}
            >
              {/* Progress dots */}
              <div className="flex items-center gap-1.5">
                {synonyms.map((_, i) => (
                  <span
                    key={i}
                    className="rounded-full transition-all duration-300"
                    style={{
                      width: i === cardIndex ? 20 : 6,
                      height: 6,
                      background: i < cardIndex
                        ? 'rgba(139,92,246,0.35)'
                        : i === cardIndex
                        ? '#8b5cf6'
                        : 'rgba(255,255,255,0.1)',
                    }}
                  />
                ))}
                <span className="ml-auto text-[10px] font-bold text-zinc-600">
                  {cardIndex + 1} / {total}
                </span>
              </div>

              {/* Synonym */}
              <p
                className="text-2xl font-bold"
                style={{ color: '#a78bfa', fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {current}
              </p>

              {/* Context box */}
              <div
                className="rounded-xl p-4"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2">Usage</p>
                <p className="text-zinc-300 text-sm leading-relaxed">
                  "… <span style={{ color: '#a78bfa', fontWeight: 700 }}>{current}</span> …" can replace{' '}
                  <span style={{ color: '#8b5cf6', fontWeight: 700 }}>{currentItem.word.word}</span> in context.
                </p>
                <p className="text-[10px] text-zinc-600 mt-2">
                  Note any subtle differences in register or tone.
                </p>
              </div>

              {/* Action button */}
              <button onClick={advance} className="rv-btn-mint">
                {isLast ? (
                  <>See all synonyms <ArrowRight className="h-4 w-4" /></>
                ) : (
                  <>Next synonym <ArrowRight className="h-4 w-4" /></>
                )}
              </button>
            </motion.div>
          </AnimatePresence>

          {/* Skip */}
          {!isLast && (
            <button
              onClick={onNext}
              className="w-full text-center text-xs text-zinc-600 hover:text-zinc-400 transition-colors pt-1"
            >
              Skip synonyms →
            </button>
          )}
        </>
      )}
    </motion.div>
  );
}
