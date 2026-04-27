import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Rating } from 'ts-fsrs';
import type { DueWordItem } from './types';
import type { Word } from '@/lib/types';

const ratingConfig = [
  { rating: Rating.Again, label: 'Again', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', color: '#ef4444' },
  { rating: Rating.Hard, label: 'Hard', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.35)', color: '#f97316' },
  { rating: Rating.Good, label: 'Good', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)', color: '#3b82f6' },
  { rating: Rating.Easy, label: 'Easy', bg: 'rgba(0,255,200,0.12)', border: 'rgba(0,255,200,0.35)', color: '#00FFC8' },
];

interface BattlePhaseProps {
  currentItem: DueWordItem;
  currentIndex: number;
  revealed: boolean;
  onReveal: () => void;
  onRate: (rating: Rating) => void;
  allWords: Word[];
  streak: number;
}

type BattleStep = 'recall' | 'quiz' | 'quiz-result';

export function BattlePhase({ currentItem, currentIndex, onRate, allWords, streak }: BattlePhaseProps) {
  const [step, setStep] = useState<BattleStep>('recall');
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [bufferedRating, setBufferedRating] = useState<Rating | null>(null);
  const isCorrect = selectedAnswer === currentItem.word.definition;

  const choices = useMemo(() => {
    const correctDef = currentItem.word.definition;
    const otherDefs = allWords
      .filter(w => w.id !== currentItem.word.id && w.definition !== correctDef)
      .map(w => w.definition);
    const wrong = otherDefs.sort(() => Math.random() - 0.5).slice(0, 2);
    while (wrong.length < 2) wrong.push('No alternative definition available.');
    return [correctDef, ...wrong].sort(() => Math.random() - 0.5);
  }, [currentItem.word.id]);

  // Step 1 → 2: blind recall rated, buffer and move to MC
  const handleRate = (rating: Rating) => {
    setBufferedRating(rating);
    setStep('quiz');
  };

  // Step 2 → 3: MC answer selected
  const handleSelect = (answer: string) => {
    setSelectedAnswer(answer);
    setStep('quiz-result');
  };

  // Step 3 → done: auto-downgrade if overconfident, then commit
  const handleContinue = () => {
    const overconfident = !isCorrect && (bufferedRating === Rating.Good || bufferedRating === Rating.Easy);
    onRate(overconfident ? Rating.Hard : bufferedRating!);
  };

  return (
    <motion.div
      key={`battle-${currentIndex}`}
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.3 }}
    >
      <AnimatePresence mode="wait">

        {/* ── Step 1: Blind recall rating ───────────────────────── */}
        {step === 'recall' && (
          <motion.div key="recall" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="rv-glass rounded-[2rem] p-8 mt-4">
              <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-3 text-center">
                Battle Mode
              </p>
              <motion.h2
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="text-5xl font-bold text-center mb-2"
                style={{ color: '#00FFC8', fontFamily: "'Space Grotesk', sans-serif", textShadow: '0 0 32px rgba(0,255,200,0.25)' }}
              >
                {currentItem.word.word}
              </motion.h2>

              <p className="text-zinc-600 text-xs text-center mb-8">
                Honesty makes you stronger. Dishonesty only cheats your memory.
              </p>

              <p className="text-[10px] uppercase tracking-widest text-zinc-500 text-center mb-4">
                How well do you know this?
              </p>
              <div className="grid grid-cols-4 gap-2">
                {ratingConfig.map((btn, i) => (
                  <motion.button
                    key={btn.rating}
                    onClick={() => handleRate(btn.rating)}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: 0.15 + i * 0.06 }}
                    className="rounded-xl py-3 text-sm font-bold transition-all active:scale-95"
                    style={{ background: btn.bg, border: `1px solid ${btn.border}`, color: btn.color }}
                  >
                    {btn.label}
                  </motion.button>
                ))}
              </div>

              <div className="flex items-center justify-center gap-2 mt-6">
                <span className="text-zinc-700 text-xs">🔥</span>
                <span className="font-bold text-sm text-white">{streak}</span>
                <span className="text-xs text-zinc-600">streak</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Step 2: Multiple-choice quiz (error correction) ──── */}
        {step === 'quiz' && (
          <motion.div key="quiz" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35 }}>
            <div className="rv-glass rounded-[2rem] p-7 mt-4">

              <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-zinc-500 mb-5 text-center">
                Which meaning is correct?
              </p>

              <motion.h2
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.20 }}
                className="text-5xl font-bold text-center mb-8"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  color: '#00FFC8',
                  textShadow: '0 0 32px rgba(0,255,200,0.25)',
                }}
              >
                {currentItem.word.word}
              </motion.h2>

              <div className="flex flex-col gap-3">
                {choices.map((choice, i) => {
                  const cfg = [
                    {
                      label: 'A',
                      accent: '#a78bfa',
                      bg: 'rgba(167,139,250,0.08)',
                      border: 'rgba(167,139,250,0.22)',
                      hoverBg: 'rgba(167,139,250,0.15)',
                      hoverBorder: 'rgba(167,139,250,0.55)',
                      badgeBg: 'rgba(167,139,250,0.18)',
                    },
                    {
                      label: 'B',
                      accent: '#6ee7b7',
                      bg: 'rgba(110,231,183,0.08)',
                      border: 'rgba(110,231,183,0.22)',
                      hoverBg: 'rgba(110,231,183,0.15)',
                      hoverBorder: 'rgba(110,231,183,0.55)',
                      badgeBg: 'rgba(110,231,183,0.18)',
                    },
                    {
                      label: 'C',
                      accent: '#fbbf24',
                      bg: 'rgba(251,191,36,0.08)',
                      border: 'rgba(251,191,36,0.22)',
                      hoverBg: 'rgba(251,191,36,0.15)',
                      hoverBorder: 'rgba(251,191,36,0.55)',
                      badgeBg: 'rgba(251,191,36,0.18)',
                    },
                  ][i];
                  return (
                    <motion.button
                      key={i}
                      onClick={() => handleSelect(choice)}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.28, delay: 0.1 + i * 0.08 }}
                      whileTap={{ scale: 0.975 }}
                      className="flex items-center gap-4 text-left w-full px-5 py-4 rounded-2xl"
                      style={{
                        background: cfg.bg,
                        border: `1px solid ${cfg.border}`,
                        transition: 'background 0.2s, border-color 0.2s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = cfg.hoverBg;
                        e.currentTarget.style.borderColor = cfg.hoverBorder;
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = cfg.bg;
                        e.currentTarget.style.borderColor = cfg.border;
                      }}
                    >
                      <span
                        className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl text-sm font-bold"
                        style={{ background: cfg.badgeBg, color: cfg.accent }}
                      >
                        {cfg.label}
                      </span>
                      <span
                        className="text-base leading-snug font-bold flex-1"
                        style={{ color: '#ffffff' }}
                      >
                        {choice}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Step 3: Quiz result → commit rating → advance ─────── */}
        {step === 'quiz-result' && (
          <motion.div key="quiz-result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <div
              className="rv-glass rounded-[2rem] p-8 mt-4"
              style={{
                borderColor: isCorrect ? 'rgba(0,255,200,0.25)' : 'rgba(239,68,68,0.25)',
              }}
            >
              <div className="text-center mb-5">
                {isCorrect ? (
                  <CheckCircle2 className="h-16 w-16 mx-auto mb-3" style={{ color: '#00FFC8' }} />
                ) : (
                  <XCircle className="h-16 w-16 mx-auto mb-3" style={{ color: '#ef4444' }} />
                )}
                <h3
                  className="text-2xl font-bold"
                  style={{ color: isCorrect ? '#00FFC8' : '#ef4444', fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {isCorrect ? 'Correct!' : 'Not quite'}
                </h3>
              </div>

              {!isCorrect && (
                <div
                  className="rounded-xl p-4 mb-5 space-y-3"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Your answer</p>
                    <p className="text-sm line-through" style={{ color: '#ef4444' }}>{selectedAnswer}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Correct answer</p>
                    <p className="text-sm" style={{ color: '#00FFC8' }}>{currentItem.word.definition}</p>
                  </div>
                </div>
              )}

              {/* Show auto-correction notice when it applies */}
              {!isCorrect && (bufferedRating === Rating.Good || bufferedRating === Rating.Easy) && (
                <p className="text-[10px] text-zinc-500 text-center mb-4">
                  Rating adjusted to Hard based on MC result.
                </p>
              )}

              <button onClick={handleContinue} className="rv-btn-mint">
                Continue
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
