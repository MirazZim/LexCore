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

const FOOTER_INSTRUCTION: Record<string, string> = {
  opinion: 'Give reasons for your answer and include any relevant examples from your own experience or knowledge.',
  discussion: 'Discuss both views and give your own opinion, supported with reasons and examples.',
  'problem-solution': 'Identify the key problem(s) and suggest practical solutions, using relevant examples.',
  'two-part': 'Give a full and balanced answer to both parts of the question.',
};

export default function PromptCard({ prompt }: PromptCardProps) {
  const footer = FOOTER_INSTRUCTION[prompt.questionType]
    ?? 'Give reasons for your answer and include any relevant examples.';

  return (
    <motion.div
      key={prompt.prompt}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-3xl overflow-hidden"
      style={{
        background: 'rgba(14,14,17,0.85)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(24px)',
      }}
    >
      {/* Top stripe */}
      <div style={{ height: '2px', background: 'linear-gradient(90deg, rgba(251,191,36,0.9) 0%, rgba(251,191,36,0.15) 55%, transparent 100%)' }} />

      <div style={{ padding: '24px 24px 20px' }}>

        {/* Header row */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <span
            className="text-[10px] uppercase tracking-[0.25em] font-bold"
            style={{ color: 'rgba(251,191,36,0.7)', letterSpacing: '0.22em' }}
          >
            Writing Task 2
          </span>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <span
              className="text-[9px] uppercase tracking-[0.15em] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(251,191,36,0.07)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.15)' }}
            >
              {QUESTION_TYPE_LABELS[prompt.questionType] ?? prompt.questionType}
            </span>
            <span
              className="text-[9px] uppercase tracking-[0.15em] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(56,189,248,0.07)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.14)' }}
            >
              {prompt.domain}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginBottom: '20px' }} />

        {/* Preamble */}
        <p
          className="text-zinc-400 mb-1"
          style={{ fontSize: '0.8rem', lineHeight: 1.6 }}
        >
          You should spend about 40 minutes on this task.
        </p>
        <p
          className="text-zinc-300 mb-4"
          style={{ fontSize: '0.85rem', fontWeight: 500, lineHeight: 1.6 }}
        >
          Write about the following topic:
        </p>

        {/* Prompt box — the exam question */}
        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderLeft: '3px solid rgba(251,191,36,0.6)',
            borderRadius: '12px',
            padding: '18px 20px',
            marginBottom: '20px',
          }}
        >
          <p
            className="text-white leading-relaxed"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 'clamp(0.95rem, 2.5vw, 1.1rem)',
              fontWeight: 600,
              fontStyle: 'italic',
              lineHeight: 1.65,
            }}
          >
            {prompt.prompt}
          </p>
        </div>

        {/* Footer instructions */}
        <p
          className="text-zinc-400 mb-2"
          style={{ fontSize: '0.8rem', lineHeight: 1.65 }}
        >
          {footer}
        </p>
        <p
          className="text-zinc-500"
          style={{ fontSize: '0.8rem', fontWeight: 500 }}
        >
          Write one well-developed body paragraph (120–180 words).
        </p>

        {/* Divider */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', margin: '20px 0 16px' }} />

        {/* Tip */}
        <div className="flex gap-3">
          <div
            className="flex items-center justify-center shrink-0 rounded-lg mt-0.5"
            style={{ width: '22px', height: '22px', background: 'rgba(251,191,36,0.1)' }}
          >
            <Lightbulb className="h-3 w-3" style={{ color: '#fbbf24' }} />
          </div>
          <div>
            <p
              className="text-[9px] uppercase tracking-[0.2em] font-bold mb-1"
              style={{ color: 'rgba(251,191,36,0.7)' }}
            >
              Examiner's tip
            </p>
            <p className="text-zinc-400 leading-relaxed" style={{ fontSize: '0.8rem' }}>
              {prompt.tip}
            </p>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
