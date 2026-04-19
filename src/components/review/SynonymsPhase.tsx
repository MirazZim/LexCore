import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, X, ChevronLeft } from 'lucide-react';
import type { DueWordItem } from './types';

interface SynonymsPhaseProps {
  currentItem: DueWordItem;
  currentIndex: number;
  totalWords: number;
  synonyms: string[];
  onNext: () => void;
}

type CardState = 'hidden' | 'revealed' | 'known' | 'learning';

export function SynonymsPhase({
  currentItem, currentIndex, totalWords, synonyms, onNext,
}: SynonymsPhaseProps) {
  const [cardIndex, setCardIndex] = useState(0);
  const [cardStates, setCardStates] = useState<CardState[]>(() =>
    synonyms.map(() => 'hidden')
  );

  const total = synonyms.length;
  const current = synonyms[cardIndex];
  const currentState = cardStates[cardIndex];
  const allRated = cardStates.every(s => s === 'known' || s === 'learning');
  const knownCount = cardStates.filter(s => s === 'known').length;

  const setCardState = (idx: number, state: CardState) =>
    setCardStates(prev => prev.map((s, i) => (i === idx ? state : s)));

  const goTo = (idx: number) => setCardIndex(Math.max(0, Math.min(total - 1, idx)));

  const handleReveal = () => {
    if (currentState === 'hidden') setCardState(cardIndex, 'revealed');
  };

  const handleRate = (known: boolean) => {
    setCardState(cardIndex, known ? 'known' : 'learning');
    if (cardIndex < total - 1) {
      setTimeout(() => goTo(cardIndex + 1), 280);
    }
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

  const dotColor = (i: number) => {
    const s = cardStates[i];
    if (s === 'known') return '#00FFC8';
    if (s === 'learning') return '#f97316';
    if (s === 'revealed') return 'rgba(255,255,255,0.35)';
    return 'rgba(255,255,255,0.1)';
  };

  return (
    <motion.div
      key={`syn-${currentIndex}`}
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.3 }}
    >
      <div className="rv-glass rounded-[2rem] p-8 mt-4 space-y-6">

        {/* Header */}
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-1">
            Synonym Drill
          </p>
          <h2
            className="text-4xl font-bold"
            style={{ color: '#8b5cf6', fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {currentItem.word.word}
          </h2>
          <p className="text-zinc-500 text-xs mt-1 leading-relaxed">
            {currentItem.word.definition}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5">
          {synonyms.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="rounded-full transition-all"
              style={{
                width: i === cardIndex ? 20 : 6,
                height: 6,
                background: dotColor(i),
              }}
            />
          ))}
          <span className="ml-auto text-[10px] font-bold text-zinc-600">
            {cardIndex + 1} / {total}
          </span>
        </div>

        {/* Synonym card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={cardIndex}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22 }}
          >
            {/* Flip card: hidden → tap to reveal */}
            {currentState === 'hidden' ? (
              <button
                onClick={handleReveal}
                className="w-full rounded-2xl p-8 text-center transition-all hover:scale-[1.01] active:scale-[0.99]"
                style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}
              >
                <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-3">Synonym {cardIndex + 1}</p>
                <p className="text-3xl font-bold" style={{ color: 'rgba(139,92,246,0.35)', fontFamily: "'Space Grotesk', sans-serif" }}>
                  {'— — —'}
                </p>
                <p className="text-xs text-zinc-600 mt-4">Tap to reveal</p>
              </button>
            ) : (
              <div
                className="rounded-2xl p-8 space-y-5"
                style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)' }}
              >
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-3">Synonym {cardIndex + 1}</p>
                  <p
                    className="text-4xl font-bold"
                    style={{ color: '#a78bfa', fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {current}
                  </p>
                  <p className="text-xs text-zinc-500 mt-2">
                    same meaning as <span style={{ color: '#8b5cf6' }}>{currentItem.word.word}</span>
                  </p>
                </div>

                {/* Rate only if not yet rated */}
                {currentState === 'revealed' && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex gap-3"
                  >
                    <button
                      onClick={() => handleRate(false)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all"
                      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}
                    >
                      <X className="h-4 w-4" />
                      Still learning
                    </button>
                    <button
                      onClick={() => handleRate(true)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all"
                      style={{ background: 'rgba(0,255,200,0.1)', border: '1px solid rgba(0,255,200,0.25)', color: '#00FFC8' }}
                    >
                      <Check className="h-4 w-4" />
                      Got it
                    </button>
                  </motion.div>
                )}

                {/* Already rated badge */}
                {(currentState === 'known' || currentState === 'learning') && (
                  <div className="text-center">
                    <span
                      className="inline-block rounded-full px-4 py-1 text-xs font-bold"
                      style={
                        currentState === 'known'
                          ? { background: 'rgba(0,255,200,0.12)', color: '#00FFC8' }
                          : { background: 'rgba(239,68,68,0.12)', color: '#f87171' }
                      }
                    >
                      {currentState === 'known' ? '✓ Got it' : '✗ Still learning'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex gap-3">
          <button
            onClick={() => goTo(cardIndex - 1)}
            disabled={cardIndex === 0}
            className="flex items-center justify-center w-12 h-12 rounded-xl disabled:opacity-25 transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#a1a1aa' }}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {!allRated && cardIndex < total - 1 ? (
            <button
              onClick={() => goTo(cardIndex + 1)}
              className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl font-semibold text-sm transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#d4d4d8' }}
            >
              Next synonym
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : allRated ? (
            <button onClick={onNext} className="flex-1 rv-btn-mint" style={{ height: 48 }}>
              {currentIndex + 1 >= totalWords ? 'View Summary' : 'Next Word'}
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <div className="flex-1" />
          )}
        </div>

        {/* Results row when all rated */}
        {allRated && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center gap-6 pt-1"
          >
            <span className="text-xs font-bold" style={{ color: '#00FFC8' }}>
              {knownCount} / {total} known
            </span>
            {total - knownCount > 0 && (
              <span className="text-xs font-bold" style={{ color: '#f87171' }}>
                {total - knownCount} to review
              </span>
            )}
          </motion.div>
        )}

        {/* Skip link */}
        {!allRated && (
          <button
            onClick={onNext}
            className="w-full text-center text-xs text-zinc-600 hover:text-zinc-400 transition-colors pt-1"
          >
            Skip synonyms →
          </button>
        )}

      </div>
    </motion.div>
  );
}
