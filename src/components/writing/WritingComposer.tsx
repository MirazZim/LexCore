import { motion } from 'framer-motion';
import { Loader2, CornerDownLeft } from 'lucide-react';

export interface WritingComposerProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  disabled: boolean;
}

export default function WritingComposer({
  value,
  onChange,
  onSubmit,
  submitting,
  disabled,
}: WritingComposerProps) {
  const count = value.trim().split(/\s+/).filter(Boolean).length;
  const inRange = count >= 120 && count <= 180;
  const countColor = inRange ? '#00FFC8' : count > 0 ? '#fbbf24' : '#3f3f46';

  // Progress bar: 0–100 mapped to 0–180 words, clamped
  const progress = Math.min((count / 180) * 100, 100);
  const targetStart = (120 / 180) * 100;

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !disabled) {
      e.preventDefault();
      onSubmit();
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-3xl overflow-hidden"
      style={{
        background: 'rgba(18,18,21,0.7)',
        border: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(24px)',
      }}
    >
      <div className="p-5 flex flex-col gap-4">
        <textarea
          className="rv-textarea"
          placeholder="Write your CREI paragraph here…"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={submitting}
          style={{
            height: '280px',
            fontSize: '0.95rem',
            lineHeight: '1.75',
            borderRadius: '1rem',
            border: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(255,255,255,0.025)',
            padding: '1rem',
            resize: 'none',
          }}
        />

        {/* Word count progress bar */}
        <div className="space-y-2">
          <div
            className="relative h-1 w-full rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            {/* Target zone highlight */}
            <div
              className="absolute top-0 h-full rounded-full opacity-20"
              style={{
                left: `${targetStart}%`,
                width: `${100 - targetStart}%`,
                background: '#00FFC8',
              }}
            />
            {/* Progress fill */}
            <motion.div
              className="absolute top-0 left-0 h-full rounded-full"
              style={{ background: inRange ? '#00FFC8' : count > 0 ? '#fbbf24' : 'transparent' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>

          <div className="flex items-center justify-between">
            <span
              className="text-[11px] font-semibold tabular-nums"
              style={{ color: countColor }}
            >
              {count > 0
                ? inRange
                  ? `${count} words ✓`
                  : `${count} / 120–180 words`
                : '120–180 word target'}
            </span>
            <span className="text-[10px] text-zinc-600 flex items-center gap-1">
              <CornerDownLeft className="h-2.5 w-2.5" />
              Ctrl+Enter
            </span>
          </div>
        </div>

        <button
          onClick={onSubmit}
          disabled={disabled}
          className="rv-btn-mint"
          style={{ borderRadius: '0.875rem' }}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Grading…
            </>
          ) : (
            'Submit for Grading'
          )}
        </button>
      </div>
    </motion.div>
  );
}
