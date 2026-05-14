import { motion } from 'framer-motion';
import { ArrowDown, Loader2, TriangleAlert } from 'lucide-react';
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

function bandBorder(band: number): string {
  if (band >= 7.0) return 'rgba(0,255,200,0.16)';
  if (band >= 6.0) return 'rgba(251,191,36,0.16)';
  return 'rgba(239,68,68,0.16)';
}

function BandBar({ value }: { value: number }) {
  const pct = (value / 9) * 100;
  return (
    <div
      className="h-1 w-full rounded-full overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.05)' }}
    >
      <motion.div
        className="h-full rounded-full"
        style={{ background: bandColor(value) }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-3"
    >
      {/* ── 1. Overall score card ─────────────────────────────────── */}
      <div
        className="rounded-3xl p-6"
        style={{
          background: 'rgba(18,18,21,0.7)',
          border: `1px solid ${bandBorder(overall)}`,
          backdropFilter: 'blur(24px)',
        }}
      >
        {/* Top accent */}
        <div
          style={{
            height: '2px',
            background: `linear-gradient(90deg, ${color} 0%, transparent 70%)`,
            margin: '-24px -24px 20px -24px',
            borderRadius: '9999px 9999px 0 0',
          }}
        />

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-2">
              Overall Band
            </p>
            <div className="flex items-baseline gap-1.5">
              <span
                style={{
                  color,
                  fontSize: 'clamp(3rem, 10vw, 4rem)',
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700,
                  lineHeight: 1,
                  textShadow: `0 0 32px ${color}40`,
                }}
              >
                {overall}
              </span>
              <span className="text-zinc-600 text-xl font-medium">/ 9</span>
            </div>
          </div>

          {/* Mini criteria dots */}
          <div className="flex flex-col gap-2 pt-1 shrink-0">
            {CRITERIA.map(k => (
              <div key={k} className="flex items-center gap-2">
                <span className="text-[9px] text-zinc-600 w-16 text-right truncate">
                  {CRITERION_LABELS[k].split(' ')[0]}
                </span>
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: bandColor(feedback.bands[k]) }}
                />
                <span
                  className="text-[10px] font-bold tabular-nums w-6"
                  style={{ color: bandColor(feedback.bands[k]), fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {feedback.bands[k]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-sm text-zinc-300 leading-relaxed mt-4 pt-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          {feedback.verdict}
        </p>
      </div>

      {/* ── 2. Per-criterion breakdown ────────────────────────────── */}
      <div
        className="rounded-3xl p-5 space-y-5"
        style={{
          background: 'rgba(18,18,21,0.7)',
          border: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(24px)',
        }}
      >
        <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500">
          Criteria Breakdown
        </p>

        {CRITERIA.map((key, i) => {
          const band = feedback.bands[key];
          const { diagnosis, example_fix } = feedback.per_criterion[key];
          return (
            <div key={key}>
              {i > 0 && <div className="border-t border-white/[0.04]" style={{ marginBottom: '1.25rem' }} />}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-zinc-400">
                  {CRITERION_LABELS[key]}
                </span>
                <span
                  className="text-sm font-bold tabular-nums"
                  style={{ color: bandColor(band), fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {band}
                </span>
              </div>
              <BandBar value={band} />
              <p className="text-sm text-zinc-400 leading-relaxed mt-2.5">{diagnosis}</p>
              {example_fix && (
                <p
                  className="text-xs leading-relaxed mt-1.5 pl-3"
                  style={{
                    color: '#71717a',
                    borderLeft: '2px solid rgba(255,255,255,0.07)',
                    fontStyle: 'italic',
                  }}
                >
                  {example_fix}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* ── 3. Flagged issues ─────────────────────────────────────── */}
      {feedback.flagged_issues.length > 0 && (
        <div
          className="rounded-3xl p-5 space-y-3"
          style={{
            background: 'rgba(18,18,21,0.7)',
            border: '1px solid rgba(255,255,255,0.07)',
            backdropFilter: 'blur(24px)',
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div
              className="flex items-center justify-center w-5 h-5 rounded-md"
              style={{ background: 'rgba(251,191,36,0.1)' }}
            >
              <TriangleAlert className="h-3 w-3" style={{ color: '#fbbf24' }} />
            </div>
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500">
              Issues Found
            </p>
          </div>

          {feedback.flagged_issues.map((issue, i) => (
            <div
              key={i}
              className="rounded-2xl p-4 space-y-2"
              style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-md"
                  style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}
                >
                  {CODE_LABELS[issue.code]}
                </span>
                <span className="text-[11px] text-zinc-500 italic">"{issue.line_reference}"</span>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">{issue.explanation}</p>
              <p
                className="text-sm leading-relaxed font-medium"
                style={{ color: '#00FFC8' }}
              >
                → {issue.fix}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── 4. Band 9 rewrite ─────────────────────────────────────── */}
      {feedback.band9_rewrite && (
        <div
          className="rounded-3xl p-5 space-y-3"
          style={{
            background: 'rgba(0,255,200,0.03)',
            border: '1px solid rgba(0,255,200,0.14)',
            backdropFilter: 'blur(24px)',
          }}
        >
          <p
            className="text-[10px] uppercase tracking-[0.2em] font-bold"
            style={{ color: '#00FFC8' }}
          >
            Band 9 Rewrite
          </p>
          <p
            className="text-sm text-zinc-500 italic leading-relaxed pl-3"
            style={{ borderLeft: '2px solid rgba(255,255,255,0.08)' }}
          >
            "{feedback.band9_rewrite.original_sentence}"
          </p>
          <div className="flex justify-center py-1">
            <ArrowDown className="h-4 w-4" style={{ color: 'rgba(0,255,200,0.5)' }} />
          </div>
          <p
            className="text-sm font-semibold leading-relaxed pl-3"
            style={{ color: '#fff', borderLeft: '2px solid rgba(0,255,200,0.35)' }}
          >
            "{feedback.band9_rewrite.rewritten}"
          </p>
          <p className="text-xs text-zinc-600 leading-relaxed mt-1">
            {feedback.band9_rewrite.why_better}
          </p>
        </div>
      )}

      {/* ── 5. Action row ─────────────────────────────────────────── */}
      <div className="flex gap-2.5 pt-1">
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
