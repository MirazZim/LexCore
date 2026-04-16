import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useSaveReviewSession } from '@/hooks/useWords';
import type { ReviewResult } from './types';

interface SummaryPhaseProps {
  results: ReviewResult[];
  sessionStartedAt: string;
}

export function SummaryPhase({ results, sessionStartedAt }: SummaryPhaseProps) {
  const navigate = useNavigate();
  const saveSession = useSaveReviewSession();
  const savedRef = useRef(false);

  const correctCount = results.filter(r => r.correct).length;
  const xpEarned = correctCount * 10;
  const qualityDist = [
    { name: 'Again', count: results.filter(r => r.quality === 0).length, fill: 'hsl(0, 72%, 51%)' },
    { name: 'Hard', count: results.filter(r => r.quality === 2).length, fill: 'hsl(25, 95%, 53%)' },
    { name: 'Good', count: results.filter(r => r.quality === 4).length, fill: 'hsl(217, 91%, 60%)' },
    { name: 'Easy', count: results.filter(r => r.quality === 5).length, fill: 'hsl(142, 71%, 45%)' },
  ];

  useEffect(() => {
    if (!savedRef.current) {
      savedRef.current = true;
      saveSession.mutate({
        started_at: sessionStartedAt,
        words_reviewed: results.length,
        words_correct: correctCount,
        session_type: 'battle',
      });
    }
  }, []);

  return (
    <div className="min-h-screen px-4 pt-6 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-2xl font-bold mb-6 text-center">Session Complete!</h1>
        <div className="grid grid-cols-3 gap-3 mb-8">
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <div className="font-display text-2xl font-bold">{results.length}</div>
              <div className="text-[11px] text-muted-foreground">Reviewed</div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <div className="font-display text-2xl font-bold text-ease-strong">
                {results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0}%
              </div>
              <div className="text-[11px] text-muted-foreground">Correct</div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <div className="font-display text-2xl font-bold text-primary">{xpEarned}</div>
              <div className="text-[11px] text-muted-foreground">XP Earned</div>
            </CardContent>
          </Card>
        </div>
        <Card className="border-border/50 mb-8">
          <CardContent className="p-4">
            <h3 className="font-display font-semibold mb-3">Quality Distribution</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={qualityDist}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 10%, 15%)" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(240, 5%, 65%)' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'hsl(240, 5%, 65%)' }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(240, 12%, 9%)', border: '1px solid hsl(240, 10%, 15%)', borderRadius: '0.5rem' }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {qualityDist.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Button className="w-full h-12 rounded-2xl font-display font-semibold" onClick={() => navigate('/')}>
          Back to Dashboard
        </Button>
      </motion.div>
    </div>
  );
}
