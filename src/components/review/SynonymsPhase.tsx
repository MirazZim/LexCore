import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import type { DueWordItem } from './types';
import type { Word } from '@/lib/types';

function playChime(frequency = 880, duration = 0.28) {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.14, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start();
    osc.stop(ctx.currentTime + duration);
    setTimeout(() => ctx.close(), (duration + 0.1) * 1000);
  } catch {}
}

interface SynonymsPhaseProps {
  currentItem: DueWordItem;
  currentIndex: number;
  totalWords: number;
  synonyms: string[];
  allWords: Word[];
  onNext: () => void;
}

type TileState = 'idle' | 'correct' | 'wrong';

export function SynonymsPhase({
  currentItem, currentIndex, synonyms, allWords, totalWords, onNext,
}: SynonymsPhaseProps) {
  const [allDone, setAllDone] = useState(false);
  const [tileStates, setTileStates] = useState<Record<string, TileState>>({});

  // Build scrambled tile list once on mount: real synonyms + 2 distractors
  const [tiles] = useState<{ word: string; isSynonym: boolean }[]>(() => {
    const distractors = allWords
      .map(w => w.word)
      .filter(w =>
        w.toLowerCase() !== currentItem.word.word.toLowerCase() &&
        !synonyms.some(s => s.toLowerCase() === w.toLowerCase())
      )
      .sort(() => Math.random() - 0.5)
      .slice(0, 2);
    while (distractors.length < 2) distractors.push('ordinary');
    return [
      ...synonyms.map(s => ({ word: s, isSynonym: true })),
      ...distractors.map(d => ({ word: d, isSynonym: false })),
    ].sort(() => Math.random() - 0.5);
  });

  const foundCount = tiles.filter(t => t.isSynonym && tileStates[t.word] === 'correct').length;
  const gridDone = synonyms.length > 0 && foundCount === synonyms.length;

  // Completion chime when all synonyms found
  useEffect(() => {
    if (gridDone) {
      playChime(1046, 0.35);
      setTimeout(() => playChime(1318, 0.45), 140);
    }
  }, [gridDone]);

  const handleTap = (tile: { word: string; isSynonym: boolean }) => {
    if (tileStates[tile.word] === 'correct' || gridDone) return;
    if (tile.isSynonym) {
      setTileStates(prev => ({ ...prev, [tile.word]: 'correct' }));
      playChime(880, 0.25);
    } else {
      setTileStates(prev => ({ ...prev, [tile.word]: 'wrong' }));
      setTimeout(() => setTileStates(prev => ({ ...prev, [tile.word]: 'idle' })), 500);
    }
  };

  if (synonyms.length === 0) {
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
          Tap all the synonyms. Watch out for imposters.
        </p>
      </div>

      {/* All-done summary */}
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

      {/* Matching grid */}
      {!allDone && (
        <div
          className="rv-glass rounded-[2rem] p-7 space-y-5"
          style={{ border: '1px solid rgba(139,92,246,0.2)' }}
        >
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
              {foundCount} / {synonyms.length} found
            </p>
            <p className="text-sm text-zinc-400">
              Which of these can replace{' '}
              <span style={{ color: '#a78bfa', fontWeight: 700 }}>{currentItem.word.word}</span>?
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {tiles.map(tile => {
              const state: TileState = tileStates[tile.word] ?? 'idle';
              const isCorrect = state === 'correct';
              const isWrong = state === 'wrong';
              return (
                <motion.button
                  key={tile.word}
                  onClick={() => handleTap(tile)}
                  animate={isWrong ? { x: [-5, 5, -4, 4, -2, 2, 0] } : { x: 0 }}
                  transition={{ duration: 0.38 }}
                  whileTap={!isCorrect ? { scale: 0.94 } : {}}
                  className="relative rounded-2xl px-4 py-4 text-sm font-bold text-left"
                  style={{
                    background: isCorrect
                      ? 'rgba(0,255,200,0.12)'
                      : isWrong
                      ? 'rgba(239,68,68,0.12)'
                      : 'rgba(139,92,246,0.08)',
                    border: `1px solid ${
                      isCorrect
                        ? 'rgba(0,255,200,0.45)'
                        : isWrong
                        ? 'rgba(239,68,68,0.45)'
                        : 'rgba(139,92,246,0.2)'
                    }`,
                    boxShadow: isCorrect ? '0 0 18px rgba(0,255,200,0.18)' : 'none',
                    color: isCorrect ? '#00FFC8' : isWrong ? '#ef4444' : '#d4d4d8',
                    cursor: isCorrect || gridDone ? 'default' : 'pointer',
                    transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s, color 0.15s',
                  }}
                >
                  {tile.word}
                  {isCorrect && (
                    <motion.span
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="absolute top-2 right-2"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" style={{ color: '#00FFC8' }} />
                    </motion.span>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Grid complete */}
          <AnimatePresence>
            {gridDone && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div
                  className="flex items-center gap-3 rounded-xl px-4 py-3"
                  style={{ background: 'rgba(0,255,200,0.08)', border: '1px solid rgba(0,255,200,0.3)' }}
                >
                  <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: '#00FFC8' }} />
                  <p className="font-bold text-sm" style={{ color: '#00FFC8' }}>
                    All {synonyms.length} synonyms found!
                  </p>
                </div>
                <button onClick={() => setAllDone(true)} className="rv-btn-mint">
                  See all synonyms <ArrowRight className="h-4 w-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {!gridDone && (
            <button
              onClick={onNext}
              className="w-full text-center text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Skip synonyms →
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
