import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { EaseBadge } from '@/components/EaseBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { useWords, useWordStats, useReviewSessions } from '@/hooks/useWords';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import { cn } from '@/lib/utils';

const PIE_COLORS = [
  'hsl(0, 72%, 51%)',
  'hsl(25, 95%, 53%)',
  'hsl(217, 91%, 60%)',
  'hsl(142, 71%, 45%)',
];

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
      { name: 'Hard', value: Math.round(incorrect * 0.6) || 0 },
      { name: 'Good', value: Math.round(correct * 0.6) || 0 },
      { name: 'Easy', value: Math.round(correct * 0.4) || 0 },
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

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

  const isLoading = wordsLoading || statsLoading || sessionsLoading;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="px-4 pt-6 max-w-lg mx-auto space-y-4">
          <Skeleton className="h-8 w-32" />
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="px-4 pt-6 max-w-lg mx-auto">
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.h1 variants={item} className="font-display text-2xl font-bold mb-6">Progress</motion.h1>

          <motion.div variants={item}>
            <Card className="border-border/50 mb-4">
              <CardContent className="p-4">
                <h3 className="font-display font-semibold mb-3 text-sm">Last 30 Days</h3>
                <div className="grid grid-cols-10 gap-1.5">
                  {calendarDays.map(day => (
                    <div key={day.dateStr} className={cn('aspect-square rounded-sm flex items-center justify-center text-[9px]', day.hasSession ? 'bg-ease-strong text-white' : 'bg-secondary text-muted-foreground')} title={day.dateStr}>
                      {day.dayLabel}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="border-border/50 mb-4">
              <CardContent className="p-4">
                <h3 className="font-display font-semibold mb-3 text-sm">Words Mastered</h3>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={masteryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 10%, 15%)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(240, 5%, 65%)' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(240, 5%, 65%)' }} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(240, 12%, 9%)', border: '1px solid hsl(240, 10%, 15%)', borderRadius: '0.5rem' }} />
                    <Line type="monotone" dataKey="mastered" stroke="hsl(263, 70%, 58%)" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="border-border/50 mb-4">
              <CardContent className="p-4">
                <h3 className="font-display font-semibold mb-3 text-sm">Quality Distribution</h3>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={qualityDist} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {qualityDist.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(240, 12%, 9%)', border: '1px solid hsl(240, 10%, 15%)', borderRadius: '0.5rem' }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="border-border/50 mb-4">
              <CardContent className="p-4">
                <h3 className="font-display font-semibold mb-3 text-sm">Hardest Words</h3>
                {hardestWords.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data yet</p>
                ) : (
                  <div className="space-y-2">
                    {hardestWords.map((w, i) => (
                      <div key={w.word} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                          <span className="font-display text-sm font-medium">{w.word}</span>
                        </div>
                        <EaseBadge easeFactor={w.easeFactor} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="border-border/50 mb-4">
              <CardContent className="p-4">
                <h3 className="font-display font-semibold mb-3 text-sm">Due This Week</h3>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={weekForecast}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 10%, 15%)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(240, 5%, 65%)' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(240, 5%, 65%)' }} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(240, 12%, 9%)', border: '1px solid hsl(240, 10%, 15%)', borderRadius: '0.5rem' }} />
                    <Bar dataKey="due" fill="hsl(263, 70%, 58%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
