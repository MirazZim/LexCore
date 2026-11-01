import { motion } from 'framer-motion';
import { Confetti } from './Confetti';
import { ClearTrophy } from './ClearTrophy';
import type { DailyClear } from '@/lib/daily-clears';

interface DayClearedCelebrationProps {
  clear: DailyClear;
  /** How many days cleared in total, this one included. */
  clearNumber: number;
  onViewAll: () => void;
  onClose: () => void;
}

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const, delay },
});

export function DayClearedCelebration({ clear, clearNumber, onViewAll, onClose }: DayClearedCelebrationProps) {
  const plaque = new Date(`${clear.day}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <motion.div
      className="fixed inset-0 z-[100] overflow-y-auto"
      style={{ background: 'radial-gradient(ellipse at 50% 30%, #2a1d0a 0%, #0d0a07 55%, #050403 100%)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      role="dialog"
      aria-modal="true"
      aria-label="Day cleared"
    >
      <style>{`
        @keyframes dc-spin { to { transform: translate(-50%, -50%) rotate(360deg); } }
        .dc-rays {
          position: absolute; left: 50%; top: 50%;
          width: 560px; height: 560px;
          transform: translate(-50%, -50%);
          background: repeating-conic-gradient(from 0deg, rgba(240,201,106,0.16) 0deg 7deg, transparent 7deg 20deg);
          -webkit-mask-image: radial-gradient(circle, #000 18%, transparent 68%);
          mask-image: radial-gradient(circle, #000 18%, transparent 68%);
          animation: dc-spin 40s linear infinite;
        }
        .dc-title {
          background: linear-gradient(120deg, #c8922a 0%, #fff3c4 45%, #f0c96a 60%, #c08828 100%);
          -webkit-background-clip: text; background-clip: text; color: transparent;
        }
        @media (prefers-reduced-motion: reduce) { .dc-rays { animation: none; } }
      `}</style>

      <Confetti />

      <div className="relative min-h-full flex flex-col items-center justify-center px-6 py-12 text-center max-w-md mx-auto">
        <div className="relative mb-2" style={{ width: 240, height: 280 }}>
          <div className="dc-rays" aria-hidden />
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-44 h-44 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(240,201,106,0.35) 0%, transparent 70%)' }}
            aria-hidden
          />
          <motion.div
            className="relative flex justify-center"
            initial={{ scale: 0.2, y: 60, rotate: -12, opacity: 0 }}
            animate={{ scale: 1, y: 0, rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 170, damping: 13, delay: 0.25 }}
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut', delay: 1.4 }}
            >
              <ClearTrophy size={220} animated plaque={plaque} />
            </motion.div>
          </motion.div>
        </div>

        <motion.p {...rise(0.9)} className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#c8922a]">
          Trophy #{clearNumber}
        </motion.p>
        <motion.h1
          {...rise(1.0)}
          className="dc-title text-5xl font-bold tracking-tight mt-2"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Day Cleared
        </motion.h1>
        <motion.p {...rise(1.1)} className="text-zinc-300 text-sm mt-3">
          Every word that was due today — done. Not one left behind.
        </motion.p>

        <motion.div {...rise(1.25)} className="flex gap-8 mt-6">
          <div>
            <p className="text-3xl font-bold text-white tabular-nums" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {clear.words_cleared}
            </p>
            <p className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mt-1">Words reviewed</p>
          </div>
          <div className="w-px bg-[#c8922a]/30" />
          <div>
            <p className="text-3xl font-bold text-white tabular-nums" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {clear.accuracy}%
            </p>
            <p className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mt-1">Accuracy</p>
          </div>
        </motion.div>

        <motion.figure {...rise(1.5)} className="mt-8 px-6 py-5 rounded-2xl border border-[#c8922a]/25 bg-[#c8922a]/[0.06]">
          <blockquote className="text-lg leading-snug text-[#fff3c4] italic" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            “{clear.quote}”
          </blockquote>
          <figcaption className="text-xs text-[#c8922a] mt-3 tracking-wide">— {clear.quote_author}</figcaption>
        </motion.figure>

        <motion.div {...rise(1.7)} className="w-full space-y-3 mt-8">
          <button
            onClick={onViewAll}
            className="w-full py-3.5 rounded-2xl font-bold text-sm text-zinc-900 transition-[filter] hover:brightness-110"
            style={{ background: 'linear-gradient(120deg, #c8922a 0%, #f0c96a 50%, #c08828 100%)', boxShadow: '0 0 32px rgba(240,201,106,0.3)' }}
          >
            See my trophy shelf
          </button>
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl text-sm font-semibold text-zinc-400 border border-white/10 hover:text-white hover:bg-white/5 transition-colors"
          >
            Continue
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}
