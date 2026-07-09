import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, RotateCcw, Zap, Check, Sparkles } from 'lucide-react';
import { Rating } from 'ts-fsrs';
import type { DueWordItem } from './types';
import type { Word } from '@/lib/types';

const ratingConfig = [
  { rating: Rating.Again, label: 'Again', sub: 'drew a blank', Icon: RotateCcw, bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.28)', hoverBg: 'rgba(239,68,68,0.18)', color: '#ef4444' },
  { rating: Rating.Hard,  label: 'Hard',  sub: 'had to dig',   Icon: Zap,        bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.28)', hoverBg: 'rgba(249,115,22,0.18)', color: '#f97316' },
  { rating: Rating.Good,  label: 'Good',  sub: 'got it',       Icon: Check,      bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.28)', hoverBg: 'rgba(59,130,246,0.18)', color: '#3b82f6' },
  { rating: Rating.Easy,  label: 'Easy',  sub: 'owned it',     Icon: Sparkles,   bg: 'rgba(0,255,200,0.1)',  border: 'rgba(0,255,200,0.28)',  hoverBg: 'rgba(0,255,200,0.18)',  color: '#00FFC8' },
];

const MC_STYLES = [
  { label: 'A', accent: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.22)', hoverBg: 'rgba(167,139,250,0.16)', hoverBorder: 'rgba(167,139,250,0.5)', badgeBg: 'rgba(167,139,250,0.15)' },
  { label: 'B', accent: '#6ee7b7', bg: 'rgba(110,231,183,0.08)', border: 'rgba(110,231,183,0.22)', hoverBg: 'rgba(110,231,183,0.16)', hoverBorder: 'rgba(110,231,183,0.5)', badgeBg: 'rgba(110,231,183,0.15)' },
  { label: 'C', accent: '#fbbf24', bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.22)',  hoverBg: 'rgba(251,191,36,0.16)',  hoverBorder: 'rgba(251,191,36,0.5)',  badgeBg: 'rgba(251,191,36,0.15)'  },
];

const WIN_PHRASES  = ['Flawless.', 'Sharp.', 'Locked in.', 'You own this.', 'Crisp.', 'Perfect.'];
const LOSS_PHRASES = ['Not this time.', 'Study it deeper.', 'Almost.', 'It happens.', 'Keep going.'];

interface BattlePhaseProps {
  currentItem: DueWordItem;
  currentIndex: number;
  onRate: (rating: Rating, confidence: 'sure' | 'unsure' | null) => void;
  allWords: Word[];
  streak: number;
}

type BattleStep = 'recall' | 'confidence' | 'quiz' | 'quiz-result';

export function BattlePhase({ currentItem, currentIndex, onRate, allWords, streak }: BattlePhaseProps) {
  const [step, setStep] = useState<BattleStep>('recall');
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [bufferedRating, setBufferedRating] = useState<Rating | null>(null);
  const [confidence, setConfidence] = useState<'sure' | 'unsure' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pick phrases once per card mount so they don't flicker
  const [winPhrase]  = useState(() => WIN_PHRASES[Math.floor(Math.random()  * WIN_PHRASES.length)]);
  const [lossPhrase] = useState(() => LOSS_PHRASES[Math.floor(Math.random() * LOSS_PHRASES.length)]);

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

  const handleRate = (rating: Rating) => {
    setBufferedRating(rating);
    setStep('confidence');
  };

  const handleConfidence = (c: 'sure' | 'unsure') => {
    setConfidence(c);
    setStep('quiz');
  };

  const handleSelect = (answer: string) => {
    setSelectedAnswer(answer);
    setStep('quiz-result');
  };

  const handleContinue = () => {
    // onRate advances the phase synchronously (no network wait — the save
    // happens in the background), so this only guards against a double-tap
    // firing before the component unmounts into the next phase.
    if (isSubmitting) return;
    setIsSubmitting(true);
    const overconfident = !isCorrect && (bufferedRating === Rating.Good || bufferedRating === Rating.Easy);
    onRate(overconfident ? Rating.Hard : bufferedRating!, confidence);
  };

  return (
    <motion.div
      key={`battle-${currentIndex}`}
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="mt-4"
    >
      {/* ── Single persistent card ───────────────────────────────────── */}
      <div
        className="rv-glass rounded-[2rem] overflow-hidden"
        style={{
          borderColor: step === 'quiz-result'
            ? isCorrect ? 'rgba(0,255,200,0.45)' : 'rgba(239,68,68,0.45)'
            : 'rgba(255,255,255,0.07)',
          transition: 'border-color 0.45s ease',
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-8 pt-7">
          <span
            className="text-[9px] uppercase tracking-[0.25em] font-bold px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(0,255,200,0.07)', color: '#00FFC8', border: '1px solid rgba(0,255,200,0.15)' }}
          >
            ⚔ Battle
          </span>
          {streak > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-base leading-none">🔥</span>
              <span className="font-bold text-sm text-white">{streak}</span>
              <span className="text-[10px] text-zinc-600">streak</span>
            </div>
          )}
        </div>

        {/* ── Word — always visible, spring blur-in on mount ──────────── */}
        <div className="px-8 pt-5 pb-5 text-center">
          <motion.h2
            initial={{ opacity: 0, scale: 0.82, filter: 'blur(8px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ type: 'spring', stiffness: 180, damping: 18, delay: 0.06 }}
            className="font-bold leading-none select-none"
            style={{
              fontSize: 'clamp(2.6rem, 8vw, 4rem)',
              color: '#00FFC8',
              fontFamily: "'Space Grotesk', sans-serif",
              textShadow: '0 0 40px rgba(0,255,200,0.28)',
              letterSpacing: '-0.01em',
            }}
          >
            {currentItem.word.word}
          </motion.h2>
        </div>

        {/* Hairline */}
        <div className="mx-8 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

        {/* ── Animated step content ───────────────────────────────────── */}
        <AnimatePresence mode="wait">

          {/* Step 1 · Self-rating ─────────────────────────────────────── */}
          {step === 'recall' && (
            <motion.div
              key="recall"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.26 }}
              className="px-8 pt-6 pb-8 space-y-5"
            >
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 text-center font-semibold">
                How well did you recall this?
              </p>

              <div className="grid grid-cols-2 gap-2.5">
                {ratingConfig.map((btn, i) => (
                  <motion.button
                    key={btn.rating}
                    onClick={() => handleRate(btn.rating)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.06 + i * 0.05 }}
                    whileHover={{ scale: 1.03, transition: { duration: 0.12 } }}
                    whileTap={{ scale: 0.94 }}
                    className="flex flex-col items-center gap-1.5 py-4 rounded-2xl"
                    style={{ background: btn.bg, border: `1px solid ${btn.border}`, color: btn.color }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = btn.hoverBg; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = btn.bg; }}
                  >
                    <btn.Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
                    <span className="text-sm font-bold">{btn.label}</span>
                    <span className="text-[9px] opacity-55 font-medium">{btn.sub}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 2 · Confidence bet ───────────────────────────────────── */}
          {step === 'confidence' && (
            <motion.div
              key="confidence"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.26 }}
              className="px-8 pt-6 pb-8 space-y-5"
            >
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 text-center font-semibold">
                Before the reveal — commit
              </p>

              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  onClick={() => handleConfidence('sure')}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.24, delay: 0.05 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.94 }}
                  className="flex flex-col items-center gap-2 py-5 rounded-2xl text-sm font-bold"
                  style={{ background: 'rgba(0,255,200,0.1)', border: '1px solid rgba(0,255,200,0.3)', color: '#00FFC8' }}
                >
                  <span className="text-2xl leading-none">💡</span>
                  I know it
                </motion.button>

                <motion.button
                  onClick={() => handleConfidence('unsure')}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.24, delay: 0.1 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.94 }}
                  className="flex flex-col items-center gap-2 py-5 rounded-2xl text-sm font-bold"
                  style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)', color: '#a78bfa' }}
                >
                  <span className="text-2xl leading-none">🎲</span>
                  Guessing
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Step 3 · MC quiz ─────────────────────────────────────────── */}
          {step === 'quiz' && (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.26 }}
              className="px-8 pt-6 pb-8"
            >
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 text-center font-semibold mb-4">
                Pick the correct meaning
              </p>

              <div className="flex flex-col gap-3">
                {choices.map((choice, i) => {
                  const cfg = MC_STYLES[i];
                  return (
                    <motion.button
                      key={i}
                      onClick={() => handleSelect(choice)}
                      initial={{ opacity: 0, x: -14 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.22, delay: 0.06 + i * 0.07 }}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.975 }}
                      className="flex items-center gap-4 text-left w-full px-5 py-4 rounded-2xl"
                      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, transition: 'background 0.15s, border-color 0.15s' }}
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
                        className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-xl text-sm font-bold"
                        style={{ background: cfg.badgeBg, color: cfg.accent }}
                      >
                        {cfg.label}
                      </span>
                      <span className="text-sm leading-snug font-semibold text-white flex-1">{choice}</span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Step 4 · Result ──────────────────────────────────────────── */}
          {step === 'quiz-result' && (
            <motion.div
              key="quiz-result"
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
              className="px-8 pt-6 pb-8"
            >
              {/* Icon + verdict */}
              <div className="text-center mb-5">
                <motion.div
                  initial={{ scale: 0.35, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 16, delay: 0.04 }}
                  className="inline-block mb-3"
                >
                  {isCorrect
                    ? <CheckCircle2 className="h-14 w-14 mx-auto" style={{ color: '#00FFC8' }} />
                    : <XCircle     className="h-14 w-14 mx-auto" style={{ color: '#ef4444' }} />
                  }
                </motion.div>

                <motion.h3
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.14, duration: 0.22 }}
                  className="text-2xl font-bold"
                  style={{ color: isCorrect ? '#00FFC8' : '#ef4444', fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {isCorrect ? winPhrase : lossPhrase}
                </motion.h3>
              </div>

              {/* Wrong answer breakdown */}
              {!isCorrect && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.22, duration: 0.22 }}
                  className="rounded-2xl p-4 mb-4 space-y-3"
                  style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.14)' }}
                >
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-zinc-600 mb-1">Your pick</p>
                    <p className="text-sm line-through font-medium" style={{ color: '#ef4444' }}>{selectedAnswer}</p>
                  </div>
                  <div className="h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-zinc-600 mb-1">Correct answer</p>
                    <p className="text-sm font-semibold" style={{ color: '#00FFC8' }}>{currentItem.word.definition}</p>
                  </div>
                </motion.div>
              )}

              {/* Rating-adjusted badge */}
              {!isCorrect && (bufferedRating === Rating.Good || bufferedRating === Rating.Easy) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.38 }}
                  className="flex justify-center mb-4"
                >
                  <span
                    className="text-[9px] uppercase tracking-widest font-bold px-3 py-1 rounded-full"
                    style={{ background: 'rgba(249,115,22,0.1)', color: '#f97316', border: '1px solid rgba(249,115,22,0.25)' }}
                  >
                    Rating adjusted → Hard
                  </span>
                </motion.div>
              )}

              {/* Continue — delayed on loss so shake resolves first */}
              <motion.button
                onClick={handleContinue}
                disabled={isSubmitting}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: isCorrect ? 0.2 : 0.46, duration: 0.22 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="rv-btn-mint"
              >
                Continue
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  );
}
