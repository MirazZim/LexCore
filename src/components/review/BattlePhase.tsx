import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Flame, TrendingUp } from 'lucide-react';
import type { DueWordItem } from './types';
import type { Word } from '@/lib/types';

const qualityConfig = [
  { quality: 0, label: 'Again', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.35)',  color: '#ef4444' },
  { quality: 2, label: 'Hard',  bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.35)', color: '#f97316' },
  { quality: 4, label: 'Good',  bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)', color: '#3b82f6' },
  { quality: 5, label: 'Easy',  bg: 'rgba(0,255,200,0.12)',  border: 'rgba(0,255,200,0.35)',  color: '#00FFC8' },
];

interface BattlePhaseProps {
  currentItem: DueWordItem;
  currentIndex: number;
  revealed: boolean;
  onReveal: () => void;
  onRate: (quality: number) => void;
  allWords: Word[];
  streak: number;
}

type BattleStep = 'quiz' | 'quiz-result' | 'recall' | 'progress';

export function BattlePhase({ currentItem, currentIndex, revealed, onReveal, onRate, allWords, streak }: BattlePhaseProps) {
  const [step, setStep] = useState<BattleStep>('quiz');
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const isCorrect = selectedAnswer === currentItem.word.definition;

  const choices = useMemo(() => {
    const correctDef = currentItem.word.definition;
    const otherDefs = allWords
      .filter(w => w.id !== currentItem.word.id && w.definition !== correctDef)
      .map(w => w.definition);
    const wrong = otherDefs.sort(() => Math.random() - 0.5).slice(0, 1);
    if (wrong.length < 1) wrong.push('No alternative definition available.');
    return [correctDef, ...wrong].sort(() => Math.random() - 0.5);
  }, [currentItem.word.id]);

  const handleSelect = (answer: string) => {
    setSelectedAnswer(answer);
    setStep('quiz-result');
  };

  const handleContinueToRecall = () => {
    setStep('recall');
    if (isCorrect) onReveal();
  };

  const handleRate = (quality: number) => {
    setStep('progress');
    setTimeout(() => onRate(quality), 0);
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

        {/* ── Step 1: Multiple-choice quiz ─────────────────────── */}
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

        {/* ── Step 2: Quiz result ───────────────────────────────── */}
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

              <button onClick={handleContinueToRecall} className="rv-btn-mint">
                Continue to Recall
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Step 3: Recall + rate ─────────────────────────────── */}
        {step === 'recall' && (
          <motion.div key="recall" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="rv-glass rounded-[2rem] p-8 mt-4">
              <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-3 text-center">
                Battle Mode
              </p>
              <h2
                className="text-5xl font-bold text-center mb-8"
                style={{ color: '#00FFC8', fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {currentItem.word.word}
              </h2>

              {!revealed ? (
                <button onClick={onReveal} className="rv-btn-secondary">
                  Reveal Definition
                </button>
              ) : (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <p className="text-white text-lg text-center mb-3 leading-relaxed">
                    {currentItem.word.definition}
                  </p>
                  {currentItem.word.example_sentence && (
                    <p className="text-zinc-500 text-sm text-center italic mb-6">
                      "{currentItem.word.example_sentence}"
                    </p>
                  )}

                  {/* Streak / ease strip */}
                  <div
                    className="flex items-center justify-center gap-8 py-3 rounded-xl mb-6"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="flex items-center gap-1.5">
                      <Flame className="h-4 w-4" style={{ color: '#f97316' }} />
                      <span className="font-bold text-sm text-white">{streak}</span>
                      <span className="text-xs text-zinc-500">streak</span>
                    </div>
                    <div className="w-px h-4 bg-zinc-700" />
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4" style={{ color: '#00FFC8' }} />
                      <span className="font-bold text-sm text-white">
                        {(currentItem.stats.ease_factor * 100 / 2.5).toFixed(0)}%
                      </span>
                      <span className="text-xs text-zinc-500">ease</span>
                    </div>
                  </div>

                  <p className="text-[10px] uppercase tracking-widest text-zinc-500 text-center mb-3">
                    How well did you recall this?
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {qualityConfig.map(btn => (
                      <button
                        key={btn.quality}
                        onClick={() => handleRate(btn.quality)}
                        className="rounded-xl py-3 text-sm font-bold transition-all active:scale-95"
                        style={{
                          background: btn.bg,
                          border: `1px solid ${btn.border}`,
                          color: btn.color,
                        }}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
