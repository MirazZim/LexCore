import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Brain, Clock, Flame, Moon, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EaseBadge } from '@/components/EaseBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { useWords, useWordStats, useDueWords, useReviewSessions } from '@/hooks/useWords';
import { useAuth } from '@/contexts/AuthContext';
import { seedWordsIfEmpty } from '@/lib/seed-words';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: words = [], isLoading: wordsLoading } = useWords();
  const { data: wordStats = [], isLoading: statsLoading } = useWordStats();
  const { data: dueWords = [] } = useDueWords();
  const { data: reviewSessions = [] } = useReviewSessions();

  const now = new Date();
  const isEvening = now.getHours() >= 20;

  // Seed on first load if empty
  useEffect(() => {
    if (user && !wordsLoading && words.length === 0) {
      seedWordsIfEmpty(user.id);
    }
  }, [user, wordsLoading, words.length]);

  const totalWords = words.length;
  const dueToday = dueWords.length;
  const mastered = wordStats.filter(s => s.repetitions >= 5).length;

  // Compute streak from review_sessions
  const streak = (() => {
    if (reviewSessions.length === 0) return 0;
    const sessionDates = [...new Set(
      reviewSessions.map(s => {
        const d = new Date(s.started_at);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      })
    )].sort().reverse();

    const today = new Date();
    const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;

    // Streak must start from today or yesterday
    if (sessionDates[0] !== todayKey && sessionDates[0] !== yesterdayKey) return 0;

    let count = 0;
    const check = new Date(today);
    if (sessionDates[0] !== todayKey) {
      check.setDate(check.getDate() - 1);
    }
    for (let i = 0; i < 365; i++) {
      const key = `${check.getFullYear()}-${check.getMonth()}-${check.getDate()}`;
      if (sessionDates.includes(key)) {
        count++;
        check.setDate(check.getDate() - 1);
      } else {
        break;
      }
    }
    return count;
  })();

  const recentWords = [...words]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const stats = [
    { label: 'Total Words', value: totalWords, icon: BookOpen, color: 'text-primary' },
    { label: 'Due Today', value: dueToday, icon: Clock, color: 'text-ease-learning' },
    { label: 'Mastered', value: mastered, icon: Sparkles, color: 'text-ease-strong' },
  ];

  const isLoading = wordsLoading || statsLoading;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="px-4 pt-6 pb-4 max-w-lg mx-auto space-y-6">
          <Skeleton className="h-12 w-48" />
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-14 w-full" />
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
        <motion.div variants={container} initial="hidden" animate="show">
          {/* Header */}
          <motion.div variants={item} className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-2xl font-bold">Good {isEvening ? 'evening' : now.getHours() < 12 ? 'morning' : 'afternoon'}</h1>
                <p className="text-muted-foreground text-sm mt-1">Keep your streak going!</p>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2">
                <Flame className="h-4 w-4 text-ease-learning" />
                <span className="font-display font-bold text-sm">{streak}</span>
              </div>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div variants={item} className="grid grid-cols-3 gap-3 mb-6">
            {stats.map(({ label, value, icon: Icon, color }) => (
              <Card key={label} className="border-border/50">
                <CardContent className="p-4 text-center">
                  <Icon className={`h-5 w-5 mx-auto mb-2 ${color}`} />
                  <div className="font-display text-2xl font-bold">{value}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">{label}</div>
                </CardContent>
              </Card>
            ))}
          </motion.div>

          {/* CTAs */}
          <motion.div variants={item} className="space-y-3 mb-8">
            <Button
              className="w-full h-14 text-base font-display font-semibold rounded-2xl"
              onClick={() => navigate('/review')}
            >
              <Brain className="h-5 w-5 mr-2" />
              Start Today's Review
              {dueToday > 0 && (
                <span className="ml-2 rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs">
                  {dueToday} due
                </span>
              )}
            </Button>
            {isEvening && (
              <Button
                variant="secondary"
                className="w-full h-12 rounded-2xl"
                onClick={() => navigate('/review?mode=sleep_prep')}
              >
                <Moon className="h-4 w-4 mr-2" />
                Sleep Prep Mode
              </Button>
            )}
          </motion.div>

          {/* Recent Words */}
          <motion.div variants={item}>
            <h2 className="font-display text-lg font-semibold mb-3">Recent Words</h2>
            {recentWords.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No words yet. Add your first word!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentWords.map((word) => {
                  const stats = wordStats.find(s => s.word_id === word.id);
                  return (
                    <Card
                      key={word.id}
                      className="border-border/50 cursor-pointer hover:border-primary/30 transition-colors"
                      onClick={() => navigate('/library')}
                    >
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <span className="font-display font-semibold">{word.word}</span>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {word.definition}
                          </p>
                        </div>
                        {stats && <EaseBadge easeFactor={stats.ease_factor} />}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
