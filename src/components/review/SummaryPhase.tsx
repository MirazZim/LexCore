import { useEffect, useRef, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Flame, ArrowRight } from 'lucide-react';
import { useIsMutating } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Rating } from 'ts-fsrs';
import { useSaveReviewSession, useReviewSessions, useReviewEvents, useUserPreferences, useDueWords, RATING_MUTATION_KEY } from '@/hooks/useWords';
import { REVIEW_CHUNK_SIZE, chunkSizes, dayProgress } from '@/lib/review-chunks';
import { quoteForDay, type DailyClear } from '@/lib/daily-clears';
import { useDailyClears, useRecordDailyClear } from '@/hooks/useDailyClears';
import { DayClearedCelebration } from '@/components/achievements/DayClearedCelebration';
import { GlassTrophy } from '@/components/achievements/GlassTrophy';
import { Confetti } from '@/components/achievements/Confetti';
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
  { quality: Rating.Again, label: 'Again', dark: '#f87171' },
  { quality: Rating.Hard,  label: 'Hard',  dark: '#fb923c' },
  { quality: Rating.Good,  label: 'Good',  dark: '#60a5fa' },
  { quality: Rating.Easy,  label: 'Easy',  dark: '#34d399' },
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
  const { data: reviewEvents = [], isFetching: eventsFetching } = useReviewEvents();
  const { data: prefs } = useUserPreferences();
  const { data: clears = [], isLoading: clearsLoading } = useDailyClears();
  const recordClear = useRecordDailyClear();
  const [celebration, setCelebration] = useState<DailyClear | null>(null);
  // Decided once the due list settles: a regular set gets a small pop, the
  // set that clears the day gets the full celebration.
  const [setOutcome, setSetOutcome] = useState<'pending' | 'set' | 'day'>('pending');
  const clearCheckedRef = useRef(false);
  const { data: dueWords = [], isFetching: dueFetching } = useDueWords();
  // Only this set's rating writes matter here — not the session save fired on mount
  const pendingWrites = useIsMutating({ mutationKey: RATING_MUTATION_KEY });
  // The due list only settles once this set's stat writes and the refetch
  // they trigger are done; until then the count still includes these words.
  const dueSettled    = !dueFetching && pendingWrites === 0;
  const progressReady = dueSettled && !eventsFetching;

  // Until the writes and refetches land (the review log is re-downloaded in
  // full, which takes seconds), assume what we already know: this set's words
  // were reviewed today and have left the due list. Swapped for the real
  // numbers once they settle, so the page never waits on the network to speak.
  const dueIds = useMemo(() => {
    const all = dueWords.map(d => d.word.id);
    if (dueSettled) return all;
    const reviewed = new Set(results.map(r => r.wordId));
    return all.filter(id => !reviewed.has(id));
  }, [dueWords, dueSettled, results]);
  const progressEvents = useMemo(() => {
    if (progressReady) return reviewEvents;
    const now = new Date().toISOString();
    return [...reviewEvents, ...results.map(r => ({ word_id: r.wordId, reviewed_at: now }))];
  }, [reviewEvents, progressReady, results]);

  const remainingDue  = dueIds.length;
  const nextSetSize   = Math.min(REVIEW_CHUNK_SIZE, remainingDue);
  const setsLeft      = chunkSizes(remainingDue).length;
  const progress      = dayProgress(progressEvents, dueIds);
  // Where the liquid stood before this set, so the pour visibly rises
  const fromPercent   = progress.total > 0
    ? Math.round((Math.max(0, progress.done - results.length) / progress.total) * 100)
    : 0;
  const setsTotal     = chunkSizes(progress.total).length;
  const setsDone      = setsTotal - setsLeft;

  const correctCount = results.filter(r => r.correct).length;
  const accuracy     = results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0;
  const avgTimeSec   = results.length > 0
    ? Math.round((Date.now() - new Date(sessionStartedAt).getTime()) / 1000 / results.length)
    : 0;

  // Inject today optimistically — the session just completed even if DB hasn't reflected yet
  const { streak } = useMemo(
    () => calculateStreak(
      [...reviewSessions.map(s => s.started_at), ...reviewEvents.map(e => e.reviewed_at)],
      prefs?.streak_recovery_date ?? null,
      dateKey(new Date()),
    ),
    [reviewSessions, reviewEvents, prefs?.streak_recovery_date],
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

  // Today's trophy: once this set's writes have settled, an empty due list
  // means the whole day is cleared. Checked once per summary, minted once per day.
  useEffect(() => {
    if (clearCheckedRef.current || results.length === 0) return;
    if (!dueSettled || eventsFetching || clearsLoading) return;
    clearCheckedRef.current = true;

    const today = dateKey(new Date());
    if (remainingDue > 0 || clears.some(c => c.day === today)) {
      setSetOutcome('set');
      return;
    }

    const todays = reviewEvents.filter(e => dateKey(new Date(e.reviewed_at)) === today);
    const good = todays.filter(e => e.rating >= Rating.Good).length;
    const quote = quoteForDay(today);
    const clear = {
      day: today,
      words_cleared: new Set(todays.map(e => e.word_id)).size || results.length,
      accuracy: todays.length > 0 ? Math.round((good / todays.length) * 100) : accuracy,
      quote: quote.text,
      quote_author: quote.author,
    };
    // Celebrate immediately; the moment shouldn't wait on (or vanish with) the save
    setSetOutcome('day');
    setCelebration({ ...clear, id: 'pending', created_at: new Date().toISOString() });
    recordClear.mutate(clear, {
      onSuccess: saved => setCelebration(c => (c ? saved : c)),
      onError: () => toast.error("Couldn't save today's trophy to your achievements"),
    });
  }, [dueSettled, eventsFetching, clearsLoading, remainingDue, clears, reviewEvents, results.length, accuracy, recordClear]);

  const ratingCounts = QUALITY_LABELS.map(q => ({ ...q, count: results.filter(r => r.quality === q.quality).length }));
  const showProgress = results.length > 0 && progress.total > 0;

  return (
    <div className="sm-root min-h-screen lg:h-screen lg:overflow-hidden flex flex-col">
      <style>{RV_STYLES}</style>
      <style>{`
        .sm-root {
          background:
            radial-gradient(ellipse 60% 50% at 18% 30%, rgba(240,201,106,0.09) 0%, transparent 70%),
            radial-gradient(ellipse 50% 40% at 85% 10%, rgba(0,255,200,0.06) 0%, transparent 70%),
            #07060a;
        }
        .sm-panel {
          background: linear-gradient(180deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.015) 100%);
          border: 1px solid rgba(255,255,255,0.07);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
        }
        .sm-stage {
          background:
            radial-gradient(circle at 50% 42%, rgba(240,201,106,0.2) 0%, rgba(240,201,106,0.04) 38%, transparent 62%),
            linear-gradient(180deg, #110d08 0%, #0b0906 100%);
          border: 1px solid rgba(180,140,55,0.3);
          box-shadow: inset 0 1px 0 rgba(255,210,100,0.08), 0 30px 80px rgba(0,0,0,0.5);
        }
        .sm-stage-floor {
          background: radial-gradient(ellipse at 50% 50%, rgba(240,201,106,0.22) 0%, transparent 70%);
        }
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
        @keyframes sm-shimmer { 0% { background-position: -120% 0; } 100% { background-position: 220% 0; } }
        .sm-seg-new {
          background: linear-gradient(90deg, #c8922a 0%, #fff3c4 50%, #c8922a 100%);
          background-size: 200% 100%;
          animation: sm-shimmer 2.2s ease-in-out infinite;
          box-shadow: 0 0 12px rgba(240,201,106,0.6);
        }
        .sm-btn-next {
          background: linear-gradient(120deg, #c8922a 0%, #f0c96a 50%, #c08828 100%);
          box-shadow: 0 0 28px rgba(240,201,106,0.25);
          transition: filter 0.15s, transform 0.15s;
        }
        .sm-btn-next:hover { filter: brightness(1.1); }
        .sm-btn-next:active { transform: scale(0.985); }
        .sm-btn-next:disabled { opacity: 0.4; filter: none; cursor: not-allowed; }
        @media (prefers-reduced-motion: reduce) { .sm-seg-new { animation: none; } }
      `}</style>

      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
        className="w-full max-w-[56rem] mx-auto px-4 sm:px-6 py-6 lg:py-8 flex-1 flex flex-col gap-4 lg:gap-5 lg:min-h-0"
      >

        {/* ── Header strip ──────────────────────────────────────────── */}
        <motion.header variants={fade(0)} className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.3em] mb-2"
              style={{ background: 'rgba(0,255,200,0.12)', color: '#00FFC8' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#00FFC8] animate-pulse" />
              Session Complete
            </div>
            <h1
              className="text-3xl font-bold text-white leading-tight tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              You&apos;re becoming someone.
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {streak > 0 && (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold text-white"
                style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.3)' }}
              >
                <Flame className="h-4 w-4" style={{ color: '#f97316' }} />
                {streak}
                <span className="font-medium text-zinc-400">day streak</span>
              </span>
            )}
          </div>
        </motion.header>

        {/* ── Bento ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 lg:flex-1 lg:min-h-0">

          {/* Trophy stage */}
          <motion.section
            variants={fade(0.06)}
            className="sm-stage lg:col-span-5 rounded-[2rem] p-6 flex flex-col items-center justify-between text-center relative overflow-hidden"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#c8922a]">
              {showProgress
                ? setsTotal > 1 ? `Set ${setsDone} of ${setsTotal} conquered` : "Today's review conquered"
                : "Today's progress"}
            </p>

            <div className="relative flex-1 flex items-center justify-center w-full min-h-[200px]">
              <div className="sm-stage-floor absolute bottom-2 left-1/2 -translate-x-1/2 w-56 h-10" aria-hidden />
              {showProgress ? (
                <div className="w-[190px] lg:w-[min(230px,32vh)]">
                  <GlassTrophy percent={progress.percent} fromPercent={fromPercent} fluid />
                </div>
              ) : (
                <div className="w-[190px] lg:w-[min(230px,32vh)] aspect-[5/6] rounded-3xl bg-white/[0.03] animate-pulse" />
              )}
            </div>

            <div className="w-full">
              <p className="text-white font-bold text-xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {!showProgress
                  ? 'Measuring today…'
                  : progress.percent >= 100 ? 'Today is conquered.' : `${progress.percent}% of today conquered`}
              </p>
              {showProgress && (
                <>
                  {setsTotal > 1 && (
                    <div className="flex gap-1.5 mt-4" aria-hidden>
                      {Array.from({ length: setsTotal }, (_, i) => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full ${i === setsDone - 1 ? 'sm-seg-new' : i < setsDone ? 'gold-bar' : ''}`}
                          style={i >= setsDone ? { background: 'rgba(255,255,255,0.08)' } : undefined}
                        />
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-zinc-500 mt-2.5 tabular-nums">
                    {progress.done} of {progress.total} words done today
                  </p>
                </>
              )}
            </div>
          </motion.section>

          {/* Right column */}
          <div className="lg:col-span-7 flex flex-col gap-4 lg:gap-5 lg:min-h-0">

            {/* Identity — horizontal */}
            {identity && (
              <motion.section
                variants={fade(0.12)}
                className="sm-panel rounded-[2rem] p-3 flex items-center lg:items-stretch gap-4 lg:gap-6 lg:flex-1 lg:min-h-0"
                style={{ borderColor: 'rgba(180,140,55,0.25)' }}
              >
                <div className="shrink-0 h-28 w-28 sm:h-36 sm:w-36 lg:h-auto lg:w-auto lg:max-w-[48%] aspect-square rounded-[1.4rem] overflow-hidden bg-[#0c0907]">
                  <img src={identity.current.image} alt={identity.current.name} className="h-full w-full object-cover" />
                </div>
                <div className="flex-1 min-w-0 pr-3 lg:pr-5 lg:self-center">
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">Your title</p>
                  <div className="flex items-baseline justify-between gap-2 mt-1">
                    <span className="gold-text text-2xl sm:text-3xl lg:text-3xl font-bold tracking-tight truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {identity.current.name}
                    </span>
                    <span className="text-zinc-500 text-sm font-medium tabular-nums shrink-0">Day {identity.daysIn}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full overflow-hidden mt-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="gold-bar h-full rounded-full transition-all duration-700" style={{ width: `${progressPct}%` }} />
                  </div>
                  <p className="mt-2 text-[11px] font-semibold tracking-wide" style={{ color: 'rgba(192,148,60,0.8)' }}>
                    {identity.next
                      ? `${daysToNext} day${daysToNext === 1 ? '' : 's'} to ${identity.next.name}`
                      : "You've reached the highest title"}
                  </p>
                </div>
              </motion.section>
            )}

            {/* Stats + rating bar */}
            <motion.section variants={fade(0.18)} className="sm-panel rounded-[2rem] p-5">
              <div className="grid grid-cols-3 divide-x divide-white/[0.07]">
                {[
                  { label: 'Words', value: String(results.length) },
                  { label: 'Accuracy', value: `${accuracy}%` },
                  { label: 'Avg time', value: `${avgTimeSec}s` },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <p className="text-2xl sm:text-3xl font-bold text-white tabular-nums" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {value}
                    </p>
                    <p className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mt-1">{label}</p>
                  </div>
                ))}
              </div>

              <div className="flex h-2 rounded-full overflow-hidden mt-5 gap-0.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
                {ratingCounts.filter(r => r.count > 0).map(r => (
                  <motion.div
                    key={r.quality}
                    initial={{ flexGrow: 0 }}
                    animate={{ flexGrow: r.count }}
                    transition={{ duration: 0.9, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    style={{ background: r.dark, flexBasis: 0 }}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-2.5">
                {ratingCounts.map(r => (
                  <span key={r.quality} className="inline-flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: r.count > 0 ? r.dark : '#52525b' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: r.count > 0 ? r.dark : '#3f3f46' }} />
                    {r.label}
                    <span className="tabular-nums text-zinc-400">{r.count}</span>
                  </span>
                ))}
              </div>
            </motion.section>

            {/* Actions */}
            <motion.div variants={fade(0.24)} className="flex flex-col sm:flex-row gap-3">
              {dueSettled && remainingDue > 0 ? (
                <>
                  <button
                    onClick={() => navigate('/review')}
                    className="sm-btn-next flex-[2] flex items-center justify-between gap-3 px-6 py-4 rounded-2xl text-zinc-900"
                  >
                    <span className="text-left">
                      <span className="block font-bold text-base">Next set · {nextSetSize} word{nextSetSize > 1 ? 's' : ''}</span>
                      <span className="block text-[11px] font-semibold text-zinc-900/60">
                        {setsLeft} set{setsLeft > 1 ? 's' : ''} left · {remainingDue} still due
                      </span>
                    </span>
                    <ArrowRight className="h-5 w-5 shrink-0" />
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className="flex-1 py-4 rounded-2xl text-sm font-semibold text-zinc-300 border border-white/10 hover:bg-white/[0.05] hover:text-white transition-colors"
                  >
                    ☕ Take a break
                  </button>
                </>
              ) : (
                <button
                  onClick={() => navigate('/')}
                  disabled={!dueSettled}
                  className="sm-btn-next flex-1 py-4 rounded-2xl font-bold text-zinc-900"
                >
                  {!dueSettled ? 'Saving…' : 'Back to Dashboard'}
                </button>
              )}
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* A small pop for the set; clearing the whole day gets the full celebration instead */}
      {setOutcome === 'set' && <Confetti variant="light" />}

      <AnimatePresence>
        {celebration && (
          <DayClearedCelebration
            clear={celebration}
            clearNumber={clears.some(c => c.day === celebration.day) ? clears.length : clears.length + 1}
            onViewAll={() => navigate('/achievements')}
            onClose={() => setCelebration(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
