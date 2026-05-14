import { motion } from 'framer-motion';
import { ArrowDown, Loader2 } from 'lucide-react';
import type { CREIFeedback, CREIFlaggedCode } from '@/lib/llm';

export interface WritingFeedbackProps {
  feedback: CREIFeedback;
  submitted: boolean;
  onTryAgain: () => void;
  onNewPrompt: () => void;
  generating: boolean;
}

const CRITERIA = ['task_response', 'coherence', 'lexical', 'grammar'] as const;
type Criterion = typeof CRITERIA[number];

const CRITERION_LABELS: Record<Criterion, string> = {
  task_response: 'Task Response',
  coherence: 'Coherence & Cohesion',
  lexical: 'Lexical Resource',
  grammar: 'Grammatical Range',
};

const CODE_LABELS: Record<CREIFlaggedCode, string> = {
  for_that_calque: 'For That',
  missing_article: 'Missing Article',
  where_misuse: 'Where Misuse',
  sv_agreement: 'S-V Agreement',
  off_thesis: 'Off Thesis',
  other: 'Issue',
};

function bandColor(band: number): string {
  if (band >= 7.0) return '#00FFC8';
  if (band >= 6.0) return '#fbbf24';
  return '#ef4444';
}

function bandBg(band: number): string {
  if (band >= 7.0) return 'rgba(0,255,200,0.08)';
  if (band >= 6.0) return 'rgba(251,191,36,0.08)';
  return 'rgba(239,68,68,0.08)';
}

function bandBorder(band: number): string {
  if (band >= 7.0) return 'rgba(0,255,200,0.2)';
  if (band >= 6.0) return 'rgba(251,191,36,0.2)';
  return 'rgba(239,68,68,0.2)';
}

export default function WritingFeedback({
  feedback,
  // submitted: reserved for future "save status" UX
  onTryAgain,
  onNewPrompt,
  generating,
}: WritingFeedbackProps) {
  const overall = feedback.bands.overall;
  const color = bandColor(overall);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="rv-glass rounded-[2rem] p-6 space-y-6"
    >
      {/* ── 1. Overall band tile ─────────────────────────────────── */}
      <div
        className="rounded-2xl p-5"
        style={{ background: bandBg(overall), border: `1px solid ${bandBorder(overall)}` }}
      >
        <div className="flex items-baseline gap-1 mb-3">
          <span
            style={{
              color,
              fontSize: 'clamp(2.5rem, 8vw, 3.5rem)',
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            {overall}
          </span>
          <span className="text-zinc-500 text-xl">/&nbsp;9</span>
        </div>
        <p className="text-white text-base leading-snug">{feedback.verdict}</p>
      </div>

      {/* ── 2. Per-criterion grid ────────────────────────────────── */}
      <div className="space-y-4">
        <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">
          Criteria Breakdown
        </p>
        {CRITERIA.map((key, i) => {
          const band = feedback.bands[key];
          const { diagnosis, example_fix } = feedback.per_criterion[key];
          return (
            <div key={key}>
              {i > 0 && <div className="border-t border-white/5 mb-4" />}
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                  {CRITERION_LABELS[key]}
                </span>
                <span
                  className="text-lg font-bold tabular-nums"
                  style={{ color: bandColor(band), fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {band}
                </span>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">{diagnosis}</p>
              {example_fix && (
                <p className="text-xs text-zinc-400 italic mt-1 leading-relaxed">{example_fix}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* ── 3. Flagged issues ────────────────────────────────────── */}
      {feedback.flagged_issues.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">
            Issues Found
          </p>
          {feedback.flagged_issues.map((issue, i) => (
            <div
              key={i}
              className="rounded-2xl p-4 space-y-1.5"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-md"
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#a1a1aa' }}
                >
                  {CODE_LABELS[issue.code]}
                </span>
                <span className="text-xs text-zinc-400 italic">"{issue.line_reference}"</span>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">{issue.explanation}</p>
              <p className="text-sm leading-relaxed" style={{ color: '#00FFC8' }}>
                → {issue.fix}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── 4. Band 9 rewrite ────────────────────────────────────── */}
      {feedback.band9_rewrite && (
        <div
          className="rounded-2xl p-5 space-y-3"
          style={{ background: 'rgba(0,255,200,0.05)', border: '1px solid rgba(0,255,200,0.18)' }}
        >
          <p
            className="text-[10px] uppercase tracking-widest font-bold"
            style={{ color: '#00FFC8' }}
          >
            Band 9 Rewrite
          </p>
          <p className="text-sm text-zinc-400 italic leading-relaxed">
            "{feedback.band9_rewrite.original_sentence}"
          </p>
          <div className="flex justify-center">
            <ArrowDown className="h-4 w-4" style={{ color: '#00FFC8' }} />
          </div>
          <p className="text-sm text-white font-semibold leading-relaxed">
            "{feedback.band9_rewrite.rewritten}"
          </p>
          <p className="text-xs text-zinc-500 leading-relaxed">
            {feedback.band9_rewrite.why_better}
          </p>
        </div>
      )}

      {/* ── 5. Action row ─────────────────────────────────────────── */}
      <div className="flex gap-3">
        <button onClick={onTryAgain} className="rv-btn-secondary flex-1">
          Try Again
        </button>
        <button onClick={onNewPrompt} disabled={generating} className="rv-btn-mint flex-1">
          {generating ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
          ) : (
            'New Prompt'
          )}
        </button>
      </div>
    </motion.div>
  );
}
