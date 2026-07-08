import { useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Flame } from 'lucide-react';
import { Rating } from 'ts-fsrs';
import { useSaveReviewSession, useReviewSessions, useUserPreferences } from '@/hooks/useWords';
import { RV_STYLES } from '@/lib/rv-styles';
import { getIdentity } from '@/lib/identity';
import { calculateStreak, dateKey } from '@/lib/streak';
import type { ReviewResult } from './types';

interface SummaryPhaseProps {
  results: ReviewResult[];
  sessionStartedAt: string;
}

// ReviewResult.quality stores ts-fsrs Rating values (Again=1 … Easy=4),
// not the old SM-2 0–5 quality scale.
const QUALITY_LABELS = [
  { quality: Rating.Again, label: 'Again', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  { quality: Rating.Hard,  label: 'Hard',  color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  { quality: Rating.Good,  label: 'Good',  color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  { quality: Rating.Easy,  label: 'Easy',  color: '#00FFC8', bg: 'rgba(0,255,200,0.12)' },
];

const fade = (delay = 0) => ({
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const, delay } },
});

export function SummaryPhase({ results, sessionStartedAt }: SummaryPhaseProps) {
  const navigate    = useNavigate();
  const saveSession = useSaveReviewSession();
  const savedRef    = useRef(false);
  const { data: reviewSessions = [] } = useReviewSessions();
  const { data: prefs } = useUserPreferences();

  const correctCount = results.filter(r => r.correct).length;
  const accuracy     = results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0;
  const avgTimeSec   = results.length > 0
    ? Math.round((Date.now() - new Date(sessionStartedAt).getTime()) / 1000 / results.length)
    : 0;

  // Inject today optimistically — the session just completed even if DB hasn't reflected yet
  const { streak } = useMemo(
    () => calculateStreak(reviewSessions.map(s => s.started_at), prefs?.streak_recovery_date ?? null, dateKey(new Date())),
    [reviewSessions, prefs?.streak_recovery_date],
  );

  const identity    = getIdentity(Math.max(1, streak));
  const progressPct = Math.round(identity.progress * 100);
  const daysToNext  = identity.next ? identity.next.from - identity.daysIn : 0;

  useEffect(() => {
    if (!savedRef.current) {
      savedRef.current = true;
      saveSession.mutate({
        started_at:     sessionStartedAt,
        words_reviewed: results.length,
        words_correct:  correctCount,
        session_type:   'battle',
      });
    }
  }, []);

  return (
    <div className="min-h-screen pb-28" style={{ background: '#07060a' }}>
      <style>{RV_STYLES}</style>
      <style>{`
        .id-card {
          background: linear-gradient(180deg, #0d0a07 0%, #110e0a 100%);
          border: 1px solid rgba(180,140,55,0.32);
          box-shadow:
            inset 0 1px 0 rgba(255,210,100,0.07),
            0 32px 80px rgba(0,0,0,0.7),
            0 0 60px rgba(150,110,30,0.1);
        }
        .id-divider { border-top: 1px solid rgba(180,140,55,0.18); }
        .gold-text {
          background: linear-gradient(120deg, #c8922a 0%, #f0c96a 55%, #c08828 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .gold-bar {
          background: linear-gradient(90deg, #c8922a 0%, #f0c96a 100%);
          box-shadow: 0 0 10px rgba(210,155,50,0.45);
        }
      `}</style>

      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0 } } }}
        className="max-w-lg mx-auto px-4 pt-10 space-y-6"
      >

        {/* ── 1. Hero Header ─────────────────────────────────────────── */}
        <motion.div variants={fade(0)} className="text-center">
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.3em] mb-4"
            style={{ background: 'rgba(0,255,200,0.07)', color: '#00FFC8', border: '1px solid rgba(0,255,200,0.16)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#00FFC8] animate-pulse" />
            Session Complete
          </div>
          <h1
            className="text-[2.6rem] font-bold text-white leading-[1.1] tracking-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            You&apos;re becoming<br />someone.
          </h1>
          <p className="mt-3 text-zinc-500 text-sm">
            Day {identity?.daysIn ?? 1} of your journey
          </p>
        </motion.div>

        {/* ── 2. Identity Card ───────────────────────────────────────── */}
        {identity && (
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 28, scale: 0.96 },
              show:   { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const, delay: 0.08 } },
            }}
            className="id-card rounded-[2rem] overflow-hidden"
          >
            {/* Fresco image — full illustration, no crop */}
            <div
              className="w-full flex items-center justify-center"
              style={{ height: 320, background: '#0c0907' }}
            >
              <img
                src={identity.current.image}
                alt={identity.current.name}
                style={{
                  display:    'block',
                  maxHeight:  '100%',
                  maxWidth:   '100%',
                  width:      'auto',
                  height:     'auto',
                  objectFit:  'contain',
                }}
              />
            </div>

            {/* Title + progress */}
            <div className="id-divider px-7 py-6">
              <div className="flex items-baseline justify-between mb-4">
                <span
                  className="gold-text text-[1.65rem] font-bold tracking-tight"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {identity.current.name}
                </span>
                <span className="text-zinc-500 text-sm font-medium tabular-nums">
                  Day {identity.daysIn}
                </span>
              </div>

              <div
                className="h-1.5 w-full rounded-full overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                <div
                  className="gold-bar h-full rounded-full transition-all duration-700"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              <p
                className="mt-2.5 text-[11px] font-semibold tracking-wide"
                style={{ color: 'rgba(192,148,60,0.75)' }}
              >
                {identity.next
                  ? `${daysToNext} day${daysToNext === 1 ? '' : 's'} to ${identity.next.name}`
                  : "You've reached the highest title"}
              </p>
            </div>
          </motion.div>
        )}

        {/* ── 3. Stats row ──────────────────────────────────────────── */}
        <motion.div variants={fade(0.18)} className="flex gap-3">
          {[
            { label: 'Words Reviewed', value: String(results.length) },
            { label: 'Accuracy',       value: `${accuracy}%`         },
            { label: 'Avg Time',       value: `${avgTimeSec}s`       },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="flex-1 flex flex-col items-center gap-1 py-4 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span
                className="text-2xl font-bold text-white"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {value}
              </span>
              <span className="text-[9px] uppercase tracking-widest font-bold text-zinc-600">{label}</span>
            </div>
          ))}
        </motion.div>

        {/* ── 4. Quality distribution ───────────────────────────────── */}
        <motion.div
          variants={fade(0.26)}
          className="rounded-[1.5rem] px-6 py-5"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-[9px] uppercase tracking-widest font-bold text-zinc-600 mb-4">
            Rating Breakdown
          </p>
          <div className="flex gap-2">
            {QUALITY_LABELS.map(({ quality, label, color, bg }) => {
              const count = results.filter(r => r.quality === quality).length;
              return (
                <div
                  key={quality}
                  className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl"
                  style={{
                    background: count > 0 ? bg : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${count > 0 ? color + '33' : 'rgba(255,255,255,0.04)'}`,
                  }}
                >
                  <span
                    className="text-xl font-bold"
                    style={{ fontFamily: "'Space Grotesk', sans-serif", color: count > 0 ? color : '#3f3f46' }}
                  >
                    {count}
                  </span>
                  <span
                    className="text-[9px] uppercase tracking-wider font-bold"
                    style={{ color: count > 0 ? color : '#3f3f46' }}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* ── 5. Streak ─────────────────────────────────────────────── */}
        {streak > 0 && (
          <motion.div
            variants={fade(0.34)}
            className="flex items-center justify-center gap-2"
          >
            <Flame className="h-4 w-4 shrink-0" style={{ color: '#f97316' }} />
            <span className="text-sm font-bold text-white">{streak}</span>
            <span className="text-sm text-zinc-500">day streak</span>
          </motion.div>
        )}

        {/* ── CTA ───────────────────────────────────────────────────── */}
        <motion.div variants={fade(0.42)}>
          <button
            onClick={() => navigate('/')}
            disabled={saveSession.isPending}
            className="rv-btn-mint"
          >
            {saveSession.isPending ? 'Saving…' : 'Back to Dashboard'}
          </button>
        </motion.div>

      </motion.div>
    </div>
  );
}
