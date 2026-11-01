import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Check, Compass, Flame, Moon, PenLine, Sparkles, ArrowRight, Target, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AppLayout } from '@/components/AppLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { EaseBadge } from '@/components/EaseBadge';
import { useWords, useWordStats, useDueWords, useReviewSessions, useReviewEvents, useCalibration, useUserPreferences, useApplyStreakRecovery } from '@/hooks/useWords';
import { chunkSizes, dayProgress } from '@/lib/review-chunks';
import { GlassTrophy } from '@/components/achievements/GlassTrophy';
import { useDailyClears } from '@/hooks/useDailyClears';
import { clearStreaks } from '@/lib/daily-clears';
import { useAuth } from '@/contexts/AuthContext';
import { seedWordsIfEmpty } from '@/lib/seed-words';
import { getIdentity } from '@/lib/identity';
import { IdentityJourneyMap } from '@/components/IdentityJourneyMap';
import { getTrophies, type Trophy as TrophyEntry } from '@/lib/trophies';
import { calculateStreak, dateKey } from '@/lib/streak';

/* ─── Animation variants ─────────────────────────────────────────── */
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* ─── Hero: set path ────────────────────────────────────────────── */
/** Today's sets as a path: finished sets in gold, the next one lit, the rest waiting. */
function SetPath({ done, upcoming }: { done: number; upcoming: number[] }) {
  const nodes = [
    ...Array.from({ length: done }, () => ({ state: 'done' as const, size: 0 })),
    ...upcoming.map((size, i) => ({ state: i === 0 ? 'next' as const : 'later' as const, size })),
  ];
  return (
    <div className="flex items-center w-full max-w-md" aria-label={`${done} of ${nodes.length} sets done`}>
      {nodes.map((n, i) => (
        <div key={i} className={`flex items-center ${i < nodes.length - 1 ? 'flex-1' : ''}`}>
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 18, delay: 0.7 + i * 0.07 }}
            className="relative shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold tabular-nums"
            style={
              n.state === 'done'
                ? { background: 'linear-gradient(135deg, #f6dc94, #c8922a)', color: '#3a2606', boxShadow: '0 0 14px rgba(240,201,106,0.35)' }
                : n.state === 'next'
                  ? { background: 'rgba(0,255,200,0.12)', color: '#00FFC8', border: '1.5px solid #00FFC8' }
                  : { color: '#71717a', border: '1.5px dashed rgba(255,255,255,0.14)' }
            }
          >
            {n.state === 'next' && <span className="absolute inset-0 rounded-full hero-node-ping" aria-hidden />}
            {n.state === 'done' ? <Check className="h-4 w-4" strokeWidth={3} /> : n.size}
          </motion.div>
          {i < nodes.length - 1 && (
            <div
              className="flex-1 h-[2px] mx-1 rounded-full"
              style={{ background: i < done ? 'linear-gradient(90deg, #c8922a, #f0c96a)' : 'rgba(255,255,255,0.08)' }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Pulse strip ring ──────────────────────────────────────────── */
function Ring({ pct, color, size = 44 }: { pct: number; color: string; size?: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" className="shrink-0 -rotate-90" aria-hidden>
      <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="4" />
      <motion.circle
        cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - Math.min(100, Math.max(0, pct)) / 100) }}
        transition={{ duration: 1.1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        style={{ filter: `drop-shadow(0 0 4px ${color}88)` }}
      />
    </svg>
  );
}

function CountUp({ to, durationMs = 700 }: { to: number; durationMs?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, durationMs]);
  return <>{n}</>;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: words = [], isLoading: wordsLoading } = useWords();
  const { data: wordStats = [], isLoading: statsLoading } = useWordStats();
  const { data: dueWords = [] } = useDueWords();
  const { data: reviewSessions = [] } = useReviewSessions();
  const { data: reviewEvents = [] } = useReviewEvents();

  const now = new Date();
  const hour = now.getHours();
  const isSleepPrepActive = hour >= 20 || hour < 3;
  const greeting = hour < 12 ? 'morning' : (hour >= 20 || hour < 3) ? 'evening' : 'afternoon';

  const [sleepCountdown, setSleepCountdown] = useState('');
  useEffect(() => {
    const tick = () => {
      const n = new Date();
      const h = n.getHours();
      const active = h >= 20 || h < 3;
      const target = new Date(n);
      if (active) {
        if (h >= 20) target.setDate(target.getDate() + 1);
        target.setHours(3, 0, 0, 0);
      } else {
        target.setHours(20, 0, 0, 0);
      }
      const diff = target.getTime() - n.getTime();
      const hh = Math.floor(diff / 3600000);
      const mm = Math.floor((diff % 3600000) / 60000);
      const ss = Math.floor((diff % 60000) / 1000);
      setSleepCountdown(
        `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  /* Seed on first load */
  useEffect(() => {
    if (user && !wordsLoading && words.length === 0) {
      seedWordsIfEmpty(user.id);
    }
  }, [user, wordsLoading, words.length]);

  /* ── Derived stats ───────────────────────────────────────────────── */
  const totalWords = words.length;
  const dueToday = dueWords.length;
  const dueSets = chunkSizes(dueToday);
  const todayProgress = dayProgress(reviewEvents, dueWords.map(d => d.word.id));
  // Sets already finished today, so numbering carries on ("Set 2 of 3")
  const setsTotal = chunkSizes(todayProgress.total).length;
  const setsDone = setsTotal - dueSets.length;
  const mastered = wordStats.filter(s => s.state === 2 && s.stability >= 21).length;
  const masteredPct = totalWords > 0 ? Math.round((mastered / totalWords) * 100) : 0;

  /* ── Streak ──────────────────────────────────────────────────────── */
  const { data: prefs } = useUserPreferences();
  const applyStreakRecovery = useApplyStreakRecovery();
  const recoveredDate = prefs?.streak_recovery_date ?? null;

  // Every rating logs a review_event immediately, so partial sessions still
  // earn the day; legacy review_sessions cover history predating the event log.
  const { streak, recoverable, recoverableStreak } = useMemo(
    () => calculateStreak(
      [...reviewSessions.map(s => s.started_at), ...reviewEvents.map(e => e.reviewed_at)],
      recoveredDate,
    ),
    [reviewSessions, reviewEvents, recoveredDate],
  );

  const handleRecover = () => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const missedDate = dateKey(y);
    const count = recoverableStreak;

    toast.custom((id) => (
      <div className="w-full overflow-hidden rounded-xl border border-zinc-700 shadow-2xl p-4 space-y-3"
        style={{ background: '#18181b' }}>
        <p className="text-sm font-bold text-white leading-snug">
          🔥 Promise me you'll be more disciplined next time.
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => {
              applyStreakRecovery.mutate(missedDate);
              toast.dismiss(id);
              toast.success(`${count}-day streak recovered!`);
            }}
            className="w-full text-xs font-semibold text-zinc-900 px-3 py-2 rounded-md transition-opacity hover:opacity-85"
            style={{ background: '#f97316' }}
          >
            Yes, I promise
          </button>
          <button
            onClick={() => toast.dismiss(id)}
            className="w-full text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors px-3 py-2 rounded-md border border-zinc-700"
          >
            No, I will remain the way I am
          </button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  /* ── Velocity chart (last 7 days) ────────────────────────────────── */
  const velocityBars = useMemo(() => {
    const eventCounts = new Map<string, number>();
    for (const e of reviewEvents) {
      const k = dateKey(new Date(e.reviewed_at));
      eventCounts.set(k, (eventCounts.get(k) ?? 0) + 1);
    }
    const bars = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = dateKey(d);
      const fromSessions = reviewSessions
        .filter(s => dateKey(new Date(s.started_at)) === key)
        .reduce((sum, s) => sum + s.words_reviewed, 0);
      // max() instead of sum: a completed session's reviews are also in
      // review_events, so adding both would double-count. Sessions only win
      // for history predating the event log.
      const value = Math.max(eventCounts.get(key) ?? 0, fromSessions);
      return { key, day: DAY_LABELS[d.getDay()], value, active: i === 6 };
    });
    const max = Math.max(...bars.map(b => b.value), 1);
    return bars.map(b => ({ ...b, heightPx: Math.max(Math.round((b.value / max) * 128), 6) }));
  }, [reviewSessions, reviewEvents]);

  const weekTotal = velocityBars.reduce((sum, b) => sum + b.value, 0);
  const weekActiveDays = velocityBars.filter(b => b.value > 0).length;

  /* ── Day clears (trophies) ───────────────────────────────────────── */
  const { data: clears = [] } = useDailyClears();
  const clearedDays = useMemo(() => new Set(clears.map(c => c.day)), [clears]);
  const { best: bestClearRun } = useMemo(() => clearStreaks(clears.map(c => c.day)), [clears]);
  const addedThisWeek = words.filter(w => Date.now() - new Date(w.created_at).getTime() < 7 * 86400000).length;

  /* ── Calibration ─────────────────────────────────────────────────── */
  const { data: cal } = useCalibration();
  const sureTotal = cal?.sureTotal ?? 0;
  const sureCorrect = cal?.sureCorrect ?? 0;
  const calibrationPct = sureTotal > 0 ? Math.round((sureCorrect / sureTotal) * 100) : 0;
  const calibrationColor = calibrationPct >= 70 ? '#00FFC8' : calibrationPct >= 50 ? '#fbbf24' : '#ef4444';

  /* ── Recent words ────────────────────────────────────────────────── */
  const recentWords = [...words]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  /* ── Greatest Hits (10/10 trophies) ──────────────────────────────── */
  const [trophies, setTrophies] = useState<TrophyEntry[]>([]);
  useEffect(() => { setTrophies(getTrophies()); }, []);

  /* ── Hero mission ────────────────────────────────────────────────── */
  // Your real pace from finished sessions, so the time estimate is honest
  const secPerWord = useMemo(() => {
    let secs = 0;
    let n = 0;
    for (const s of reviewSessions) {
      if (!s.ended_at || s.words_reviewed <= 0) continue;
      const d = (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000;
      if (d > 0 && d / s.words_reviewed < 300) { secs += d; n += s.words_reviewed; }
    }
    return n > 0 ? Math.min(120, Math.max(5, secs / n)) : 20;
  }, [reviewSessions]);
  const nextSetMinutes = dueSets.length > 0 ? Math.max(1, Math.round((dueSets[0] * secPerWord) / 60)) : 0;
  const missionState = dueToday > 0 ? 'due' : todayProgress.done > 0 ? 'conquered' : 'clear';
  const hasSetPath = missionState === 'due' && setsTotal > 1;

  /* ── Identity ───────────────────────────────────────────────────── */
  const identity = getIdentity(Math.max(1, streak));
  const idProgressPct = Math.round(identity.progress * 100);
  const idDaysToNext = identity.next ? identity.next.from - identity.daysIn : 0;
  const [showJourney, setShowJourney] = useState(false);

  /* ── Loading ─────────────────────────────────────────────────────── */
  const isLoading = wordsLoading || statsLoading;

  return (
    <AppLayout>
      <style>{`
        @keyframes hero-grid-drift {
          0%   { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(40px, 40px, 0); }
        }
        .hero-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
          background-size: 40px 40px;
          mask-image: radial-gradient(ellipse at 30% 40%, black 0%, transparent 70%);
          -webkit-mask-image: radial-gradient(ellipse at 30% 40%, black 0%, transparent 70%);
          animation: hero-grid-drift 18s linear infinite;
          pointer-events: none;
        }
        @keyframes hero-cta-shine {
          0%   { transform: translateX(-120%) skewX(-20deg); }
          60%  { transform: translateX(220%)  skewX(-20deg); }
          100% { transform: translateX(220%)  skewX(-20deg); }
        }
        @keyframes hero-cta-gradient {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .hero-cta {
          position: relative;
          overflow: hidden;
          background-size: 200% 200%;
          animation: hero-cta-gradient 6s ease-in-out infinite;
        }
        .hero-cta::before {
          content: '';
          position: absolute;
          top: 0; bottom: 0;
          left: 0; width: 35%;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%);
          animation: hero-cta-shine 3.6s ease-in-out infinite;
          pointer-events: none;
        }
        .hero-cta > * { position: relative; z-index: 1; }
        @keyframes hero-soft-pulse {
          0%, 100% { box-shadow: 0 0 0 rgba(0,255,200,0.0); }
          50%      { box-shadow: 0 0 22px rgba(0,255,200,0.28); }
        }
        .hero-sleep-active { animation: hero-soft-pulse 2.6s ease-in-out infinite; }
        .hero-shell {
          background:
            radial-gradient(ellipse 80% 60% at 0% 100%, rgba(124,58,237,0.12) 0%, transparent 60%),
            linear-gradient(135deg, #0b0a10 0%, #07060a 55%, #0d0a07 100%);
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 24px 64px rgba(0,0,0,0.45);
        }
        .hero-mint-text {
          background: linear-gradient(110deg, #00FFC8 0%, #7dd3fc 50%, #c4b5fd 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        @keyframes hero-orbit-spin { to { transform: rotate(360deg); } }
        .hero-orbit {
          border: 1px dashed rgba(240,201,106,0.18);
          animation: hero-orbit-spin 60s linear infinite;
        }
        .hero-orbit::after {
          content: ''; position: absolute; top: -3px; left: 50%;
          width: 6px; height: 6px; border-radius: 9999px;
          background: #f0c96a; box-shadow: 0 0 10px #f0c96a;
        }
        .hero-orbit-slow {
          border-color: rgba(0,255,200,0.12);
          animation-duration: 38s; animation-direction: reverse;
        }
        .hero-orbit-slow::after { background: #00FFC8; box-shadow: 0 0 10px #00FFC8; }
        .hero-pedestal {
          background: radial-gradient(ellipse at 50% 50%, rgba(240,201,106,0.35) 0%, rgba(240,201,106,0.08) 45%, transparent 70%);
          filter: blur(2px);
        }
        @keyframes hero-node-ping {
          0% { box-shadow: 0 0 0 0 rgba(0,255,200,0.55); }
          100% { box-shadow: 0 0 0 10px rgba(0,255,200,0); }
        }
        .hero-node-ping { animation: hero-node-ping 1.8s ease-out infinite; }
        .hero-chip {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 7px 13px; border-radius: 9999px;
          font-size: 12px; font-weight: 600;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.09);
          transition: background 0.15s, border-color 0.15s;
        }
        .hero-chip:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.16); }
        @media (prefers-reduced-motion: reduce) {
          .hero-orbit, .hero-node-ping { animation: none; }
        }
        .dash-card {
          background: linear-gradient(180deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.015) 100%), #0a090d;
          border: 1px solid rgba(255,255,255,0.07);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 16px 48px rgba(0,0,0,0.35);
        }
        .dash-pulse { border-color: rgba(255,255,255,0.06); transition: background 0.15s; }
        .dash-pulse:not(:disabled):hover { background: rgba(255,255,255,0.03); }
        .dash-pulse:disabled { cursor: default; }
        .dash-pulse:first-child { border-top-left-radius: 1.75rem; }
        .dash-word {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.06);
          transition: border-color 0.2s, background 0.2s, transform 0.2s;
        }
        .dash-word:hover { border-color: rgba(0,255,200,0.28); background: rgba(0,255,200,0.03); transform: translateY(-2px); }
        .dash-identity { transition: box-shadow 0.25s; }
        .dash-identity:hover { box-shadow: inset 0 1px 0 rgba(255,210,100,0.1), 0 20px 50px rgba(0,0,0,0.5), 0 0 60px rgba(180,130,30,0.2); }
        .id-card-home {
          background: linear-gradient(180deg, #0d0a07 0%, #110e0a 100%);
          border: 1px solid rgba(180,140,55,0.28);
          box-shadow: inset 0 1px 0 rgba(255,210,100,0.06), 0 20px 50px rgba(0,0,0,0.5), 0 0 40px rgba(140,100,25,0.07);
        }
        .id-gold-text {
          background: linear-gradient(120deg, #c8922a 0%, #f0c96a 55%, #c08828 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .id-gold-bar {
          background: linear-gradient(90deg, #c8922a 0%, #f0c96a 100%);
          box-shadow: 0 0 8px rgba(210,155,50,0.4);
        }
      `}</style>

      <div className="px-6 pt-8 pb-28 max-w-5xl mx-auto">
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">

          {/* ── Hero: today's mission ─────────────────────────────────── */}
          <section className="hero-shell relative overflow-hidden rounded-[2.5rem]">
            <div className="hero-grid" />
            <motion.div
              className="absolute -top-24 right-[8%] w-[460px] h-[460px] pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(240,201,106,0.22) 0%, transparent 62%)' }}
              animate={{ scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute -bottom-32 -left-20 w-[480px] h-[480px] pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(0,255,200,0.14) 0%, transparent 62%)' }}
              animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
              transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
            />

            <div className="relative z-10 p-6 sm:p-8 lg:p-10">
              {/* Top bar */}
              <div className="flex items-center justify-between gap-3 mb-6">
                <span className="inline-flex items-center gap-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] sm:tracking-[0.25em] text-zinc-400 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00FFC8] animate-pulse" />
                  Good {greeting}
                  <span className="text-zinc-700">·</span>
                  <span className="id-gold-text">{identity.current.name}</span>
                </span>
                {recoverable ? (
                  <button
                    onClick={handleRecover}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-opacity hover:opacity-80"
                    style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.4)' }}
                  >
                    <Flame className="h-3.5 w-3.5" style={{ color: '#f97316' }} />
                    <span className="text-orange-400 text-xs font-bold">Recover {recoverableStreak}-day streak</span>
                  </button>
                ) : (
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                    style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.22)' }}
                  >
                    <Flame className="h-3.5 w-3.5" style={{ color: '#f97316' }} />
                    <span className="text-white text-xs font-bold tabular-nums">{streak}</span>
                    <span className="hidden sm:inline text-zinc-500 text-xs">day streak</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] items-center gap-x-10">
                {/* Mission */}
                <div className="min-w-0">
                  <motion.p
                    className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#c8922a] mb-3"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                  >
                    {missionState === 'due' ? "Today's mission" : missionState === 'conquered' ? 'Mission complete' : 'All clear'}
                  </motion.p>

                  <motion.h2
                    className="text-[1.9rem] sm:text-4xl xl:text-[2.75rem] font-bold text-white leading-[1.08] tracking-tight"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {missionState === 'due' ? (
                      <>
                        <span className="hero-mint-text tabular-nums"><CountUp to={dueToday} /> word{dueToday > 1 ? 's' : ''}</span>{' '}
                        stand between you and today&apos;s trophy.
                      </>
                    ) : missionState === 'conquered' ? (
                      <>Today is <span className="id-gold-text">conquered.</span></>
                    ) : (
                      <>You&apos;re all <span className="hero-mint-text">caught up.</span></>
                    )}
                  </motion.h2>

                  <motion.p
                    className="text-zinc-400 text-sm leading-relaxed mt-3 max-w-md"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                  >
                    {missionState === 'due'
                      ? todayProgress.done > 0
                        ? `${todayProgress.done} already conquered today — the gold keeps rising.`
                        : dueSets.length > 1
                          ? `${dueSets.length} small sets. One at a time.`
                          : 'One short set and the day is yours.'
                      : missionState === 'conquered'
                        ? `All ${todayProgress.done} words reviewed. Your trophy is on the shelf.`
                        : 'Nothing due right now. Add new words to keep growing.'}
                  </motion.p>
                </div>

                {/* Trophy stage */}
                <motion.div
                  className="relative hidden lg:flex lg:row-span-3 items-center justify-center w-[300px] aspect-square"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="hero-orbit absolute inset-[4%] rounded-full" aria-hidden />
                  <div className="hero-orbit hero-orbit-slow absolute inset-[16%] rounded-full" aria-hidden />
                  <div className="hero-pedestal absolute bottom-[6%] left-1/2 -translate-x-1/2 w-[70%] h-[14%]" aria-hidden />
                  <div className="relative w-[78%]">
                    <GlassTrophy
                      percent={missionState === 'due' ? todayProgress.percent : 100}
                      fluid
                      minimal
                      showLabel={missionState === 'due'}
                    />
                  </div>
                </motion.div>

                {/* Set path — on phones the trophy rides alongside it */}
                <motion.div
                  className={`mt-6 flex items-center gap-4 ${hasSetPath ? '' : 'lg:hidden'}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.6 }}
                >
                  <div className="lg:hidden w-[72px] shrink-0">
                    <GlassTrophy
                      percent={missionState === 'due' ? todayProgress.percent : 100}
                      fluid
                      minimal
                      showLabel={missionState === 'due'}
                    />
                  </div>
                  {hasSetPath ? (
                    <div className="flex-1 min-w-0">
                      <SetPath done={setsDone} upcoming={dueSets} />
                      <p className="text-[11px] text-zinc-500 mt-2.5 tabular-nums">
                        Set {setsDone + 1} of {setsTotal} · {todayProgress.percent}% of today conquered
                      </p>
                    </div>
                  ) : (
                    <p className="lg:hidden text-xs text-zinc-500 tabular-nums">
                      {missionState === 'due' ? `${todayProgress.percent}% of today conquered` : 'Trophy filled for today'}
                    </p>
                  )}
                </motion.div>

                {/* Actions */}
                <motion.div
                  className="mt-6 flex flex-col gap-3"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
                >
                  <motion.button
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(missionState === 'due' ? '/review' : missionState === 'conquered' ? '/achievements' : '/add')}
                    className="hero-cta group w-full sm:w-auto sm:self-start inline-flex items-center justify-between gap-6 pl-6 pr-3 py-3 rounded-2xl text-zinc-900"
                    style={missionState === 'conquered'
                      ? { backgroundImage: 'linear-gradient(120deg, #c8922a 0%, #f0c96a 50%, #c08828 100%)', boxShadow: '0 0 32px rgba(240,201,106,0.3)' }
                      : { backgroundImage: 'linear-gradient(135deg, #2cffca 0%, #38bdf8 55%, #a78bfa 100%)', boxShadow: '0 0 32px rgba(0,255,200,0.28), 0 4px 24px rgba(56,189,248,0.2)' }}
                  >
                    <span className="text-left">
                      <span className="block font-bold text-[15px]">
                        {missionState === 'due'
                          ? setsTotal > 1 ? `Start Set ${setsDone + 1}` : "Start today's review"
                          : missionState === 'conquered' ? 'See your trophy shelf' : 'Add new words'}
                      </span>
                      {missionState === 'due' && (
                        <span className="block text-[11px] font-semibold text-zinc-900/65 tabular-nums">
                          {dueSets[0]} word{dueSets[0] > 1 ? 's' : ''} · ≈ {nextSetMinutes} min
                        </span>
                      )}
                    </span>
                    <span className="w-9 h-9 rounded-xl bg-zinc-900/15 flex items-center justify-center shrink-0">
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </motion.button>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => isSleepPrepActive && navigate('/review?mode=sleep_prep')}
                      className={`hero-chip ${isSleepPrepActive ? 'hero-sleep-active' : 'opacity-60 cursor-default'}`}
                      style={{ color: isSleepPrepActive ? '#00FFC8' : '#a1a1aa' }}
                    >
                      <Moon className="h-3.5 w-3.5" />
                      {isSleepPrepActive ? 'Sleep Prep' : <span className="tabular-nums">Sleep Prep in {sleepCountdown}</span>}
                    </button>
                    <button onClick={() => navigate('/writing')} className="hero-chip" style={{ color: '#fbbf24' }}>
                      <PenLine className="h-3.5 w-3.5" />
                      Writing
                    </button>
                    <button onClick={() => navigate('/daily')} className="hero-chip" style={{ color: '#a78bfa' }}>
                      <Compass className="h-3.5 w-3.5" />
                      Discover
                    </button>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>

          {/* ── Below the hero ─────────────────────────────────────────── */}
          {isLoading ? (
            <div className="space-y-5">
              <Skeleton className="h-24 w-full rounded-[1.75rem] bg-zinc-800/60" />
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <Skeleton className="lg:col-span-7 h-72 rounded-[2rem] bg-zinc-800/60" />
                <Skeleton className="lg:col-span-5 h-72 rounded-[2rem] bg-zinc-800/60" />
              </div>
              <Skeleton className="h-64 w-full rounded-[2rem] bg-zinc-800/60" />
            </div>
          ) : (
            <div className="space-y-5">

              {/* 1 · Pulse strip */}
              <motion.section variants={item} className="dash-card rounded-[1.75rem] grid grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    label: 'Library', icon: BookOpen, onClick: () => navigate('/library'),
                    value: totalWords, sub: addedThisWeek > 0 ? `+${addedThisWeek} this week` : 'words collected',
                    ring: null as null | { pct: number; color: string },
                  },
                  {
                    label: 'Mastered', icon: Sparkles, onClick: () => navigate('/library?filter=mastered'),
                    value: mastered, sub: `${masteredPct}% of library`,
                    ring: { pct: masteredPct, color: '#00FFC8' },
                  },
                  {
                    label: 'Gut check', icon: Target, onClick: undefined,
                    value: sureTotal >= 5 ? `${calibrationPct}%` : '—',
                    sub: sureTotal >= 5 ? `${sureCorrect}/${sureTotal} “sure” right` : `${sureTotal}/5 bets to unlock`,
                    ring: sureTotal >= 5 ? { pct: calibrationPct, color: calibrationColor } : null,
                  },
                  {
                    label: 'Trophies', icon: Trophy, onClick: () => navigate('/achievements'),
                    value: clears.length, sub: clears.length > 0 ? `best run ${bestClearRun} day${bestClearRun === 1 ? '' : 's'}` : 'clear a day to earn one',
                    ring: null,
                    gold: true,
                  },
                ].map((st, i) => (
                  <button
                    key={st.label}
                    onClick={st.onClick}
                    disabled={!st.onClick}
                    className={`dash-pulse group text-left p-4 sm:p-5 flex items-center gap-2.5 sm:gap-3 min-w-0 ${i % 2 === 1 ? 'border-l' : ''} ${i >= 2 ? 'border-t lg:border-t-0' : ''} ${i === 2 ? 'lg:border-l' : ''}`}
                  >
                    {st.ring ? (
                      <Ring pct={st.ring.pct} color={st.ring.color} size={38} />
                    ) : (
                      <span
                        className="w-[38px] h-[38px] sm:w-11 sm:h-11 shrink-0 rounded-xl sm:rounded-2xl flex items-center justify-center"
                        style={'gold' in st && st.gold
                          ? { background: 'rgba(240,201,106,0.1)', border: '1px solid rgba(240,201,106,0.28)' }
                          : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        <st.icon className="h-4 w-4" style={{ color: 'gold' in st && st.gold ? '#f0c96a' : '#a1a1aa' }} />
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block text-[9px] sm:text-[10px] uppercase tracking-[0.15em] sm:tracking-[0.2em] font-bold text-zinc-500 whitespace-nowrap">{st.label}</span>
                      <span
                        className={`block text-2xl font-bold leading-tight tabular-nums ${'gold' in st && st.gold ? 'id-gold-text' : 'text-white'}`}
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {st.value}
                      </span>
                      <span className="block text-[10px] sm:text-[11px] text-zinc-500 leading-snug">{st.sub}</span>
                    </span>
                  </button>
                ))}
              </motion.section>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* 2 · Rhythm */}
                <motion.section variants={item} className="dash-card lg:col-span-7 rounded-[2rem] p-6 sm:p-7 flex flex-col">
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-[#00FFC8]/80">Rhythm</p>
                      <h3 className="text-xl font-bold text-white mt-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        Your last 7 days
                      </h3>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white tabular-nums leading-none" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {weekTotal}
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-1">reviews · {weekActiveDays}/7 days</p>
                    </div>
                  </div>

                  <div className="flex-1 flex items-end justify-between gap-2 sm:gap-3 min-h-[170px]">
                    {velocityBars.map(({ key, day, heightPx, value, active }, i) => {
                      const cleared = clearedDays.has(key);
                      return (
                        <div key={key} className="flex-1 h-full flex flex-col items-center justify-end gap-2">
                          <div className="h-4 flex items-center justify-center">
                            {cleared ? (
                              <Trophy className="h-3.5 w-3.5" style={{ color: '#f0c96a', filter: 'drop-shadow(0 0 4px rgba(240,201,106,0.6))' }} />
                            ) : (
                              <span className="text-[10px] font-bold tabular-nums" style={{ color: active ? '#00FFC8' : '#52525b' }}>
                                {value > 0 ? value : ''}
                              </span>
                            )}
                          </div>
                          <motion.div
                            className="w-full max-w-[44px] rounded-full"
                            initial={{ height: 6 }}
                            animate={{ height: heightPx }}
                            transition={{ duration: 0.8, delay: 0.2 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                            title={`${value} reviews${cleared ? ' · day cleared' : ''}`}
                            style={{
                              background: active
                                ? 'linear-gradient(180deg, #2cffca 0%, #00a884 100%)'
                                : cleared
                                  ? 'linear-gradient(180deg, #f0c96a 0%, #8a5a12 100%)'
                                  : value > 0 ? 'linear-gradient(180deg, rgba(255,255,255,0.32), rgba(255,255,255,0.1))' : 'rgba(255,255,255,0.05)',
                              boxShadow: active ? '0 0 22px rgba(0,255,200,0.35)' : cleared ? '0 0 16px rgba(240,201,106,0.22)' : 'none',
                            }}
                          />
                          <span
                            className="text-[10px] uppercase tracking-widest font-bold"
                            style={{ color: active ? '#00FFC8' : value > 0 ? '#71717a' : '#3f3f46' }}
                          >
                            {day}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-4 mt-5 text-[10px] text-zinc-500">
                    <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#00FFC8]" />Today</span>
                    <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#f0c96a]" />Day cleared</span>
                  </div>
                </motion.section>

                {/* 3 · Identity poster */}
                <motion.section variants={item} className="lg:col-span-5">
                  <button
                    onClick={() => setShowJourney(true)}
                    className="id-card-home dash-identity group relative w-full h-full min-h-[320px] rounded-[2rem] overflow-hidden text-left"
                  >
                    <img
                      src={identity.current.image}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(13,10,7,0) 30%, rgba(13,10,7,0.75) 62%, #0d0a07 88%)' }} />
                    <div className="relative h-full min-h-[320px] flex flex-col justify-end p-6">
                      <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-[#c8922a]">Day {identity.daysIn} · your title</p>
                      <p className="id-gold-text text-4xl font-bold tracking-tight mt-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {identity.current.name}
                      </p>
                      <div className="h-1.5 w-full rounded-full overflow-hidden mt-4" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <div className="id-gold-bar h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(idProgressPct, 2)}%` }} />
                      </div>
                      <div className="flex items-center justify-between mt-2.5">
                        <p className="text-[11px] font-semibold" style={{ color: 'rgba(214,170,80,0.85)' }}>
                          {identity.next
                            ? `${idDaysToNext} day${idDaysToNext === 1 ? '' : 's'} to ${identity.next.name}`
                            : "You've reached the highest title"}
                        </p>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/30 group-hover:text-white/70 transition-colors inline-flex items-center gap-1">
                          Journey <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </button>
                </motion.section>
              </div>

              {/* 4 · Fresh ink */}
              <motion.section variants={item} className="dash-card rounded-[2rem] p-6 sm:p-7">
                <div className="flex items-end justify-between gap-4 mb-5">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-[#a78bfa]">Fresh ink</p>
                    <h3 className="text-xl font-bold text-white mt-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      Newest in your library
                    </h3>
                  </div>
                  <button
                    onClick={() => navigate('/library')}
                    className="shrink-0 whitespace-nowrap text-[11px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors inline-flex items-center gap-1"
                  >
                    View all <ArrowRight className="h-3 w-3" />
                  </button>
                </div>

                {recentWords.length === 0 ? (
                  <button
                    onClick={() => navigate('/add')}
                    className="w-full py-10 rounded-2xl border border-dashed border-white/10 text-sm text-zinc-500 hover:text-white hover:border-white/25 transition-colors"
                  >
                    No words yet — add your first one
                  </button>
                ) : (
                  <div className="-mx-6 px-6 sm:mx-0 sm:px-0 flex sm:grid gap-3 sm:grid-cols-2 lg:grid-cols-3 overflow-x-auto sm:overflow-visible snap-x snap-mandatory pb-1 sm:pb-0 [scrollbar-width:none]">
                    {recentWords.map(word => {
                      const stats = wordStats.find(s => s.word_id === word.id);
                      const mastery = stats ? Math.min(Math.round((stats.stability / 30) * 100), 100) : 0;
                      const isStar = !!(stats && stats.state === 2 && stats.stability >= 21);
                      return (
                        <button
                          key={word.id}
                          onClick={() => navigate(`/library?word=${word.id}`)}
                          className="dash-word group text-left p-4 rounded-2xl shrink-0 w-[78%] sm:w-auto snap-start"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-lg font-bold text-white leading-tight truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                              {word.word}
                            </span>
                            <span className="flex items-center gap-1.5 shrink-0">
                              {stats && <EaseBadge difficulty={stats.difficulty} />}
                              {isStar && <Sparkles className="h-3.5 w-3.5 text-[#00FFC8]" />}
                            </span>
                          </div>
                          <p className="text-zinc-500 text-xs leading-relaxed mt-1 line-clamp-2 min-h-[2.5em]">{word.definition}</p>
                          <div className="flex items-center gap-2 mt-3">
                            <div className="flex-1 h-[3px] rounded-full bg-white/[0.06] overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${Math.max(mastery, 3)}%`, background: 'linear-gradient(90deg, #00FFC8, #7dd3fc)' }}
                              />
                            </div>
                            <span className="text-[10px] text-zinc-500 font-bold tabular-nums w-8 text-right">{mastery}%</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </motion.section>

            </div>
          )}
          {/* end grid */}

          {/* Greatest Hits — only shows once you've earned at least one 10/10 */}
          {trophies.length > 0 && (
            <motion.section
              variants={item}
              className="rounded-[2rem] overflow-hidden"
              style={{
                background: 'linear-gradient(180deg, #0d0a07 0%, #110e0a 100%)',
                border: '1px solid rgba(180,140,55,0.28)',
                boxShadow: 'inset 0 1px 0 rgba(255,210,100,0.06), 0 20px 50px rgba(0,0,0,0.5), 0 0 40px rgba(140,100,25,0.07)',
              }}
            >
              <div className="px-7 pt-6 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(240,201,106,0.10)', border: '1px solid rgba(240,201,106,0.25)' }}
                  >
                    <Trophy className="w-4 h-4" style={{ color: '#f0c96a' }} />
                  </div>
                  <div>
                    <h3 className="id-gold-text text-lg font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      Greatest Hits
                    </h3>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Your top-scored sentences (9+)</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(240,201,106,0.6)' }}>
                  {trophies.length} minted
                </span>
              </div>
              <div className="px-7 pb-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {trophies.slice(0, 6).map(t => (
                  <div
                    key={`${t.wordId}-${t.mintedAt}`}
                    className="rounded-2xl p-4"
                    style={{ background: 'rgba(240,201,106,0.04)', border: '1px solid rgba(240,201,106,0.18)' }}
                  >
                    <div className="flex items-baseline justify-between gap-2 mb-1.5">
                      <span className="id-gold-text text-sm font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {t.word}
                      </span>
                      <span className="text-[10px] tabular-nums" style={{ color: 'rgba(240,201,106,0.55)' }}>{t.score ?? 10}/10</span>
                    </div>
                    <p className="text-zinc-300 text-sm italic leading-snug line-clamp-3">
                      "{t.sentence}"
                    </p>
                    {t.topic && (
                      <p className="text-[10px] text-zinc-600 mt-2 uppercase tracking-widest font-bold">
                        {t.topic}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </motion.section>
          )}

        </motion.div>
      </div>

      <AnimatePresence>
        {showJourney && (
          <IdentityJourneyMap
            currentDay={Math.max(1, streak)}
            onClose={() => setShowJourney(false)}
          />
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
