import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import type { DueWordItem } from './types';
import type { Word } from '@/lib/types';
import { HERO_MUTED } from './twoTone';

const VIOLET_INK = '#7c3aed';

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
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="mt-4"
      >
        <div className="rv-surface rounded-[2rem] p-8 text-center space-y-5">
          <p className="text-zinc-500 text-sm">No synonyms saved for this word yet.</p>
          <button onClick={onNext} className="rv-btn-hero">
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
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="mt-4 space-y-3"
    >
      {/* ── Header card — persistent word ──────────────────────────── */}
      <div className="rv-hero rounded-[2rem] px-8 py-6">
        <div className="mb-4">
          <span
            className="text-[9px] uppercase tracking-[0.25em] font-bold px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(167,139,250,0.16)', color: '#c4b5fd' }}
          >
            🔮 Synonym Drill
          </span>
        </div>
        <motion.h2
          initial={{ opacity: 0, scale: 0.82, filter: 'blur(8px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ type: 'spring', stiffness: 180, damping: 18, delay: 0.06 }}
          className="font-bold leading-none select-none"
          style={{
            fontSize: 'clamp(2.2rem, 7vw, 3.2rem)',
            color: '#fff',
            fontFamily: "'Space Grotesk', sans-serif",
            letterSpacing: '-0.01em',
          }}
        >
          {currentItem.word.word}
        </motion.h2>
        <p className="text-xs mt-2" style={{ color: HERO_MUTED }}>Tap all the synonyms. Watch out for imposters.</p>
      </div>

      {/* ── All-done summary ───────────────────────────────────────── */}
      <AnimatePresence>
        {allDone && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="rv-surface rounded-[2rem] p-7 space-y-4"
          >
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-1">Words you can swap in</p>
              <p className="text-sm text-zinc-600">
                All synonyms for <span className="text-zinc-900 font-semibold">{currentItem.word.word}</span>.
              </p>
            </div>
            <div className="space-y-2">
              {synonyms.map((syn, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07, duration: 0.22 }}
                  className="rv-tile flex items-center gap-3 rounded-xl px-4 py-3"
                >
                  <span className="text-[9px] font-bold text-zinc-400 w-4 shrink-0">#{i + 1}</span>
                  <span className="text-sm font-semibold" style={{ color: VIOLET_INK, fontFamily: "'Space Grotesk', sans-serif" }}>
                    {syn}
                  </span>
                </motion.div>
              ))}
            </div>
            <motion.button
              onClick={onNext}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: synonyms.length * 0.07 + 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="rv-btn-hero"
            >
              {currentIndex + 1 >= totalWords ? 'View Summary' : 'Next Word'}
              <ArrowRight className="h-4 w-4" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Matching grid ──────────────────────────────────────────── */}
      {!allDone && (
        <div
          className="rv-surface rounded-[2rem] p-7 space-y-5"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-600">
              Which of these can replace{' '}
              <span style={{ color: VIOLET_INK, fontWeight: 700 }}>{currentItem.word.word}</span>?
            </p>
            <span className="text-[10px] font-bold text-zinc-400 shrink-0 ml-3">
              {foundCount} / {synonyms.length}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {tiles.map((tile, i) => {
              const state: TileState = tileStates[tile.word] ?? 'idle';
              const isCorrectTile = state === 'correct';
              const isWrong = state === 'wrong';
              return (
                <motion.button
                  key={tile.word}
                  onClick={() => handleTap(tile)}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    x: isWrong ? [-5, 5, -4, 4, -2, 2, 0] : 0,
                  }}
                  transition={{
                    opacity:  { delay: i * 0.06, duration: 0.2 },
                    scale:    { delay: i * 0.06, duration: 0.2 },
                    x:        { duration: 0.38 },
                  }}
                  whileTap={!isCorrectTile ? { scale: 0.94 } : {}}
                  className="relative rounded-2xl px-4 py-4 text-sm font-bold text-left"
                  style={{
                    background: isCorrectTile ? '#d1fae5' : isWrong ? '#fee2e2' : '#ffffff',
                    border: `1px solid ${isCorrectTile ? '#34d399' : isWrong ? '#f87171' : 'rgba(15,23,20,0.1)'}`,
                    boxShadow: '0 1px 2px rgba(15,23,20,0.05)',
                    color: isCorrectTile ? '#047857' : isWrong ? '#dc2626' : '#27272a',
                    cursor: isCorrectTile || gridDone ? 'default' : 'pointer',
                    transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s, color 0.15s',
                  }}
                >
                  {tile.word}
                  {isCorrectTile && (
                    <motion.span
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 280, damping: 14 }}
                      className="absolute top-2 right-2"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" style={{ color: '#059669' }} />
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
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-3"
              >
                <div
                  className="flex items-center gap-3 rounded-xl px-4 py-3"
                  style={{ background: '#d1fae5', border: '1px solid #6ee7b7' }}
                >
                  <motion.div
                    initial={{ scale: 0.3, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 280, damping: 14 }}
                  >
                    <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: '#059669' }} />
                  </motion.div>
                  <p className="font-bold text-sm" style={{ color: '#047857' }}>
                    All {synonyms.length} synonyms found!
                  </p>
                </div>
                <motion.button
                  onClick={() => setAllDone(true)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="rv-btn-hero"
                >
                  See all synonyms <ArrowRight className="h-4 w-4" />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {!gridDone && (
            <button
              onClick={onNext}
              className="w-full text-center text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              Skip synonyms →
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
