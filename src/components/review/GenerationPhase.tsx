import { motion } from 'framer-motion';
import { Loader2, RotateCcw } from 'lucide-react';
import type { DueWordItem, AiFeedback } from './types';

interface GenerationPhaseProps {
  currentItem: DueWordItem;
  currentIndex: number;
  totalWords: number;
  generationText: string;
  generationSaved: boolean;
  aiFeedback: AiFeedback | null;
  aiLoading: boolean;
  aiError: boolean;
  isSaving: boolean;
  onGenerationTextChange: (value: string) => void;
  onSave: () => void;
  onNextWord: () => void;
  onRetry: () => void;
}

const verdictConfig = {
  natural:   { bg: 'rgba(0,255,200,0.1)',   border: 'rgba(0,255,200,0.3)',   color: '#00FFC8', label: '✓ Natural' },
  close:     { bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.3)',  color: '#f97316', label: '⚡ Almost there' },
  unnatural: { bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)',   color: '#ef4444', label: '✗ Try again' },
} as const;

export function GenerationPhase({
  currentItem, currentIndex, totalWords, generationText, generationSaved,
  aiFeedback, aiLoading, aiError, isSaving,
  onGenerationTextChange, onSave, onNextWord, onRetry,
}: GenerationPhaseProps) {
  const verdict = aiFeedback
    ? verdictConfig[aiFeedback.verdict as keyof typeof verdictConfig] ?? verdictConfig.close
    : null;

  return (
    <motion.div
      key={`gen-${currentIndex}`}
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.3 }}
    >
      <div className="rv-glass rounded-[2rem] p-8 mt-4">
        <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-2">
          Generation Lab
        </p>
        <h2
          className="text-3xl font-bold mb-1"
          style={{ color: '#00FFC8', fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {currentItem.word.word}
        </h2>
        <p className="text-zinc-400 text-sm mb-6">{currentItem.word.definition}</p>

        <p className="text-white font-semibold mb-3">Write your own sentence using this word:</p>

        {!generationSaved ? (
          <div className="space-y-3">
            <textarea
              className="rv-textarea"
              placeholder="Type your sentence…"
              value={generationText}
              onChange={e => onGenerationTextChange(e.target.value)}
            />
            <button
              onClick={onSave}
              disabled={!generationText.trim() || isSaving || aiLoading}
              className="rv-btn-mint"
            >
              {isSaving || aiLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking…
                </>
              ) : 'Submit'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Submitted sentence */}
            <div
              className="rounded-xl p-4"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <p className="text-zinc-200 text-sm">"{generationText}"</p>
              <p className="text-[10px] text-zinc-600 mt-1">— My sentence</p>
            </div>

            {/* AI loading */}
            {aiLoading && (
              <div className="flex items-center gap-2 text-zinc-500 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#00FFC8' }} />
                Checking your sentence…
              </div>
            )}

            {/* AI feedback */}
            {aiFeedback && verdict && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="rounded-xl p-5 space-y-3"
                style={{ background: verdict.bg, border: `1px solid ${verdict.border}` }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="rounded-full px-3 py-1 text-xs font-bold"
                    style={{ background: 'rgba(0,0,0,0.3)', color: verdict.color }}
                  >
                    {verdict.label}
                  </span>
                  <span
                    className="text-2xl font-bold"
                    style={{ color: verdict.color, fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {aiFeedback.score}<span className="text-base text-zinc-500">/10</span>
                  </span>
                </div>

                <p className="text-sm text-zinc-300">
                  <span className="font-semibold" style={{ color: '#00FFC8' }}>What worked: </span>
                  {aiFeedback.what_worked}
                </p>

                {aiFeedback.fix && (
                  <p className="text-sm text-zinc-300">
                    <span className="font-semibold" style={{ color: '#f97316' }}>Fix: </span>
                    {aiFeedback.fix}
                  </p>
                )}

                {aiFeedback.better_example && (
                  <blockquote
                    className="text-sm text-zinc-400 italic pl-3"
                    style={{ borderLeft: '2px solid rgba(255,255,255,0.15)' }}
                  >
                    {aiFeedback.better_example}
                  </blockquote>
                )}
              </motion.div>
            )}

            {aiError && (
              <p className="text-sm text-zinc-500">
                AI feedback unavailable — your sentence was saved.
              </p>
            )}

            {!aiLoading && (
              <div className="flex gap-3">
                <button
                  onClick={onRetry}
                  className="flex items-center justify-center gap-2 flex-1 rounded-2xl py-3 text-sm font-bold transition-all active:scale-95"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#a1a1aa',
                  }}
                >
                  <RotateCcw className="h-4 w-4" />
                  Try Again
                </button>
                <button onClick={onNextWord} className="rv-btn-mint flex-1">
                  {currentIndex + 1 >= totalWords ? 'View Summary' : 'Next Word'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
