import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Brain, Clock, Flame, Moon, Sparkles, ArrowRight, MoreHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { EaseBadge } from '@/components/EaseBadge';
import { useWords, useWordStats, useDueWords, useReviewSessions } from '@/hooks/useWords';
import { useAuth } from '@/contexts/AuthContext';
import { seedWordsIfEmpty } from '@/lib/seed-words';

/* ─── Animation variants ─────────────────────────────────────────── */
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } },
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: words = [], isLoading: wordsLoading } = useWords();
  const { data: wordStats = [], isLoading: statsLoading } = useWordStats();
  const { data: dueWords = [] } = useDueWords();
  const { data: reviewSessions = [] } = useReviewSessions();

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
  const mastered = wordStats.filter(s => s.state === 2 && s.stability >= 21).length;
  const masteredPct = totalWords > 0 ? Math.round((mastered / totalWords) * 100) : 0;

  /* ── Streak ──────────────────────────────────────────────────────── */
  const streak = (() => {
    if (reviewSessions.length === 0) return 0;
    const dateKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    const sessionDates = [...new Set(
      reviewSessions.map(s => dateKey(new Date(s.started_at)))
    )].sort().reverse();

    const today = new Date();
    const todayKey = dateKey(today);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = dateKey(yesterday);

    if (sessionDates[0] !== todayKey && sessionDates[0] !== yesterdayKey) return 0;

    let count = 0;
    const check = new Date(today);
    if (sessionDates[0] !== todayKey) check.setDate(check.getDate() - 1);
    for (let i = 0; i < 365; i++) {
      if (sessionDates.includes(dateKey(check))) { count++; check.setDate(check.getDate() - 1); }
      else break;
    }
    return count;
  })();

  /* ── Velocity chart (last 7 days from real session data) ─────────── */
  const velocityBars = useMemo(() => {
    const dateKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    const bars = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = dateKey(d);
      const value = reviewSessions
        .filter(s => dateKey(new Date(s.started_at)) === key)
        .reduce((sum, s) => sum + s.words_reviewed, 0);
      return { day: DAY_LABELS[d.getDay()], value, active: i === 6 };
    });
    const max = Math.max(...bars.map(b => b.value), 1);
    return bars.map(b => ({ ...b, heightPx: Math.max(Math.round((b.value / max) * 128), 6) }));
  }, [reviewSessions]);

  /* ── Recent words ────────────────────────────────────────────────── */
  const recentWords = [...words]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  /* ── Loading skeleton ────────────────────────────────────────────── */
  const isLoading = wordsLoading || statsLoading;

  return (
    <AppLayout>
      {/* ── Global styles injected inline (no extra CSS file needed) ── */}
      <style>{`
        .glass-panel {
          background: rgba(24, 24, 27, 0.55);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.05);
        }
        .glow-mint { box-shadow: 0 0 28px rgba(0,255,200,0.25); }
        .bar-hover:hover { background-color: #00FFC8 !important; }
      `}</style>

      <div className="px-6 pt-8 pb-28 max-w-5xl mx-auto">
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">

          {/* ── Hero Section ─────────────────────────────────────────── */}
          <section
            className="relative overflow-hidden rounded-[2rem] p-10 bg-zinc-900 min-h-[360px] flex flex-col justify-between"
          >
            {/* Background gradient blob */}
            <div
              className="absolute top-0 right-0 w-3/4 h-full opacity-25 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at top right, #00FFC8 0%, transparent 70%)',
              }}
            />

            {/* Top bar */}
            <div className="relative z-10 flex items-center justify-between">
              <span
                className="inline-flex items-center gap-2 px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.3em]"
                style={{ background: 'rgba(0,255,200,0.1)', color: '#00FFC8' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#00FFC8] animate-pulse" />
                System Active
              </span>

              {/* Streak badge */}
              <div
                className="flex items-center gap-2 px-4 py-2 rounded-full"
                style={{ background: 'rgba(0,255,200,0.1)' }}
              >
                <Flame className="h-4 w-4" style={{ color: '#00FFC8' }} />
                <span className="font-bold text-sm text-white">{streak} day streak</span>
              </div>
            </div>

            {/* Headline */}
            <div className="relative z-10 mt-8">
              <h2
                className="text-5xl lg:text-6xl font-bold text-white leading-none tracking-tight mb-4"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Good {greeting}.<br />
                Your edge is{' '}
                <span style={{ color: '#00FFC8' }}>sharpening.</span>
              </h2>
              <p className="text-zinc-400 text-base mb-8 max-w-md">
                {dueToday > 0
                  ? `You have ${dueToday} word${dueToday > 1 ? 's' : ''} due for review. Don't break the chain.`
                  : "You're all caught up. Add new words to keep growing."}
              </p>

              {/* Primary CTA */}
              <button
                onClick={() => navigate('/review')}
                className="group inline-flex items-center gap-3 px-8 py-4 rounded-full font-bold text-base text-zinc-900 transition-all hover:scale-105 glow-mint"
                style={{ background: 'linear-gradient(135deg, #2cffca 0%, #00FFC8 100%)' }}
              >
                <Brain className="h-5 w-5" />
                Start Today's Review
                {dueToday > 0 && (
                  <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-zinc-900/20">
                    {dueToday} due
                  </span>
                )}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>

              {/* Sleep prep button — always visible with countdown */}
              <button
                onClick={() => isSleepPrepActive && navigate('/review?mode=sleep_prep')}
                className="ml-4 inline-flex items-center gap-2 px-6 py-4 rounded-full font-semibold text-sm transition-all"
                style={isSleepPrepActive
                  ? { color: '#00FFC8', border: '1px solid rgba(0,255,200,0.3)', background: 'rgba(0,255,200,0.07)' }
                  : { color: '#52525b', border: '1px solid rgba(255,255,255,0.07)', cursor: 'default' }}
              >
                <Moon className="h-4 w-4" />
                {isSleepPrepActive ? 'Sleep Prep' : `Sleep Prep in ${sleepCountdown}`}
              </button>
            </div>
          </section>

          {/* ── Main grid ────────────────────────────────────────────── */}
          {isLoading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-48 rounded-[1.5rem] bg-zinc-800/60" />
                <Skeleton className="h-48 rounded-[1.5rem] bg-zinc-800/60" />
              </div>
              <Skeleton className="h-72 w-full rounded-[2rem] bg-zinc-800/60" />
            </div>
          ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* Left column */}
            <div className="lg:col-span-7 space-y-8">

              {/* ── Bento stats ──────────────────────────────────────── */}
              <motion.div variants={item} className="grid grid-cols-3 gap-4">

                {/* Total Words */}
                <div className="glass-panel p-6 rounded-[1.5rem] flex flex-col justify-between h-44 hover:border-[#00FFC8]/20 transition-colors col-span-1">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">Total Words</span>
                    <BookOpen className="h-4 w-4 text-zinc-600" />
                  </div>
                  <div>
                    <span className="text-5xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {totalWords}
                    </span>
                    <p className="text-[#00FFC8] text-xs mt-1">+{dueToday} due today</p>
                  </div>
                </div>

                {/* Due Today */}
                <div className="glass-panel p-6 rounded-[1.5rem] flex flex-col justify-between h-44 hover:border-[#00FFC8]/20 transition-colors col-span-1">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">Due Today</span>
                    <Clock className="h-4 w-4 text-zinc-600" />
                  </div>
                  <div>
                    <span className="text-5xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {dueToday}
                    </span>
                    <p className="text-zinc-500 text-xs mt-1">cards pending</p>
                  </div>
                </div>

                {/* Mastered */}
                <div className="glass-panel p-6 rounded-[1.5rem] flex flex-col justify-between h-44 hover:border-[#00FFC8]/20 transition-colors col-span-1">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">Mastered</span>
                    <Sparkles className="h-4 w-4 text-zinc-600" />
                  </div>
                  <div>
                    <div className="flex items-end gap-2">
                      <span className="text-5xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {mastered}
                      </span>
                      <span className="text-zinc-500 text-sm mb-1.5">/ {totalWords} words</span>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-3 h-1 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${masteredPct}%`, background: '#00FFC8' }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* ── Daily Velocity chart ──────────────────────────────── */}
              <motion.div variants={item} className="glass-panel p-8 rounded-[2rem]">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      Daily Velocity
                    </h3>
                    <p className="text-sm text-zinc-500 mt-0.5">Words reviewed over 7 days</p>
                  </div>
                  <MoreHorizontal className="h-5 w-5 text-zinc-600" />
                </div>

                {/* Chart area */}
                <div className="relative">
                  {/* Subtle grid lines */}
                  <div className="absolute left-0 right-0 top-0 bottom-8 flex flex-col justify-between pointer-events-none">
                    {[0, 1, 2, 3].map(i => (
                      <div key={i} className="w-full border-t border-white/[0.04]" />
                    ))}
                  </div>

                  {/* Bars */}
                  <div className="flex items-end justify-between gap-1.5" style={{ height: 148 }}>
                    {velocityBars.map(({ day, heightPx, value, active }) => (
                      <div key={day} className="flex-1 flex flex-col items-center gap-1.5 group">
                        <span
                          className="text-[11px] font-bold tabular-nums transition-all duration-300"
                          style={{
                            color: active ? '#00FFC8' : value > 0 ? 'rgba(255,255,255,0.55)' : 'transparent',
                            textShadow: active ? '0 0 8px rgba(0,255,200,0.6)' : 'none',
                          }}
                        >
                          {value > 0 ? value : ' '}
                        </span>
                        <div
                          className="w-full rounded-xl transition-all duration-500 cursor-pointer"
                          style={{
                            height: heightPx,
                            background: active
                              ? 'linear-gradient(180deg, #00FFC8 0%, #00C4A0 100%)'
                              : value > 0
                                ? 'linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.25) 100%)'
                                : 'rgba(255,255,255,0.05)',
                            boxShadow: active
                              ? '0 0 24px rgba(0,255,200,0.35), 0 4px 12px rgba(0,255,200,0.2)'
                              : 'none',
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Day labels */}
                  <div className="flex justify-between mt-3">
                    {velocityBars.map(({ day, active, value }) => (
                      <span
                        key={day}
                        className="flex-1 text-center text-[10px] uppercase tracking-widest font-bold transition-colors duration-200"
                        style={{
                          color: active ? '#00FFC8' : value > 0 ? '#71717a' : '#3f3f46',
                        }}
                      >
                        {day}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Right column – Recent Words ──────────────────────────── */}
            <motion.div variants={item} className="lg:col-span-5">
              <div className="glass-panel p-8 rounded-[2rem] h-full">
                <div className="flex justify-between items-center mb-7">
                  <h3 className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Recent Acquisitions
                  </h3>
                  <button
                    onClick={() => navigate('/library')}
                    className="text-[10px] font-bold uppercase tracking-widest hover:underline transition-colors"
                    style={{ color: '#00FFC8' }}
                  >
                    View All
                  </button>
                </div>

                <div className="space-y-4">
                  {recentWords.length === 0 ? (
                    <div className="text-center py-12 text-zinc-600">
                      <p className="text-sm">No words yet. Add your first word!</p>
                    </div>
                  ) : (
                    recentWords.map((word) => {
                      const stats = wordStats.find(s => s.word_id === word.id);
                      const mastery = stats ? Math.min(Math.round((stats.stability / 30) * 100), 100) : 0;
                      const isStar = !!(stats && stats.state === 2 && stats.stability >= 21);

                      return (
                        <div
                          key={word.id}
                          onClick={() => navigate(`/library?word=${word.id}`)}
                          className="p-5 rounded-2xl cursor-pointer transition-all duration-200 group"
                          style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.06)',
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0,255,200,0.25)';
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.06)';
                          }}
                        >
                          <div className="flex justify-between items-start mb-1.5">
                            <h4
                              className="text-xl font-bold text-white leading-tight"
                              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                            >
                              {word.word}
                            </h4>
                            <div className="flex items-center gap-2 shrink-0 ml-3">
                              {stats && <EaseBadge difficulty={stats.difficulty} />}
                              <span style={{ color: isStar ? '#00FFC8' : '#3f3f46', fontSize: 16 }}>★</span>
                            </div>
                          </div>

                          <p className="text-zinc-500 text-xs leading-relaxed mb-3 line-clamp-1">
                            {word.definition}
                          </p>

                          {/* Mastery bar */}
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-[3px] rounded-full bg-zinc-800 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${mastery}%`, background: '#00FFC8' }}
                              />
                            </div>
                            <span className="text-[10px] text-zinc-600 font-bold">{mastery}%</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </motion.div>
          </div>
          )}
          {/* end grid */}

        </motion.div>
      </div>
    </AppLayout>
  );
}