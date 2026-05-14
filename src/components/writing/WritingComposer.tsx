import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

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
  const countColor = inRange ? '#00FFC8' : '#fbbf24';
  const countLabel = inRange ? `${count} words ✓` : `${count} / 120–180 target`;

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !disabled) {
      e.preventDefault();
      onSubmit();
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="rv-glass rounded-[2rem] p-6 space-y-3"
    >
      <textarea
        className="rv-textarea"
        placeholder="Write your CREI paragraph here…"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={8}
        disabled={submitting}
        style={{ minHeight: '180px' }}
      />

      <div className="flex items-center gap-3">
        <span
          className="text-[11px] font-semibold shrink-0 tabular-nums"
          style={{ color: countColor }}
        >
          {countLabel}
        </span>
        <div className="flex-1">
          <button
            onClick={onSubmit}
            disabled={disabled}
            className="rv-btn-mint"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Grading…
              </>
            ) : (
              'Submit'
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
