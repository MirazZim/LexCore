import { motion } from 'framer-motion';
import { Brain, ArrowRight, Lightbulb } from 'lucide-react';
import type { DueWordItem } from './types';

interface Props {
  currentItem: DueWordItem;
  currentIndex: number;
  onNext: () => void;
}

const TECHNIQUE_LABELS: Record<string, string> = {
  phonetic_split:  '🔤 Phonetic Split',
  root_hook:       '🌱 Root Hook',
  sound_alike:     '🔊 Sound-Alike',
  micro_story:     '📖 Micro Story',
  formula:         '⚡ Formula',
  contrast_anchor: '↔️ Contrast',
  analogy_bridge:  '🔗 Analogy',
};

function detectTechnique(breakdown: string): string | null {
  if (/\+.*→/.test(breakdown)) return TECHNIQUE_LABELS.phonetic_split;
  if (/sounds? like/i.test(breakdown)) return TECHNIQUE_LABELS.sound_alike;
  if (/=.*\+/.test(breakdown)) return TECHNIQUE_LABELS.formula;
  if (/\bNOT\b/.test(breakdown)) return TECHNIQUE_LABELS.contrast_anchor;
  if (/like .* but/i.test(breakdown)) return TECHNIQUE_LABELS.analogy_bridge;
  return null;
}

export function MemoryTrickPhase({ currentItem, onNext }: Props) {
  const raw = currentItem.word.emotion_anchor ?? '';
  const newlineIdx = raw.indexOf('\n');
  const breakdown = newlineIdx !== -1 ? raw.slice(0, newlineIdx).trim() : raw.trim();
  const clarification = newlineIdx !== -1 ? raw.slice(newlineIdx + 1).trim() : '';

  const techniqueLabel = detectTechnique(breakdown);

  return (
    <motion.div
      key={`memory-trick-${currentItem.word.id}`}
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -22 }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-4"
    >
      {/* Phase header */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: '#52525b' }}>
          Memory Hook
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: '#3f3f46' }}>
          Reinforce it
        </span>
      </div>

      {/* Main card */}
      <div className="rv-glass rounded-[1.75rem] overflow-hidden">

        {/* Amber top strip */}
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, rgba(251,191,36,0.6) 0%, rgba(251,191,36,0.15) 100%)' }} />

        <div className="p-6 space-y-5">
          {/* Word + icon row */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)' }}>
              <Brain className="w-5 h-5" style={{ color: '#fbbf24' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: '#52525b' }}>
                Memory Trick
              </p>
              <h2 className="text-2xl font-bold text-white leading-none truncate"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {currentItem.word.word}
              </h2>
            </div>
            {techniqueLabel && (
              <span className="flex-shrink-0 text-[9px] font-bold px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>
                {techniqueLabel}
              </span>
            )}
          </div>

          {/* Definition */}
          <p className="text-xs leading-relaxed" style={{ color: '#71717a' }}>
            {currentItem.word.definition}
          </p>

          {/* Trick card */}
          <div className="rounded-2xl p-4 space-y-2.5"
            style={{ background: 'rgba(251,191,36,0.06)', border: '1.5px solid rgba(251,191,36,0.22)' }}>
            <div className="flex items-start gap-2.5">
              <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#fbbf24' }} />
              <p className="text-sm font-semibold leading-snug" style={{ color: '#fde68a' }}>
                {breakdown}
              </p>
            </div>
            {clarification && (
              <p className="text-xs leading-relaxed pl-6" style={{ color: '#71717a' }}>
                {clarification}
              </p>
            )}
          </div>

          {/* Nudge */}
          <p className="text-[10px] text-center font-medium" style={{ color: '#3f3f46' }}>
            This trick was built from the word itself — not guesswork.
          </p>
        </div>
      </div>

      {/* CTA */}
      <button onClick={onNext} className="rv-btn-mint">
        <Brain className="w-4 h-4" />
        Got it · Continue
        <ArrowRight className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
