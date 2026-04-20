import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart2, Calendar, Target, TrendingUp, Zap } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { EaseBadge } from '@/components/EaseBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { useWords, useWordStats, useReviewSessions } from '@/hooks/useWords';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';

const PIE_COLORS = ['#ef4444', '#f97316', '#3b82f6', '#00FFC8'];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

const tooltipStyle = {
  backgroundColor: 'rgba(9,9,11,0.95)',
  border: '1px solid rgba(0,255,200,0.15)',
  borderRadius: '0.75rem',
  color: '#fff',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
};

export default function ProgressPage() {
  const { data: words = [], isLoading: wordsLoading } = useWords();
  const { data: wordStats = [], isLoading: statsLoading } = useWordStats();
  const { data: sessions = [], isLoading: sessionsLoading } = useReviewSessions();
  const now = new Date();

  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const hasSession = sessions.some(s => s.started_at.split('T')[0] === dateStr);
      days.push({ date: d, dateStr, hasSession, dayLabel: d.getDate() });
    }
    return days;
  }, [sessions]);

  const masteryData = useMemo(() => {
    const weeks = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      const label = `W${4 - i}`;
      const mastered = wordStats.filter(s => s.repetitions >= 5 - i).length;
      weeks.push({ name: label, mastered: Math.min(mastered, words.length) });
    }
    return weeks;
  }, [wordStats, words]);

  const qualityDist = useMemo(() => {
    const total = sessions.reduce((acc, s) => acc + s.words_reviewed, 0);
    const correct = sessions.reduce((acc, s) => acc + s.words_correct, 0);
    const incorrect = total - correct;
    return [
      { name: 'Again', value: Math.round(incorrect * 0.4) || 0 },
      { name: 'Hard',  value: Math.round(incorrect * 0.6) || 0 },
      { name: 'Good',  value: Math.round(correct * 0.6)   || 0 },
      { name: 'Easy',  value: Math.round(correct * 0.4)   || 0 },
    ];
  }, [sessions]);

  const hardestWords = useMemo(() => {
    return [...wordStats]
      .sort((a, b) => a.ease_factor - b.ease_factor)
      .slice(0, 5)
      .map(s => ({
        word: words.find(w => w.id === s.word_id)?.word || '',
        easeFactor: s.ease_factor,
      }));
  }, [wordStats, words]);

  const weekForecast = useMemo(() => {
    const days = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      const dayEnd = new Date(d); dayEnd.setHours(23, 59, 59);
      const dayStart = new Date(d); dayStart.setHours(0, 0, 0);
      const due = wordStats.filter(s => {
        const reviewDate = new Date(s.next_review_at);
        return reviewDate >= dayStart && reviewDate <= dayEnd;
      }).length;
      days.push({ name: i === 0 ? 'Today' : dayNames[d.getDay()], due });
    }
    return days;
  }, [wordStats]);

  const isLoading = wordsLoading || statsLoading || sessionsLoading;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="px-6 pt-8 pb-24 max-w-5xl mx-auto space-y-5">
          <Skeleton className="h-12 w-48 rounded-2xl bg-zinc-800/60" />
          <div className="grid grid-cols-2 gap-5">
            <Skeleton className="h-56 rounded-[1.5rem] bg-zinc-800/60" />
            <Skeleton className="h-56 rounded-[1.5rem] bg-zinc-800/60" />
          </div>
          <div className="grid grid-cols-2 gap-5">
            <Skeleton className="h-56 rounded-[1.5rem] bg-zinc-800/60" />
            <Skeleton className="h-56 rounded-[1.5rem] bg-zinc-800/60" />
          </div>
          <Skeleton className="h-52 w-full rounded-[1.5rem] bg-zinc-800/60" />
        </div>
      </AppLayout>
    );
  }

  const activeDays = calendarDays.filter(d => d.hasSession).length;

  return (
    <AppLayout>
      <style>{`
        .gls {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(40px);
          -webkit-backdrop-filter: blur(40px);
          border: 1px solid rgba(255, 255, 255, 0.07);
        }
        .gls-hover {
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .gls-hover:hover {
          border-color: rgba(0, 255, 200, 0.18);
          box-shadow: 0 0 0 1px rgba(0,255,200,0.06) inset, 0 20px 60px rgba(0,0,0,0.35);
        }
        .mint-glow {
          box-shadow: 0 0 24px rgba(0,255,200,0.2);
        }
        .section-label {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: #52525b;
        }
      `}</style>

      <div className="px-6 pt-8 pb-28 max-w-5xl mx-auto">
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">

          {/* ── Page title ───────────────────────────────────────────── */}
          <motion.div variants={item} className="flex items-end justify-between mb-2">
            <div>
              <h1
                className="text-4xl font-bold text-white tracking-tight"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Progress
              </h1>
              <p className="text-zinc-500 text-sm mt-1">
                {activeDays} active day{activeDays !== 1 ? 's' : ''} in the last 30
              </p>
            </div>
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
              style={{ background: 'rgba(0,255,200,0.08)', color: '#00FFC8', border: '1px solid rgba(0,255,200,0.15)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#00FFC8] animate-pulse" />
              Live
            </span>
          </motion.div>

          {/* ── Row 1: Study Activity + Words Mastered ───────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Study Activity */}
            <motion.div variants={item} className="gls gls-hover rounded-[1.5rem] p-6">
              <div className="flex items-center gap-2 mb-4">
                <div
                  className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(0,255,200,0.08)' }}
                >
                  <Calendar className="h-3.5 w-3.5" style={{ color: '#00FFC8' }} />
                </div>
                <span className="section-label">Study Activity</span>
              </div>
              <div className="grid grid-cols-10 gap-[5px]">
                {calendarDays.map(day => (
                  <div
                    key={day.dateStr}
                    title={day.dateStr}
                    className="w-full aspect-square rounded-md flex items-center justify-center text-[8px] font-bold transition-all duration-200"
                    style={{
                      background: day.hasSession
                        ? 'linear-gradient(135deg, rgba(0,255,200,0.25), rgba(0,255,200,0.12))'
                        : 'rgba(255,255,255,0.03)',
                      color: day.hasSession ? '#00FFC8' : '#3f3f46',
                      border: day.hasSession ? '1px solid rgba(0,255,200,0.25)' : '1px solid rgba(255,255,255,0.04)',
                      boxShadow: day.hasSession ? '0 0 8px rgba(0,255,200,0.1)' : 'none',
                    }}
                  >
                    {day.dayLabel}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Words Mastered */}
            <motion.div variants={item} className="gls gls-hover rounded-[1.5rem] p-6">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(0,255,200,0.08)' }}
                  >
                    <TrendingUp className="h-3.5 w-3.5" style={{ color: '#00FFC8' }} />
                  </div>
                  <span className="section-label">Words Mastered</span>
                </div>
                <span
                  className="text-2xl font-bold"
                  style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#00FFC8' }}
                >
                  {masteryData[masteryData.length - 1]?.mastered ?? 0}
                </span>
              </div>
              <ResponsiveContainer width="100%" height={170}>
                <LineChart data={masteryData} margin={{ top: 16, right: 4, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00FFC8" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#00FFC8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#52525b' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#52525b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: 'rgba(0,255,200,0.15)' }} />
                  <Line
                    type="monotone"
                    dataKey="mastered"
                    stroke="#00FFC8"
                    strokeWidth={2}
                    dot={{ r: 3.5, fill: '#00FFC8', strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#00FFC8', strokeWidth: 0, filter: 'url(#glow)' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          </div>

          {/* ── Row 2: Answer Breakdown + Upcoming Reviews ───────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Answer Breakdown */}
            <motion.div variants={item} className="gls gls-hover rounded-[1.5rem] p-6">
              <div className="flex items-center gap-2 mb-4">
                <div
                  className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(0,255,200,0.08)' }}
                >
                  <Target className="h-3.5 w-3.5" style={{ color: '#00FFC8' }} />
                </div>
                <span className="section-label">Answer Breakdown</span>
              </div>
              <div className="flex items-center gap-2">
                <ResponsiveContainer width="52%" height={150}>
                  <PieChart>
                    <Pie
                      data={qualityDist}
                      cx="50%"
                      cy="50%"
                      innerRadius={34}
                      outerRadius={58}
                      dataKey="value"
                      strokeWidth={0}
                      paddingAngle={2}
                    >
                      {qualityDist.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx]} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyle}
                      itemStyle={{ color: '#a1a1aa' }}
                      labelStyle={{ color: '#fff', fontWeight: 600 }}
                      formatter={(value: number, name: string) => [value, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2.5 flex-1">
                  {qualityDist.map((entry, idx) => {
                    const total = qualityDist.reduce((s, e) => s + e.value, 0);
                    const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
                    return (
                      <div key={entry.name}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: PIE_COLORS[idx] }} />
                            <span className="text-[11px] text-zinc-400">{entry.name}</span>
                          </div>
                          <span className="text-[11px] font-bold text-white">{pct}%</span>
                        </div>
                        <div className="h-[3px] rounded-full bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: PIE_COLORS[idx] }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>

            {/* Upcoming Reviews */}
            <motion.div variants={item} className="gls gls-hover rounded-[1.5rem] p-6">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(0,255,200,0.08)' }}
                  >
                    <BarChart2 className="h-3.5 w-3.5" style={{ color: '#00FFC8' }} />
                  </div>
                  <span className="section-label">Upcoming Reviews</span>
                </div>
                <span
                  className="text-2xl font-bold"
                  style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#00FFC8' }}
                >
                  {weekForecast.reduce((s, d) => s + d.due, 0)}
                  <span className="text-zinc-600 text-xs font-normal ml-1">this wk</span>
                </span>
              </div>
              <ResponsiveContainer width="100%" height={170}>
                <BarChart data={weekForecast} margin={{ top: 16, right: 4, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00FFC8" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#00FFC8" stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#52525b' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#52525b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="due" fill="url(#barGrad)" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </div>

          {/* ── Hardest Words ─────────────────────────────────────────── */}
          <motion.div variants={item} className="gls gls-hover rounded-[1.5rem] p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(0,255,200,0.08)' }}
                >
                  <Zap className="h-3.5 w-3.5" style={{ color: '#00FFC8' }} />
                </div>
                <span className="section-label">Hardest Words</span>
              </div>
              <span
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: 'rgba(0,255,200,0.5)' }}
              >
                Ease Factor
              </span>
            </div>
            {hardestWords.length === 0 ? (
              <p className="text-sm text-zinc-600 text-center py-8">No data yet — start reviewing to see results.</p>
            ) : (
              <div className="space-y-2">
                {hardestWords.map((w, i) => (
                  <div
                    key={w.word}
                    className="flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,255,200,0.04)';
                      (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0,255,200,0.15)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)';
                      (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.05)';
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                        style={{ background: 'rgba(0,255,200,0.08)', color: '#00FFC8' }}
                      >
                        {i + 1}
                      </span>
                      <span
                        className="font-semibold text-white text-sm"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {w.word}
                      </span>
                    </div>
                    <EaseBadge easeFactor={w.easeFactor} />
                  </div>
                ))}
              </div>
            )}
          </motion.div>

        </motion.div>
      </div>
    </AppLayout>
  );
}
