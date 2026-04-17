import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import type { DueWordItem, WordCollocation } from './types';

interface CollocationPhaseProps {
  currentItem: DueWordItem;
  currentIndex: number;
  collocations: WordCollocation[];
  onNext: () => void;
}

function highlightWord(phrase: string, word: string) {
  const regex = new RegExp(`(${word})`, 'gi');
  const parts = phrase.split(regex);
  return parts.map((part, i) =>
    regex.test(part)
      ? <span key={i} style={{ color: '#00FFC8', fontWeight: 700 }}>{part}</span>
      : <span key={i}>{part}</span>
  );
}

export function CollocationPhase({
  currentItem, currentIndex, collocations, onNext,
}: CollocationPhaseProps) {
  const [cardIndex, setCardIndex] = useState(0);
  const [seen, setSeen] = useState<Set<number>>(new Set());

  const total = collocations.length;
  const current = collocations[cardIndex];
  const allSeen = seen.size >= total;

  const goTo = (idx: number) => {
    const next = Math.max(0, Math.min(total - 1, idx));
    setCardIndex(next);
    setSeen(prev => new Set(prev).add(next));
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
    >
      <div className="rv-glass rounded-[2rem] p-8 mt-4 space-y-6">

        {/* Header */}
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-1">
            Collocation Workshop
          </p>
          <h2
            className="text-4xl font-bold"
            style={{ color: '#00FFC8', fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {currentItem.word.word}
          </h2>
          <p className="text-zinc-500 text-xs mt-1">
            Learn the phrases native speakers pair with this word.
          </p>
        </div>

        {/* Card counter dots */}
        <div className="flex items-center gap-1.5">
          {collocations.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="rounded-full transition-all"
              style={{
                width: i === cardIndex ? 20 : 6,
                height: 6,
                background: i === cardIndex
                  ? '#00FFC8'
                  : seen.has(i)
                  ? 'rgba(0,255,200,0.3)'
                  : 'rgba(255,255,255,0.1)',
              }}
            />
          ))}
          <span className="ml-auto text-[10px] font-bold text-zinc-600">
            {cardIndex + 1} / {total}
          </span>
        </div>

        {/* Collocation card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={cardIndex}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="rounded-2xl p-6 space-y-4"
            style={{
              background: 'rgba(0,255,200,0.06)',
              border: '1px solid rgba(0,255,200,0.18)',
            }}
          >
            {/* Phrase with word highlighted */}
            <p className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {highlightWord(current.collocation, currentItem.word.word)}
            </p>

            {/* Usage tip: wrap in a sample sentence fragment */}
            <div
              className="rounded-xl p-4"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2">Pattern</p>
              <p className="text-zinc-300 text-sm leading-relaxed">
                "… {highlightWord(current.collocation, currentItem.word.word)} …"
              </p>
              <p className="text-[10px] text-zinc-600 mt-2">
                Use this phrase as a complete unit in your sentences.
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Prev / Next navigation */}
        <div className="flex gap-3">
          <button
            onClick={() => goTo(cardIndex - 1)}
            disabled={cardIndex === 0}
            className="flex items-center justify-center w-12 h-12 rounded-xl disabled:opacity-25 transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#a1a1aa' }}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {cardIndex < total - 1 ? (
            <button
              onClick={() => goTo(cardIndex + 1)}
              className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl font-semibold text-sm transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#d4d4d8' }}
            >
              Next collocation
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={onNext}
              className="flex-1 rv-btn-mint"
              style={{ height: 48 }}
            >
              {allSeen ? (
                <>Let's Write  <ArrowRight className="h-4 w-4" /></>
              ) : (
                <>Continue  <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          )}
        </div>

        {/* Skip shortcut — always available */}
        {cardIndex < total - 1 && (
          <button
            onClick={onNext}
            className="w-full text-center text-xs text-zinc-600 hover:text-zinc-400 transition-colors pt-1"
          >
            Skip to Generation Lab →
          </button>
        )}

      </div>
    </motion.div>
  );
}
