import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import type { DueWordItem, WordContext } from './types';

interface ContextPhaseProps {
  currentItem: DueWordItem;
  currentIndex: number;
  clozeContext: WordContext | null;
  clozeLoading: boolean;
  clozeAnswer: string;
  clozeSubmitted: boolean;
  onClozeAnswerChange: (value: string) => void;
  onClozeSubmit: () => void;
  onClozeNext: () => void;
}

export function ContextPhase({
  currentItem, currentIndex, clozeContext, clozeLoading,
  clozeAnswer, clozeSubmitted, onClozeAnswerChange, onClozeSubmit, onClozeNext,
}: ContextPhaseProps) {
  const clozeSentence = clozeContext?.sentence.replace(
    new RegExp(currentItem.word.word, 'gi'),
    '______'
  );
  const isClozeCorrect = clozeAnswer.toLowerCase().trim() === currentItem.word.word.toLowerCase();

  return (
    <motion.div
      key={`context-${currentIndex}`}
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.3 }}
    >
      <div className="rv-glass rounded-[2rem] p-8 mt-4">
        <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-1">
          Context Theater
        </p>
        <p className="text-lg font-bold text-white mb-6" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Fill in the blank:
        </p>

        {clozeLoading ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-4 w-full rounded-lg bg-zinc-800/60" />
            <Skeleton className="h-4 w-4/5 rounded-lg bg-zinc-800/60" />
            <Skeleton className="h-4 w-3/5 rounded-lg bg-zinc-800/60" />
          </div>
        ) : clozeSentence ? (
          <>
            <p
              className="text-zinc-300 text-base leading-relaxed mb-6 p-4 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              "{clozeSentence}"
            </p>

            {!clozeSubmitted ? (
              <div className="space-y-3">
                <input
                  className="rv-input"
                  placeholder="Type the missing word…"
                  value={clozeAnswer}
                  onChange={e => onClozeAnswerChange(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && clozeAnswer.trim() && onClozeSubmit()}
                />
                <button
                  onClick={onClozeSubmit}
                  disabled={!clozeAnswer.trim()}
                  className="rv-btn-mint"
                >
                  Check
                </button>
              </div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div
                  className="rounded-xl p-4 mb-4"
                  style={{
                    background: isClozeCorrect ? 'rgba(0,255,200,0.08)' : 'rgba(239,68,68,0.08)',
                    border: `1px solid ${isClozeCorrect ? 'rgba(0,255,200,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  }}
                >
                  <p className="font-bold" style={{ color: isClozeCorrect ? '#00FFC8' : '#ef4444' }}>
                    {isClozeCorrect
                      ? '✓ Correct!'
                      : `✗ The answer was "${currentItem.word.word}"`}
                  </p>
                  {!isClozeCorrect && (
                    <p className="text-sm text-zinc-400 mt-1">{currentItem.word.definition}</p>
                  )}
                </div>
                <button onClick={onClozeNext} className="rv-btn-mint">
                  Continue
                </button>
              </motion.div>
            )}
          </>
        ) : (
          <div className="text-center py-6">
            <p className="text-zinc-500 mb-4">No context sentence available</p>
            <button onClick={onClozeNext} className="rv-btn-secondary">
              Skip to next phase
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
