import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useSaveReviewSession } from '@/hooks/useWords';
import { RV_STYLES } from '@/pages/ReviewPage';
import type { ReviewResult } from './types';

interface SummaryPhaseProps {
  results: ReviewResult[];
  sessionStartedAt: string;
}

const container = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const qualityDist = (results: ReviewResult[]) => [
  { name: 'Again', count: results.filter(r => r.quality === 0).length, fill: '#ef4444' },
  { name: 'Hard',  count: results.filter(r => r.quality === 2).length, fill: '#f97316' },
  { name: 'Good',  count: results.filter(r => r.quality === 4).length, fill: '#3b82f6' },
  { name: 'Easy',  count: results.filter(r => r.quality === 5).length, fill: '#00FFC8' },
];

export function SummaryPhase({ results, sessionStartedAt }: SummaryPhaseProps) {
  const navigate = useNavigate();
  const saveSession = useSaveReviewSession();
  const savedRef = useRef(false);

  const correctCount = results.filter(r => r.correct).length;
  const accuracy = results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0;
  const xpEarned = correctCount * 10;
  const dist = qualityDist(results);

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
    <div className="min-h-screen px-4 pt-8 pb-24 max-w-lg mx-auto">
      <style>{RV_STYLES}</style>

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

        {/* Title */}
        <motion.div variants={item} className="text-center pt-4">
          <div
            className="inline-flex items-center gap-2 px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.3em] mb-4"
            style={{ background: 'rgba(0,255,200,0.1)', color: '#00FFC8' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#00FFC8] animate-pulse" />
            Session Complete
          </div>
          <h1
            className="text-4xl font-bold text-white"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Well done!
          </h1>
        </motion.div>

        {/* Stats bento */}
        <motion.div variants={item} className="grid grid-cols-3 gap-3">
          {[
            { label: 'Reviewed', value: results.length, color: '#fff' },
            { label: 'Accuracy', value: `${accuracy}%`, color: '#00FFC8' },
            { label: 'XP Earned', value: xpEarned, color: '#f97316' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rv-glass rounded-2xl p-5 flex flex-col items-center gap-1">
              <span
                className="text-3xl font-bold"
                style={{ color, fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {value}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">{label}</span>
            </div>
          ))}
        </motion.div>

        {/* Quality distribution chart */}
        <motion.div variants={item} className="rv-glass rounded-[2rem] p-7">
          <h3 className="text-base font-bold text-white mb-5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Quality Distribution
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dist} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#52525b', fontWeight: 700 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#52525b' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(24,24,27,0.95)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '0.75rem',
                  color: '#fff',
                }}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {dist.map((entry, idx) => (
                  <Cell key={idx} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Word-by-word list */}
        {results.length > 0 && (
          <motion.div variants={item} className="rv-glass rounded-[2rem] p-7">
            <h3 className="text-base font-bold text-white mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Words Reviewed
            </h3>
            <div className="space-y-2">
              {results.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 px-1"
                  style={{ borderBottom: i < results.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
                >
                  <span className="text-white font-medium">{r.word}</span>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={
                      r.quality === 5
                        ? { background: 'rgba(0,255,200,0.1)', color: '#00FFC8' }
                        : r.quality === 4
                        ? { background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }
                        : r.quality === 2
                        ? { background: 'rgba(249,115,22,0.1)', color: '#f97316' }
                        : { background: 'rgba(239,68,68,0.1)', color: '#ef4444' }
                    }
                  >
                    {r.quality === 5 ? 'Easy' : r.quality === 4 ? 'Good' : r.quality === 2 ? 'Hard' : 'Again'}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* CTA */}
        <motion.div variants={item}>
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
