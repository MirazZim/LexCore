import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { ClearTrophy } from '@/components/achievements/ClearTrophy';
import { TrophyCalendar } from '@/components/achievements/TrophyCalendar';
import { useDailyClears } from '@/hooks/useDailyClears';
import { useReviewEvents } from '@/hooks/useWords';
import { clearStreaks } from '@/lib/daily-clears';
import { dateKey } from '@/lib/streak';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

const shortDate = (day: string) =>
  new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

export default function AchievementsPage() {
  const navigate = useNavigate();
  const { data: clears = [], isLoading } = useDailyClears();
  const { data: reviewEvents = [] } = useReviewEvents();
  const { current, best } = useMemo(() => clearStreaks(clears.map(c => c.day)), [clears]);
  const studiedDays = useMemo(
    () => new Set(reviewEvents.map(e => dateKey(new Date(e.reviewed_at)))),
    [reviewEvents],
  );
  // Trophy picked on the calendar: scrolled to on the shelf and briefly lit
  const [highlight, setHighlight] = useState<string | null>(null);
  const showTrophy = (day: string) => {
    document.getElementById(`trophy-${day}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlight(day);
    window.setTimeout(() => setHighlight(h => (h === day ? null : h)), 1800);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="px-6 pt-8 pb-24 max-w-5xl mx-auto space-y-5">
          <Skeleton className="h-12 w-48 rounded-2xl bg-zinc-800/60" />
          <Skeleton className="h-64 w-full rounded-[1.5rem] bg-zinc-800/60" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-72 rounded-[1.5rem] bg-zinc-800/60" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <style>{`
        .ach-hero {
          background: radial-gradient(ellipse at 50% 0%, rgba(240,201,106,0.16) 0%, transparent 60%),
                      linear-gradient(180deg, #0d0a07 0%, #110e0a 100%);
          border: 1px solid rgba(180,140,55,0.32);
          box-shadow: inset 0 1px 0 rgba(255,210,100,0.07), 0 20px 60px rgba(0,0,0,0.35);
        }
        .ach-card {
          background: linear-gradient(180deg, #0d0a07 0%, #110e0a 100%);
          border: 1px solid rgba(180,140,55,0.22);
          transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
        }
        .ach-card:hover {
          border-color: rgba(240,201,106,0.45);
          box-shadow: 0 0 36px rgba(240,201,106,0.12);
          transform: translateY(-2px);
        }
        .ach-gold {
          background: linear-gradient(120deg, #c8922a 0%, #fff3c4 45%, #f0c96a 60%, #c08828 100%);
          -webkit-background-clip: text; background-clip: text; color: transparent;
        }
        .section-label {
          font-size: 10px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.15em; color: #71717a;
        }
      `}</style>

      <div className="px-6 pt-8 pb-28 max-w-5xl mx-auto">
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">

          {/* ── Page title ───────────────────────────────────────────── */}
          <motion.div variants={item} className="mb-2">
            <h1 className="text-4xl font-bold text-white tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Achievements
            </h1>
            <p className="text-zinc-500 text-sm mt-1">A trophy for every day you clear all your due words</p>
          </motion.div>

          {/* ── Hero tally ───────────────────────────────────────────── */}
          <motion.div variants={item} className="ach-hero rounded-[1.5rem] p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
            <div className={clears.length === 0 ? 'opacity-30 grayscale' : ''}>
              <ClearTrophy size={130} animated={clears.length > 0} />
            </div>
            <div className="flex-1 w-full text-center sm:text-left">
              <p className="section-label">Days cleared</p>
              <p className="ach-gold text-6xl font-bold tabular-nums leading-none mt-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {clears.length}
              </p>
              <div className="flex justify-center sm:justify-start gap-8 mt-5">
                <div>
                  <p className="text-2xl font-bold text-white tabular-nums" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{current}</p>
                  <p className="section-label mt-1">Current run</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white tabular-nums" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{best}</p>
                  <p className="section-label mt-1">Best run</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── Trophy calendar ──────────────────────────────────────── */}
          {(clears.length > 0 || studiedDays.size > 0) && (
            <motion.div variants={item}>
              <TrophyCalendar clears={clears} studiedDays={studiedDays} onSelect={showTrophy} />
            </motion.div>
          )}

          {/* ── Trophy shelf ─────────────────────────────────────────── */}
          {clears.length === 0 ? (
            <motion.div variants={item} className="ach-card rounded-[1.5rem] p-10 text-center">
              <p className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Your shelf is waiting
              </p>
              <p className="text-sm text-zinc-500 mb-6">Review every word that's due today to earn your first trophy.</p>
              <button
                onClick={() => navigate('/review')}
                className="px-6 py-3 rounded-full font-bold text-sm text-zinc-900"
                style={{ background: 'linear-gradient(120deg, #c8922a 0%, #f0c96a 50%, #c08828 100%)' }}
              >
                Start today's review
              </button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {clears.map((c, i) => (
                <motion.figure
                  key={c.id}
                  id={`trophy-${c.day}`}
                  variants={item}
                  className="ach-card rounded-[1.5rem] p-6 flex flex-col items-center text-center scroll-mt-28"
                  style={highlight === c.day ? { borderColor: 'rgba(240,201,106,0.85)', boxShadow: '0 0 48px rgba(240,201,106,0.3)' } : undefined}
                >
                  <p className="section-label" style={{ color: '#c8922a' }}>Trophy #{clears.length - i}</p>
                  <div className="my-3">
                    <ClearTrophy size={96} plaque={shortDate(c.day)} />
                  </div>
                  <p className="text-xs text-zinc-400 tabular-nums">
                    {c.words_cleared} word{c.words_cleared !== 1 ? 's' : ''} · {c.accuracy}% accuracy
                  </p>
                  <blockquote className="text-sm leading-snug text-[#fff3c4]/90 italic mt-4" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                    “{c.quote}”
                  </blockquote>
                  <figcaption className="text-[11px] text-[#c8922a] mt-2">— {c.quote_author}</figcaption>
                </motion.figure>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
}
