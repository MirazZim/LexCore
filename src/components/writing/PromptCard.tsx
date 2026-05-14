import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';
import type { CREIPrompt } from '@/lib/llm';

export interface PromptCardProps {
  prompt: CREIPrompt;
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  opinion: 'Opinion',
  discussion: 'Discussion',
  'problem-solution': 'Problem & Solution',
  'two-part': 'Two-Part',
};

export default function PromptCard({ prompt }: PromptCardProps) {
  return (
    <motion.div
      key={prompt.prompt}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="rv-glass rounded-[2rem] p-6 space-y-5"
    >
      {/* Header row: lab badge + meta chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="text-[9px] uppercase tracking-[0.25em] font-bold px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(251,191,36,0.07)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.18)' }}
        >
          ✍ Writing Lab
        </span>
        <span
          className="text-[9px] uppercase tracking-[0.2em] font-bold px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(251,191,36,0.07)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.18)' }}
        >
          {QUESTION_TYPE_LABELS[prompt.questionType] ?? prompt.questionType}
        </span>
        <span
          className="text-[9px] uppercase tracking-[0.2em] font-bold px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(56,189,248,0.07)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.18)' }}
        >
          {prompt.domain}
        </span>
      </div>

      {/* Prompt body */}
      <p
        className="text-white leading-relaxed"
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 'clamp(1.1rem, 3vw, 1.4rem)',
          fontWeight: 600,
        }}
      >
        {prompt.prompt}
      </p>

      {/* Tip callout */}
      <div
        className="rounded-2xl p-4 flex gap-3"
        style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.18)' }}
      >
        <Lightbulb className="h-4 w-4 shrink-0 mt-0.5" style={{ color: '#fbbf24' }} />
        <div>
          <p
            className="text-[10px] uppercase tracking-widest font-bold mb-1"
            style={{ color: '#fbbf24' }}
          >
            TIP
          </p>
          <p className="text-sm text-zinc-300 leading-relaxed">{prompt.tip}</p>
        </div>
      </div>
    </motion.div>
  );
}
