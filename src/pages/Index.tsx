import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { BookOpen, Brain, Clock, Flame, Moon, PenLine, Sparkles, ArrowRight, MoreHorizontal, Target, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AppLayout } from '@/components/AppLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { EaseBadge } from '@/components/EaseBadge';
import { useWords, useWordStats, useDueWords, useReviewSessions, useCalibration, useUserPreferences, useApplyStreakRecovery } from '@/hooks/useWords';
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

/* ─── Hero rotating word ─────────────────────────────────────────── */
/* Sleek palette — desaturated tints (200-level) for a sophisticated cool
   base, with a soft warm complement that produces tension without going
   neon. Chromatic vibration is still the goal, but tuned down so the
   overall feel is liquid-metal / iridescent foil instead of arcade. */
const HERO_WORDS = [
  { text: 'sharpening.',    b1: '#93C5FD', b2: '#C4B5FD', o1: '#FED7AA', o2: '#FECDD3' },
  { text: 'compounding.',   b1: '#A5B4FC', b2: '#C7D2FE', o1: '#FDE68A', o2: '#FED7AA' },
  { text: 'deepening.',     b1: '#DDD6FE', b2: '#FBCFE8', o1: '#BBF7D0', o2: '#A7F3D0' },
  { text: 'expanding.',     b1: '#FBCFE8', b2: '#FED7AA', o1: '#BAE6FD', o2: '#A5B4FC' },
  { text: 'crystallizing.', b1: '#FDE68A', b2: '#A7F3D0', o1: '#DDD6FE', o2: '#C7D2FE' },
];

const letterVariants = {
  hidden: { opacity: 0, y: 24, filter: 'blur(8px)' },
  show:   { opacity: 1, y: 0,  filter: 'blur(0px)', transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};
const lineVariants = {
  hidden: { opacity: 1 },
  show:   { opacity: 1, transition: { staggerChildren: 0.035, delayChildren: 0.1 } },
};

function ScatterWord({ text, b1, b2, o1, o2 }: { text: string; b1: string; b2: string; o1: string; o2: string }) {
  const chars = Array.from(text);
  return (
    <span className="relative inline-block" style={{ whiteSpace: 'pre' }}>
      <AnimatePresence mode="popLayout" initial={false}>
        {chars.map((char, i) => {
          const inAngle  = Math.random() * Math.PI * 2;
          const inDist   = 90 + Math.random() * 90;
          const outAngle = Math.random() * Math.PI * 2;
          const outDist  = 120 + Math.random() * 120;
          return (
            <motion.span
              key={`${text}-${i}-${char}`}
              layout
              className="hero-rotword inline-block will-change-transform"
              style={{
                ['--b1' as never]: b1,
                ['--b2' as never]: b2,
                ['--o1' as never]: o1,
                ['--o2' as never]: o2,
                whiteSpace: 'pre',
                transformOrigin: '50% 60%',
              }}
              initial={{
                opacity: 0,
                x: Math.cos(inAngle) * inDist,
                y: Math.sin(inAngle) * inDist - 20,
                rotate: (Math.random() - 0.5) * 160,
                scale: 0.25,
                filter: 'blur(8px)',
              }}
              animate={{
                opacity: 1,
                x: 0,
                y: 0,
                rotate: 0,
                scale: 1,
                filter: 'blur(0px)',
                transition: {
                  type: 'spring',
                  stiffness: 280,
                  damping: 18,
                  mass: 0.7,
                  delay: i * 0.035,
                },
              }}
              exit={{
                opacity: 0,
                x: Math.cos(outAngle) * outDist,
                y: Math.sin(outAngle) * outDist - 40,
                rotate: (Math.random() - 0.5) * 240,
                scale: 0.4,
                filter: 'blur(6px)',
                transition: {
                  duration: 0.45,
                  ease: [0.4, 0, 0.7, 0.2],
                  delay: i * 0.015,
                },
              }}
            >
              {char}
            </motion.span>
          );
        })}
      </AnimatePresence>
    </span>
  );
}

/* ─── Hero brain visual ──────────────────────────────────────────── */
function HeroBrain({ tintB1, tintB2 }: { tintB1: string; tintB2: string }) {
  // Mouse-tracked parallax tilt — punchy amplitudes for a real 3D read
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rySpring = useSpring(useTransform(mx, [-1, 1], [-16, 16]), { stiffness: 110, damping: 16 });
  const rxSpring = useSpring(useTransform(my, [-1, 1], [12, -12]), { stiffness: 110, damping: 16 });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width) * 2 - 1);
    my.set(((e.clientY - r.top) / r.height) * 2 - 1);
  };
  const handleLeave = () => { mx.set(0); my.set(0); };

  // Glint positions (stable per mount). Stored as numeric % so we can
  // also draw the constellation lines between them in SVG coords.
  const glints = useMemo(
    () => [
      { top: 12, left: 8,  size: 5, dur: 5.2, delay: 0   },
      { top: 28, left: 88, size: 4, dur: 6.4, delay: 0.6 },
      { top: 52, left: 4,  size: 6, dur: 5.8, delay: 1.1 },
      { top: 70, left: 82, size: 4, dur: 6.2, delay: 1.8 },
      { top: 86, left: 24, size: 5, dur: 5.5, delay: 2.3 },
    ],
    []
  );
  // Connect adjacent glints with thin "synapse" lines.
  const links: Array<[number, number]> = [[0, 1], [1, 3], [3, 4], [4, 2], [2, 0], [0, 3]];

  return (
    <motion.div
      className="relative w-full max-w-[230px] xl:max-w-[260px] mx-auto"
      style={{
        perspective: 800,
        perspectiveOrigin: '50% 50%',
        aspectRatio: '3 / 4',
        transformStyle: 'preserve-3d',
      }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      initial={{ opacity: 0, scale: 0.9, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 1.0, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Synced colored halo — sits BEHIND the brain (negative Z) */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          inset: '-18%',
          background: `radial-gradient(closest-side, ${tintB1}66 0%, ${tintB2}33 42%, transparent 78%)`,
          filter: 'blur(52px)',
          transform: 'translateZ(-60px)',
          transition: 'background 0.8s ease',
        }}
        animate={{ scale: [1, 1.07, 1], opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Ambient floor shadow — anchors the brain to a plane */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: '15%', right: '15%', bottom: '4%',
          height: '10%',
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, transparent 70%)',
          filter: 'blur(8px)',
          transform: 'translateZ(-30px)',
        }}
      />

      {/* Faint orbit ring — sits behind the brain plane */}
      <motion.div
        className="absolute pointer-events-none rounded-full"
        style={{
          inset: '6%',
          border: '1px dashed rgba(255,255,255,0.08)',
          transform: 'translateZ(-20px)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
      />

      {/* Neural constellation — thin pulsing synapse lines linking the glints */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ transform: 'translateZ(20px)' }}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="hero-synapse" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={tintB1} stopOpacity="0" />
            <stop offset="50%" stopColor={tintB1} stopOpacity="0.65" />
            <stop offset="100%" stopColor={tintB2} stopOpacity="0" />
          </linearGradient>
        </defs>
        {links.map(([a, b], i) => {
          const ga = glints[a];
          const gb = glints[b];
          return (
            <motion.line
              key={i}
              x1={ga.left} y1={ga.top}
              x2={gb.left} y2={gb.top}
              stroke="url(#hero-synapse)"
              strokeWidth={0.25}
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: [0, 1, 1, 0], opacity: [0, 0.7, 0.7, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.6 }}
            />
          );
        })}
      </svg>

      {/* Floating glints — neural firing, lifted in front of brain */}
      {glints.map((g, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            top: `${g.top}%`,
            left: `${g.left}%`,
            width: g.size,
            height: g.size,
            background: tintB1,
            boxShadow: `0 0 14px ${tintB1}, 0 0 4px ${tintB2}`,
            transform: 'translateZ(60px)',
            transition: 'background 0.6s ease, box-shadow 0.6s ease',
          }}
          animate={{
            y: [0, -14, 0],
            x: [0, i % 2 ? 6 : -6, 0],
            opacity: [0.25, 0.9, 0.25],
            scale:  [0.8, 1.2, 0.8],
          }}
          transition={{ duration: g.dur, repeat: Infinity, ease: 'easeInOut', delay: g.delay }}
        />
      ))}

      {/* The brain — parallax-tilted, breathing, with soft bottom fade */}
      <motion.div
        className="relative w-full h-full"
        style={{
          rotateX: rxSpring,
          rotateY: rySpring,
          z: 20,
          transformStyle: 'preserve-3d',
        }}
      >
        <motion.img
          src="/hero-brain.png"
          alt=""
          draggable={false}
          className="hero-brain-img relative w-full h-full object-contain select-none pointer-events-none"
          style={{
            maskImage: 'linear-gradient(to bottom, black 78%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 78%, transparent 100%)',
          }}
          animate={{ y: [0, -8, 0], scale: [1, 1.018, 1] }}
          transition={{ duration: 7.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>
    </motion.div>
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
  const { data: prefs } = useUserPreferences();
  const applyStreakRecovery = useApplyStreakRecovery();
  const recoveredDate = prefs?.streak_recovery_date ?? null;

  const { streak, recoverable, recoverableStreak } = useMemo(
    () => calculateStreak(reviewSessions.map(s => s.started_at), recoveredDate),
    [reviewSessions, recoveredDate],
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

  /* ── Calibration ─────────────────────────────────────────────────── */
  const { data: cal } = useCalibration();
  const sureTotal = cal?.sureTotal ?? 0;
  const sureCorrect = cal?.sureCorrect ?? 0;
  const calibrationPct = sureTotal > 0 ? Math.round((sureCorrect / sureTotal) * 100) : 0;
  const calibrationColor = calibrationPct >= 70 ? '#00FFC8' : calibrationPct >= 50 ? '#fbbf24' : '#ef4444';

  /* ── Recent words ────────────────────────────────────────────────── */
  const recentWords = [...words]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  /* ── Greatest Hits (10/10 trophies) ──────────────────────────────── */
  const [trophies, setTrophies] = useState<TrophyEntry[]>([]);
  useEffect(() => { setTrophies(getTrophies()); }, []);

  /* ── Hero rotating word ──────────────────────────────────────────── */
  const [heroIdx, setHeroIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setHeroIdx(i => (i + 1) % HERO_WORDS.length), 2600);
    return () => clearInterval(id);
  }, []);

  /* ── Identity ───────────────────────────────────────────────────── */
  const identity     = getIdentity(Math.max(1, streak));
  const idProgressPct = Math.round(identity.progress * 100);
  const idDaysToNext  = identity.next ? identity.next.from - identity.daysIn : 0;
  const [showJourney, setShowJourney] = useState(false);

  /* ── Loading ─────────────────────────────────────────────────────── */
  const isLoading = wordsLoading || statsLoading;

  return (
    <AppLayout>
      <style>{`
        .glass-panel {
          background: rgba(24, 24, 27, 0.55);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.05);
        }
        .glow-mint { box-shadow: 0 0 28px rgba(0,255,200,0.25); }
        .bar-hover:hover { background-color: #00FFC8 !important; }
        @keyframes hero-grid-drift {
          0%   { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(40px, 40px, 0); }
        }
        @keyframes hero-cursor-blink {
          0%, 49%   { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        @keyframes hero-shimmer {
          0%   { background-position: 200% 50%; }
          100% { background-position: 0% 50%; }
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
        .hero-cursor {
          display: inline-block;
          width: 0.05em;
          height: 0.85em;
          margin-left: 0.08em;
          vertical-align: -0.08em;
          background: #F8FAFC;
          box-shadow: 0 0 14px rgba(199,210,254,0.65);
          animation: hero-cursor-blink 1.1s steps(1) infinite;
          border-radius: 2px;
        }
        .hero-rotword {
          /* Liquid-metal sheen: a wide soft base, a narrow warm complement
             band, with a pearl-white core. As the strip pans, the eye sees a
             metallic highlight pass over a cool surface — chromatic tension
             without saturation. */
          background-image: linear-gradient(
            110deg,
            var(--b1) 0%,
            var(--b2) 38%,
            var(--o1) 46%,
            #FFFFFF   50%,
            var(--o2) 54%,
            var(--b2) 62%,
            var(--b1) 100%
          );
          background-size: 280% 100%;
          background-position: 100% 50%;
          animation: hero-shimmer 2.4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          transition: --b1 0.6s ease, --b2 0.6s ease, --o1 0.6s ease, --o2 0.6s ease;
          font-variant-ligatures: none;
          font-feature-settings: "kern" 0;
        }
        @keyframes hero-rotword-settle {
          0%   { transform: scale(1)    translateY(0);    filter: brightness(1); }
          35%  { transform: scale(1.06) translateY(-2px); filter: brightness(1.25); }
          100% { transform: scale(1)    translateY(0);    filter: brightness(1); }
        }
        .hero-rotword-pulse {
          display: inline-block;
          animation: hero-rotword-settle 0.55s ease;
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
        .hero-brain-img {
          /* No drop-shadow — depth comes from the halo + floor shadow behind
             the brain, which stay anchored when the image tilts on hover. */
          filter:
            grayscale(0.1)
            contrast(1.12)
            brightness(1.06);
        }
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
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">

          {/* ── Hero ─────────────────────────────────────────────────── */}
          <section className="relative overflow-hidden rounded-[2.5rem]">
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #080b12 0%, #060608 60%, #0a0612 100%)' }} />
            <div className="hero-grid" />
            <motion.div
              className="absolute -top-16 -right-16 w-[520px] h-[520px] pointer-events-none opacity-50"
              style={{ background: 'radial-gradient(circle, #00FFC8 0%, transparent 60%)' }}
              animate={{ x: [0, -30, 10, 0], y: [0, 20, -10, 0], scale: [1, 1.06, 0.97, 1] }}
              transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute -bottom-20 -left-12 w-[460px] h-[460px] pointer-events-none opacity-40"
              style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 60%)' }}
              animate={{ x: [0, 25, -15, 0], y: [0, -20, 15, 0], scale: [1, 1.08, 0.95, 1] }}
              transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[360px] h-[360px] pointer-events-none opacity-25"
              style={{ background: 'radial-gradient(circle, #38bdf8 0%, transparent 60%)' }}
              animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0], scale: [1, 1.1, 0.92, 1] }}
              transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
            />

            <div
              className="relative z-10 p-6 sm:p-7 lg:p-9"
              style={{
                background: 'rgba(255,255,255,0.06)',
                backdropFilter: 'blur(72px) saturate(180%)',
                WebkitBackdropFilter: 'blur(72px) saturate(180%)',
                border: '1px solid rgba(255,255,255,0.14)',
                borderTop: '1px solid rgba(255,255,255,0.22)',
                borderRadius: '2.5rem',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 24px 64px rgba(0,0,0,0.4)',
              }}
            >
              <div className="flex items-center justify-between mb-5 sm:mb-6">
                <span
                  className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[8px] sm:text-[10px] font-bold uppercase tracking-[0.2em] sm:tracking-[0.25em]"
                  style={{ background: 'rgba(0,255,200,0.07)', color: '#00FFC8', border: '1px solid rgba(0,255,200,0.18)' }}
                >
                  <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-[#00FFC8] animate-pulse" />
                  System Active
                </span>
                {recoverable ? (
                  <button
                    onClick={handleRecover}
                    className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full transition-opacity hover:opacity-80"
                    style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.4)' }}
                  >
                    <Flame className="h-3 w-3 sm:h-3.5 sm:w-3.5" style={{ color: '#f97316' }} />
                    <span className="text-orange-400 text-[10px] sm:text-xs font-bold">Recover {recoverableStreak}-day streak</span>
                  </button>
                ) : (
                  <div
                    className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
                  >
                    <Flame className="h-3 w-3 sm:h-3.5 sm:w-3.5" style={{ color: '#f97316' }} />
                    <span className="text-white text-[10px] sm:text-xs font-bold">{streak}</span>
                    <span className="text-zinc-500 text-[10px] sm:text-xs">day streak</span>
                  </div>
                )}
              </div>

              <div className="lg:flex lg:items-center lg:gap-10 xl:gap-14">
              <div className="lg:flex-1 lg:min-w-0">

              <h2
                className="text-3xl sm:text-4xl xl:text-5xl font-bold text-white leading-[1.08] tracking-tight mb-3"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <motion.span
                  className="block"
                  variants={lineVariants}
                  initial="hidden"
                  animate="show"
                  aria-label={`Good ${greeting}.`}
                >
                  {Array.from(`Good ${greeting}.`).map((c, i) => (
                    <motion.span
                      key={i}
                      variants={letterVariants}
                      className="inline-block"
                      style={{ whiteSpace: 'pre' }}
                    >
                      {c}
                    </motion.span>
                  ))}
                </motion.span>

                <motion.span
                  className="block"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
                >
                  Your edge is{' '}
                  <span className="relative inline-block align-baseline" style={{ minWidth: '7ch' }}>
                    <ScatterWord
                      text={HERO_WORDS[heroIdx].text}
                      b1={HERO_WORDS[heroIdx].b1}
                      b2={HERO_WORDS[heroIdx].b2}
                      o1={HERO_WORDS[heroIdx].o1}
                      o2={HERO_WORDS[heroIdx].o2}
                    />
                  </span>
                </motion.span>
              </h2>

              <motion.p
                className="text-zinc-400 text-sm leading-relaxed mb-5 max-w-md"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.85, ease: [0.22, 1, 0.36, 1] }}
              >
                {dueToday > 0 ? (
                  <>
                    You have{' '}
                    <span className="text-white font-bold tabular-nums">
                      <CountUp to={dueToday} />
                    </span>{' '}
                    word{dueToday > 1 ? 's' : ''} due for review. Don't break the chain.
                  </>
                ) : (
                  "You're all caught up. Add new words to keep growing."
                )}
              </motion.p>

              <motion.div
                className="flex flex-wrap items-center gap-3"
                initial="hidden"
                animate="show"
                variants={{
                  hidden: { opacity: 1 },
                  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 1.05 } },
                }}
              >
                <motion.button
                  variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } } }}
                  whileHover={{ scale: 1.04, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate('/review')}
                  className="hero-cta group w-full sm:w-auto inline-flex items-center justify-center gap-2 sm:gap-2.5 px-5 sm:px-7 py-3 rounded-full font-bold text-sm text-zinc-900 whitespace-nowrap"
                  style={{
                    backgroundImage: 'linear-gradient(135deg, #2cffca 0%, #38bdf8 50%, #a78bfa 100%)',
                    boxShadow: '0 0 32px rgba(0,255,200,0.32), 0 4px 24px rgba(56,189,248,0.22)',
                  }}
                >
                  <Brain className="h-4 w-4 shrink-0" />
                  <span>Start Today's Review</span>
                  {dueToday > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-zinc-900/25 tabular-nums shrink-0">
                      <CountUp to={dueToday} /> due
                    </span>
                  )}
                  <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" />
                </motion.button>

                <motion.button
                  variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } } }}
                  whileHover={isSleepPrepActive ? { scale: 1.04, y: -1 } : undefined}
                  whileTap={isSleepPrepActive ? { scale: 0.97 } : undefined}
                  onClick={() => isSleepPrepActive && navigate('/review?mode=sleep_prep')}
                  className={`inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium transition-colors ${isSleepPrepActive ? 'hero-sleep-active' : ''}`}
                  style={isSleepPrepActive
                    ? { color: '#00FFC8', border: '1px solid rgba(0,255,200,0.28)', background: 'rgba(0,255,200,0.08)' }
                    : { color: '#52525b', border: '1px solid rgba(255,255,255,0.07)', cursor: 'default' }}
                >
                  <Moon className="h-4 w-4 shrink-0" />
                  {isSleepPrepActive
                    ? 'Sleep Prep'
                    : <>Sleep Prep in <span className="tabular-nums">{sleepCountdown}</span></>}
                </motion.button>

                <motion.button
                  variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } } }}
                  whileHover={{ scale: 1.04, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate('/writing')}
                  className="group inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium transition-colors"
                  style={{ color: '#fbbf24', border: '1px solid rgba(251,191,36,0.28)', background: 'rgba(251,191,36,0.06)' }}
                >
                  <PenLine className="h-4 w-4 shrink-0 transition-transform group-hover:rotate-[-8deg]" />
                  Writing Practice
                </motion.button>
              </motion.div>

              </div>

              <div className="hidden lg:block lg:w-[40%] xl:w-[44%] shrink-0">
                <HeroBrain
                  tintB1={HERO_WORDS[heroIdx].b1}
                  tintB2={HERO_WORDS[heroIdx].b2}
                />
              </div>
              </div>
            </div>
          </section>

          {/* ── Main grid ────────────────────────────────────────────── */}
          {isLoading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-48 rounded-[1.5rem] bg-zinc-800/60" />
                <Skeleton className="h-48 rounded-[1.5rem] bg-zinc-800/60" />
              </div>
              <Skeleton className="h-64 w-full rounded-[2rem] bg-zinc-800/60" />
              <Skeleton className="h-72 w-full rounded-[2rem] bg-zinc-800/60" />
            </div>
          ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* 1 · Bento stats — lg row 1 left ─────────────────────── */}
            <motion.div variants={item} className="lg:col-span-7 grid grid-cols-2 gap-4">

              <div className="glass-panel p-6 rounded-[1.5rem] flex flex-col justify-between h-44 hover:border-[#00FFC8]/20 transition-colors">
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

              <div className="glass-panel p-6 rounded-[1.5rem] flex flex-col justify-between h-44 hover:border-[#00FFC8]/20 transition-colors">
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

              <div className="glass-panel p-6 rounded-[1.5rem] flex flex-col justify-between h-44 hover:border-[#00FFC8]/20 transition-colors">
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
                  <div className="mt-3 h-1 w-full rounded-full bg-zinc-800 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${masteredPct}%`, background: '#00FFC8' }} />
                  </div>
                </div>
              </div>

              <div className="glass-panel p-6 rounded-[1.5rem] flex flex-col justify-between h-44 hover:border-[#00FFC8]/20 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">Gut Check Score</span>
                  <Target className="h-4 w-4 text-zinc-600" />
                </div>
                <div>
                  {sureTotal >= 5 ? (
                    <>
                      <span className="text-5xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: calibrationColor }}>
                        {calibrationPct}%
                      </span>
                      <p className="text-zinc-500 text-xs mt-1">{sureCorrect}/{sureTotal} &ldquo;sure&rdquo; correct</p>
                    </>
                  ) : (
                    <>
                      <span className="text-5xl font-bold text-zinc-700" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>—</span>
                      <p className="text-zinc-600 text-xs mt-1">{sureTotal}/5 bets to unlock</p>
                    </>
                  )}
                </div>
              </div>
            </motion.div>

            {/* 2 · Identity card — lg row 1 right | mobile: after bento */}
            <motion.div variants={item} className="lg:col-span-5">
              <div
                className="id-card-home rounded-[2rem] overflow-hidden cursor-pointer"
                onClick={() => setShowJourney(true)}
                style={{ transition: 'box-shadow 0.2s' }}
                onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.boxShadow = 'inset 0 1px 0 rgba(255,210,100,0.10), 0 20px 50px rgba(0,0,0,0.5), 0 0 60px rgba(180,130,30,0.18)')}
                onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.boxShadow = '')}
              >
                <div className="w-full flex items-center justify-center" style={{ height: 220, background: '#0c0907' }}>
                  <img
                    src={identity.current.image}
                    alt={identity.current.name}
                    style={{ display: 'block', maxHeight: '100%', maxWidth: '100%', width: 'auto', height: 'auto', objectFit: 'contain' }}
                  />
                </div>
                <div style={{ borderTop: '1px solid rgba(180,140,55,0.16)', padding: '1.25rem 1.75rem' }}>
                  <div className="flex items-baseline justify-between mb-3">
                    <span className="id-gold-text text-xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {identity.current.name}
                    </span>
                    <span className="text-zinc-500 text-xs tabular-nums">Day {identity.daysIn}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="id-gold-bar h-full rounded-full transition-all duration-700" style={{ width: `${idProgressPct}%` }} />
                  </div>
                  <p className="mt-2 text-[11px] font-medium" style={{ color: 'rgba(192,148,60,0.7)' }}>
                    {identity.next
                      ? `${idDaysToNext} day${idDaysToNext === 1 ? '' : 's'} to ${identity.next.name} · keep your streak`
                      : "You've reached the highest title"}
                  </p>
                  <p className="mt-2.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.15)' }}>
                    Tap to explore journey →
                  </p>
                </div>
              </div>
            </motion.div>

            {/* 3 · Daily Velocity — lg row 2 left ───────────────────── */}
            <motion.div variants={item} className="lg:col-span-7 glass-panel p-8 rounded-[2rem]">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Daily Velocity
                  </h3>
                  <p className="text-sm text-zinc-500 mt-0.5">Words reviewed over 7 days</p>
                </div>
                <MoreHorizontal className="h-5 w-5 text-zinc-600" />
              </div>

              <div className="relative">
                <div className="absolute left-0 right-0 top-0 bottom-8 flex flex-col justify-between pointer-events-none">
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className="w-full border-t border-white/[0.04]" />
                  ))}
                </div>

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
                        {value > 0 ? value : ' '}
                      </span>
                      <div
                        className="w-full rounded-xl transition-all duration-500 cursor-pointer bar-hover"
                        style={{
                          height: heightPx,
                          background: active
                            ? 'linear-gradient(180deg, #00FFC8 0%, #00C4A0 100%)'
                            : value > 0
                              ? 'linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.25) 100%)'
                              : 'rgba(255,255,255,0.05)',
                          boxShadow: active ? '0 0 24px rgba(0,255,200,0.35), 0 4px 12px rgba(0,255,200,0.2)' : 'none',
                        }}
                      />
                    </div>
                  ))}
                </div>

                <div className="flex justify-between mt-3">
                  {velocityBars.map(({ day, active, value }) => (
                    <span
                      key={day}
                      className="flex-1 text-center text-[10px] uppercase tracking-widest font-bold transition-colors duration-200"
                      style={{ color: active ? '#00FFC8' : value > 0 ? '#71717a' : '#3f3f46' }}
                    >
                      {day}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* 4 · Recent Acquisitions — lg row 2 right ──────────────── */}
            <motion.div variants={item} className="lg:col-span-5 glass-panel p-8 rounded-[2rem]">
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
                        className="p-5 rounded-2xl cursor-pointer transition-all duration-200"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0,255,200,0.25)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.06)'; }}
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
            </motion.div>

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
