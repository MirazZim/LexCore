import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Check, X, MapPin, Star, Zap, BookOpen, Brain, Feather, Search, Layers, Infinity as InfinityIcon } from 'lucide-react';

/* ─── Identity data ──────────────────────────────────────────────── */
const IDENTITIES = [
  { id: 'apprentice', title: 'Apprentice', dayStart: 1, dayEnd: 7, image: '/Apprentice.webp' },
  { id: 'scribe', title: 'Scribe', dayStart: 8, dayEnd: 20, image: '/Scribe.webp' },
  { id: 'scholar', title: 'Scholar', dayStart: 21, dayEnd: 45, image: '/Scholar.webp' },
  { id: 'rhetorician', title: 'Rhetorician', dayStart: 46, dayEnd: 75, image: '/Rhetorician.webp' },
  { id: 'lexicographer', title: 'Lexicographer', dayStart: 76, dayEnd: 120, image: '/Lexicographer.webp' },
  { id: 'philologist', title: 'Philologist', dayStart: 121, dayEnd: 200, image: '/Philologist.webp' },
  { id: 'etymologist', title: 'Etymologist', dayStart: 201, dayEnd: 365, image: '/Etymologist.webp' },
  { id: 'polymath', title: 'Polymath', dayStart: 366, dayEnd: null, image: '/Polymath.webp' },
] as const;

type IdentityId = typeof IDENTITIES[number]['id'];

interface IdentityDetail {
  icon: React.ElementType;
  tagline: string;
  description: string;
  quote: string;
  quoteAuthor: string;
  traits: string[];
  milestones: string[];
  accentColor: string;
  accentDim: string;
  tier: string;
}

const DETAILS: Record<IdentityId, IdentityDetail> = {
  apprentice: {
    icon: Star,
    tier: 'Tier I',
    tagline: 'The Brave Beginning',
    description:
      "Most people never start. You did. Right now, while someone else is scrolling past their thousandth short video, you're here — choosing to build something that lasts. The first week isn't about mastery. It's about proving something to yourself: that you're the kind of person who shows up. That quiet proof is rarer than any skill.",
    quote: "The secret of getting ahead is getting started.",
    quoteAuthor: "Mark Twain",
    traits: ['Curious', 'Brave', 'Consistent', 'Hungry'],
    milestones: [
      "You chose growth when most chose comfort",
      "You showed up on days you didn't want to",
      "You let a system work for you instead of fighting it",
      "You planted seeds that will outlast this week",
    ],
    accentColor: '#a78bfa',
    accentDim: 'rgba(167,139,250,0.12)',
  },
  scribe: {
    icon: Feather,
    tier: 'Tier II',
    tagline: 'The Ancient Art of Showing Up',
    description:
      "In Alexandria's great library, scribes didn't just copy text — they preserved civilization. Eight days in, you're doing the same thing: committing language to memory so that future-you has access to words that less-disciplined minds will reach for and miss. You've crossed the threshold that stops most people. You're no longer testing the water. You're swimming.",
    quote: "What you write in your mind today, you speak with authority tomorrow.",
    quoteAuthor: "Ancient proverb",
    traits: ['Disciplined', 'Methodical', 'Persistent', 'Precise'],
    milestones: [
      "You survived the week most people abandon",
      "You built a rhythm when there was no external pressure",
      "You trusted the process before seeing the results",
      "You proved the habit is real, not just intention",
    ],
    accentColor: '#38bdf8',
    accentDim: 'rgba(56,189,248,0.12)',
  },
  scholar: {
    icon: BookOpen,
    tier: 'Tier III',
    tagline: 'When Knowledge Becomes Pattern',
    description:
      "Something shifted around day 21. You started noticing connections — a prefix here, a root there, a word surfacing in conversation that you studied weeks ago. That's not coincidence. That's your brain restructuring itself around language. The Scholar doesn't just memorize. They begin to think differently. You're in that transition right now.",
    quote: "The more I read, the more I acquire — the more certain I am that I know nothing.",
    quoteAuthor: "Voltaire",
    traits: ['Analytical', 'Thorough', 'Pattern-seeking', 'Deep'],
    milestones: [
      "You held on past the point where it felt effortful",
      "You started noticing words in the wild — outside the app",
      "You caught yourself thinking before speaking, choosing better words",
      "Your memory rewired itself while you slept between sessions",
    ],
    accentColor: '#34d399',
    accentDim: 'rgba(52,211,153,0.12)',
  },
  rhetorician: {
    icon: Zap,
    tier: 'Tier IV',
    tagline: 'From Knowing to Commanding',
    description:
      "There's a person in every room who finds the exact right word at the exact right moment. People feel it. They lean in. They trust that person more than they can explain. After 46 days, you're becoming that person. Not because you memorized a list — because you trained your mind to reach for precision instead of settling for 'kind of' or 'basically' or silence.",
    quote: "The right word may be effective, but no word was ever as effective as a rightly timed pause.",
    quoteAuthor: "Mark Twain",
    traits: ['Articulate', 'Commanding', 'Deliberate', 'Magnetic'],
    milestones: [
      "You've gone from recognizing words to deploying them",
      "People in your life have noticed something different about how you speak",
      "You've stopped settling for approximate language",
      "You've felt the power of saying exactly what you mean",
    ],
    accentColor: '#f97316',
    accentDim: 'rgba(249,115,22,0.12)',
  },
  lexicographer: {
    icon: Layers,
    tier: 'Tier V',
    tagline: 'The Architecture of Meaning',
    description:
      "Most people use language like they use electricity — they flip the switch and never think about the grid. You now understand the grid. The structure of meaning, how words are built, where they came from, why some words carry weight and others fall flat. That's not a skill. That's a permanent perspective shift. You can't unsee it. You're in an elite few.",
    quote: "Language is the road map of a culture. It tells you where its people come from and where they are going.",
    quoteAuthor: "Rita Mae Brown",
    traits: ['Expert', 'Structural', 'Encyclopedic', 'Rare'],
    milestones: [
      "You understand why some words carry gravity and others don't",
      "You've crossed into the top 5% of intentional vocabulary builders worldwide",
      "Etymology has become a lens, not a subject",
      "You read differently now — slower, deeper, richer",
    ],
    accentColor: '#fbbf24',
    accentDim: 'rgba(251,191,36,0.12)',
  },
  philologist: {
    icon: Search,
    tier: 'Tier VI',
    tagline: 'You Travel Through Time When You Read',
    description:
      "'Salary' comes from salt — Roman soldiers were paid in it. 'Disaster' literally means 'bad star.' When you know this, language stops being a surface and becomes a museum you walk through. 121 days in, you see what others miss entirely. You've changed how you read, how you listen, how you think. That's not learning. That's transformation.",
    quote: "Language is the archaeology of a civilization's soul.",
    quoteAuthor: "Anonymous",
    traits: ['Historical', 'Cultural', 'Patient', 'Illuminated'],
    milestones: [
      "You see the history embedded in ordinary words",
      "You've gone deeper than any test, career, or deadline required",
      "Your vocabulary rivals most published authors — and you know what that means",
      "You've given yourself access to centuries of human thought",
    ],
    accentColor: '#e879f9',
    accentDim: 'rgba(232,121,249,0.12)',
  },
  etymologist: {
    icon: Brain,
    tier: 'Tier VII',
    tagline: "You Don't Learn Words. You Decode Them.",
    description:
      "Encounter a word you've never seen and most people guess. You reason. You see the morphemes, trace the origin, reconstruct the meaning from first principles — and you're almost always right. That's not memorization. That's linguistic intelligence built over 201 days of deliberate practice. You own language in a way most people never will.",
    quote: "To know another language is to possess a second soul.",
    quoteAuthor: "Charlemagne",
    traits: ['Masterful', 'Logical', 'Rare', 'Unstoppable'],
    milestones: [
      "You can decode unfamiliar words without looking them up",
      "Your vocabulary now reaches into registers most people never enter",
      "You've spent nearly a year becoming someone different",
      "The person who started Day 1 would not recognize you",
    ],
    accentColor: '#00FFC8',
    accentDim: 'rgba(0,255,200,0.12)',
  },
  polymath: {
    icon: InfinityIcon,
    tier: 'Final Form',
    tagline: 'No Ceiling. No Edges. Just You.',
    description:
      "You didn't do this for a test. You didn't do it for a promotion. You did it because somewhere inside you lives a person who refuses to be limited — by the words available, the ideas accessible, the rooms that feel too far out of reach. 366 days is not a streak. It's an identity. You think in language others don't have access to. Welcome to the rarest club on earth.",
    quote: "The limits of my language mean the limits of my world.",
    quoteAuthor: "Ludwig Wittgenstein",
    traits: ['Transcendent', 'Limitless', 'Legendary', 'Free'],
    milestones: [
      "You committed to something and saw it through a full year",
      "You are now in the top 0.1% of intentional language learners on earth",
      "You've given yourself a weapon no one can take: a mind that reaches",
      "This is not the end. For you, there is no end.",
    ],
    accentColor: '#f0c96a',
    accentDim: 'rgba(240,201,106,0.12)',
  },
};

interface Props { currentDay: number; onClose: () => void; }
type Status = 'past' | 'current' | 'locked';

function getStatus(currentDay: number, dayStart: number, dayEnd: number | null): Status {
  if (dayEnd !== null && currentDay > dayEnd) return 'past';
  if (dayStart <= currentDay) return 'current';
  return 'locked';
}

const DASHED_GOLD = 'repeating-linear-gradient(to bottom,rgba(180,140,55,0.5) 0px,rgba(180,140,55,0.5) 5px,transparent 5px,transparent 11px)';
const DASHED_DIM = 'repeating-linear-gradient(to bottom,rgba(255,255,255,0.08) 0px,rgba(255,255,255,0.08) 5px,transparent 5px,transparent 11px)';
const SOLID_MINT = 'rgba(0,255,200,0.3)';

/* ─── Detail panel ───────────────────────────────────────────────── */
function DetailPanel({ identity, status, currentDay }: {
  identity: typeof IDENTITIES[number]; status: Status; currentDay: number;
}) {
  const detail = DETAILS[identity.id];
  const Icon = detail.icon;
  const isLocked = status === 'locked';
  const isCurrent = status === 'current';
  const isPast = status === 'past';

  const progress = isCurrent && identity.dayEnd != null
    ? Math.min((currentDay - identity.dayStart) / (identity.dayEnd - identity.dayStart + 1), 1)
    : isPast ? 1 : 0;

  const dayInTier = isCurrent ? currentDay - identity.dayStart + 1 : null;
  const totalDays = identity.dayEnd ? identity.dayEnd - identity.dayStart + 1 : null;

  const nextTitle = IDENTITIES[IDENTITIES.findIndex(i => i.id === identity.id) + 1]?.title;

  const stats = [
    {
      label: 'Day Range',
      value: identity.dayEnd ? `${identity.dayStart}–${identity.dayEnd}` : `${identity.dayStart}+`,
    },
    {
      label: 'Duration',
      value: identity.dayEnd ? `${identity.dayEnd - identity.dayStart + 1}d` : '∞',
    },
    {
      label: isCurrent ? 'Position' : isPast ? 'Status' : 'Unlocks',
      value: isCurrent && dayInTier && totalDays
        ? `Day ${dayInTier} / ${totalDays}`
        : isPast ? 'Completed'
          : `Day ${identity.dayStart}`,
      accent: true,
    },
  ];

  return (
    <motion.div
      key={identity.id}
      className="relative flex flex-col h-full overflow-hidden"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Dual ambient glow for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 75% 0%, ${detail.accentColor}${isLocked ? '08' : '1e'} 0%, transparent 52%),
            radial-gradient(ellipse at 10% 80%, ${detail.accentColor}${isLocked ? '04' : '0e'} 0%, transparent 42%)
          `,
          transition: 'background 0.7s ease',
        }}
      />

      {/* Hero — tall, cinematic */}
      <div className="relative shrink-0 overflow-hidden" style={{ height: 268 }}>
        <img
          src={identity.image}
          alt={identity.title}
          draggable={false}
          className="w-full h-full object-cover object-top select-none"
          style={{
            opacity: isLocked ? 0.22 : 1,
            filter: isLocked ? 'saturate(0.12) blur(3px)' : 'none',
            transform: 'scale(1.03)',
            transition: 'opacity 0.4s, filter 0.4s',
          }}
        />
        {/* Rich gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(to bottom, rgba(4,3,8,0.04) 0%, rgba(4,3,8,0) 25%, rgba(4,3,8,0.55) 65%, rgba(4,3,8,1) 100%),
              linear-gradient(to right, rgba(4,3,8,0.45) 0%, transparent 45%)
            `,
          }}
        />
        {/* Accent bloom at bottom of hero */}
        {!isLocked && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at 75% 130%, ${detail.accentColor}22 0%, transparent 55%)`,
              transition: 'background 0.5s ease',
            }}
          />
        )}

        {/* Tier badge — top left */}
        <div className="absolute top-4 left-4">
          <span
            className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.25em]"
            style={{
              background: `${detail.accentColor}18`,
              border: `1px solid ${detail.accentColor}55`,
              color: detail.accentColor,
              backdropFilter: 'blur(12px)',
              boxShadow: `0 0 20px ${detail.accentColor}1a`,
              opacity: isLocked ? 0.4 : 1,
            }}
          >
            {detail.tier}
          </span>
        </div>

        {/* Status badge — top right */}
        <div className="absolute top-4 right-4">
          {isCurrent && (
            <motion.div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(240,201,106,0.12)', border: '1px solid rgba(240,201,106,0.4)', backdropFilter: 'blur(10px)' }}
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2.4, repeat: Infinity }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-[#f0c96a]" style={{ boxShadow: '0 0 6px #f0c96a' }} />
              <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: '#f0c96a' }}>Active</span>
            </motion.div>
          )}
          {isPast && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(0,255,200,0.1)', border: '1px solid rgba(0,255,200,0.35)', backdropFilter: 'blur(10px)' }}
            >
              <Check className="w-2.5 h-2.5" style={{ color: '#00FFC8' }} strokeWidth={3} />
              <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: '#00FFC8' }}>Earned</span>
            </div>
          )}
          {isLocked && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}
            >
              <Lock className="w-2.5 h-2.5" style={{ color: 'rgba(255,255,255,0.3)' }} />
              <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.28)' }}>Locked</span>
            </div>
          )}
        </div>

        {/* Identity name — massive, commanding */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-5">
          <p
            className="text-[10px] font-black uppercase tracking-[0.3em] mb-2"
            style={{ color: isLocked ? 'rgba(255,255,255,0.18)' : detail.accentColor }}
          >
            {detail.tagline}
          </p>
          <h3
            className="font-black leading-none tracking-tight"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 'clamp(2.6rem, 5.5vw, 3.6rem)',
              color: isLocked ? 'rgba(255,255,255,0.18)' : isCurrent ? '#f0c96a' : '#ffffff',
              textShadow: isLocked ? 'none' : isCurrent
                ? '0 0 50px rgba(240,201,106,0.35)'
                : `0 0 40px ${detail.accentColor}30`,
            }}
          >
            {identity.title}
          </h3>
        </div>
      </div>

      {/* Identity Manifest divider */}
      <div
        className="shrink-0 px-6 py-3 flex items-center gap-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <span className="text-[9px] font-black uppercase tracking-[0.3em]" style={{ color: 'rgba(255,255,255,0.18)' }}>
          Identity Manifest
        </span>
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.04)' }} />
        <Icon
          className="w-3 h-3"
          style={{ color: isLocked ? 'rgba(255,255,255,0.14)' : detail.accentColor, opacity: isLocked ? 1 : 0.8 }}
        />
      </div>

      {/* Lock overlay — sits above the blurred body */}
      {isLocked && (
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-center gap-3 pointer-events-none" style={{ top: 268 + 48, zIndex: 10 }}>
          <div
            className="flex flex-col items-center gap-2 rounded-2xl px-6 py-5 text-center"
            style={{ background: 'rgba(4,3,8,0.72)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)' }}
          >
            <Lock className="w-6 h-6" style={{ color: 'rgba(255,255,255,0.3)' }} />
            <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {identity.dayStart - currentDay} day{identity.dayStart - currentDay !== 1 ? 's' : ''} until this identity unlocks
            </p>
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.22)' }}>
              Keep your streak alive. Don't break what you're building.
            </p>
          </div>
        </div>
      )}

      {/* Scrollable body */}
      <div
        className="flex-1 overflow-y-auto"
        style={{
          zIndex: 1,
          filter: isLocked ? 'blur(4px)' : 'none',
          userSelect: isLocked ? 'none' : 'auto',
          pointerEvents: isLocked ? 'none' : 'auto',
        }}
      >
        <div className="px-6 pt-5 pb-10 space-y-6">

          {/* Stats — 3 data cells */}
          <div className="grid grid-cols-3 gap-2">
            {stats.map(({ label, value, accent }) => (
              <div
                key={label}
                className="rounded-xl px-3 py-3 text-center"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${accent && isCurrent ? `${detail.accentColor}28` : 'rgba(255,255,255,0.05)'}`,
                }}
              >
                <div
                  className="text-sm font-black tabular-nums"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    letterSpacing: '-0.01em',
                    color: isLocked ? 'rgba(255,255,255,0.22)'
                      : accent && isCurrent ? detail.accentColor
                        : isPast ? '#e4e4e7'
                          : '#e4e4e7',
                  }}
                >
                  {value}
                </div>
                <div className="text-[8px] font-bold uppercase tracking-widest mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  {label}
                </div>
              </div>
            ))}
          </div>

          {/* Progress bar — current only */}
          {isCurrent && identity.dayEnd != null && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.22)' }}>
                  Tier Progress
                </span>
                <span className="text-[10px] font-black tabular-nums" style={{ color: detail.accentColor }}>
                  {Math.round(progress * 100)}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round(progress * 100)}%` }}
                  transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    background: `linear-gradient(90deg, ${detail.accentColor}80, ${detail.accentColor})`,
                    boxShadow: `0 0 14px ${detail.accentColor}66, 0 0 4px ${detail.accentColor}`,
                  }}
                />
              </div>
              {nextTitle && (
                <p className="text-[9px] mt-1.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  {identity.dayEnd - currentDay} day{identity.dayEnd - currentDay !== 1 ? 's' : ''} to {nextTitle}
                </p>
              )}
            </div>
          )}

          {/* Pull-quote with decorative mark */}
          <div
            className="relative rounded-2xl px-5 py-5"
            style={{
              background: `${detail.accentColor}08`,
              border: `1px solid ${detail.accentColor}1e`,
            }}
          >
            <span
              className="absolute pointer-events-none select-none font-serif"
              style={{
                color: detail.accentColor,
                fontSize: '5.5rem',
                lineHeight: 1,
                top: '-0.6rem',
                left: '0.8rem',
                opacity: isLocked ? 0.08 : 0.22,
              }}
            >
              "
            </span>
            <p
              className="text-[13px] italic leading-relaxed pl-5"
              style={{ color: isLocked ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.7)' }}
            >
              {detail.quote}
            </p>
            <p
              className="text-[10px] font-semibold mt-2.5 pl-5"
              style={{ color: detail.accentColor, opacity: isLocked ? 0.25 : 0.72 }}
            >
              — {detail.quoteAuthor}
            </p>
          </div>

          {/* Description */}
          <p className="text-[13px] leading-[1.88]" style={{ color: isLocked ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.55)' }}>
            {detail.description}
          </p>

          {/* Identity Traits */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[9px] font-black uppercase tracking-[0.25em]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                Identity Traits
              </span>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.04)' }} />
            </div>
            <div className="flex flex-wrap gap-2">
              {detail.traits.map(t => (
                <span
                  key={t}
                  className="px-3.5 py-1.5 rounded-full text-[11px] font-bold"
                  style={{
                    background: `${detail.accentColor}10`,
                    color: isLocked ? 'rgba(255,255,255,0.22)' : detail.accentColor,
                    border: `1px solid ${detail.accentColor}${isLocked ? '18' : '30'}`,
                    backdropFilter: 'blur(8px)',
                    boxShadow: isLocked ? 'none' : `inset 0 1px 0 ${detail.accentColor}20, 0 0 14px ${detail.accentColor}18`,
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Milestones */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[9px] font-black uppercase tracking-[0.25em]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                {isLocked ? 'What Awaits You' : "What You've Proven"}
              </span>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.04)' }} />
            </div>
            <div className="space-y-2">
              {detail.milestones.map((m, i) => (
                <motion.div
                  key={m}
                  className="flex items-start gap-3 rounded-xl px-4 py-3"
                  style={{
                    background: isLocked ? 'rgba(255,255,255,0.02)' : `${detail.accentColor}07`,
                    border: `1px solid ${isLocked ? 'rgba(255,255,255,0.04)' : `${detail.accentColor}1c`}`,
                  }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 + 0.15, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div
                    className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center mt-0.5"
                    style={{
                      background: isLocked ? 'rgba(255,255,255,0.04)' : `${detail.accentColor}18`,
                      border: `1px solid ${isLocked ? 'rgba(255,255,255,0.07)' : `${detail.accentColor}48`}`,
                      boxShadow: isLocked ? 'none' : `0 0 10px ${detail.accentColor}35`,
                    }}
                  >
                    {isLocked
                      ? <Lock className="w-2 h-2" style={{ color: 'rgba(255,255,255,0.18)' }} />
                      : <Check className="w-2.5 h-2.5" style={{ color: detail.accentColor }} strokeWidth={3} />
                    }
                  </div>
                  <span
                    className="text-[12px] leading-snug"
                    style={{ color: isLocked ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.65)' }}
                  >
                    {m}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Locked CTA */}
          {isLocked && (
            <div
              className="rounded-2xl px-5 py-5 text-center"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.07)' }}
            >
              <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.38)' }}>
                {identity.dayStart - currentDay} day{identity.dayStart - currentDay !== 1 ? 's' : ''} between you and this identity.
              </p>
              <p className="text-[11px] mt-1.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
                Every session is a step closer. Don't break what you're building.
              </p>
            </div>
          )}

        </div>
      </div>
    </motion.div>
  );
}

/* ─── Main component ─────────────────────────────────────────────── */
export function IdentityJourneyMap({ currentDay, onClose }: Props) {
  const [hoveredId, setHoveredId] = useState<IdentityId | null>(null);
  const [shakingId, setShakingId] = useState<IdentityId | null>(null);
  const currentRef = useRef<HTMLDivElement>(null);

  const currentIdentity = IDENTITIES.find(i => getStatus(currentDay, i.dayStart, i.dayEnd) === 'current');
  const [selectedId, setSelectedId] = useState<IdentityId>(currentIdentity?.id ?? 'apprentice');

  const shownId = hoveredId ?? selectedId;
  const shownEntry = IDENTITIES.find(i => i.id === shownId)!;
  const shownStatus = getStatus(currentDay, shownEntry.dayStart, shownEntry.dayEnd);

  useEffect(() => {
    const t = setTimeout(() =>
      currentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 540);
    return () => clearTimeout(t);
  }, []);

  const shake = (id: IdentityId) => {
    setShakingId(id);
    setTimeout(() => setShakingId(null), 620);
  };

  const currentTitle = IDENTITIES.find(i => getStatus(currentDay, i.dayStart, i.dayEnd) === 'current')?.title ?? 'Polymath';

  return (
    <motion.div
      className="fixed inset-0 z-50"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
      style={{ background: 'rgba(4,3,8,0.97)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' }}
    >
      <div className="flex flex-col h-full" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div>
            <h2 className="text-white font-bold text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Identity Journey
            </h2>
            <p className="text-zinc-500 text-xs mt-0.5">Day {currentDay} · {currentTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
            style={{ border: '1px solid rgba(255,255,255,0.09)' }}
          >
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex justify-center">
          <div className="flex w-full max-w-3xl">

            {/* Left: timeline */}
            <div
              className="w-full lg:w-[340px] shrink-0 overflow-y-auto"
              style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}
            >
              <div className="max-w-sm mx-auto px-4 py-8 relative">
                {/* Spine */}
                <motion.div
                  className="absolute"
                  style={{ left: '2rem', top: '2.5rem', bottom: '2.5rem', width: 1, zIndex: 0, background: DASHED_GOLD, transformOrigin: 'top' }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                />

                <div className="space-y-5 relative" style={{ zIndex: 1 }}>
                  {IDENTITIES.map((identity, index) => {
                    const status = getStatus(currentDay, identity.dayStart, identity.dayEnd);
                    const isPast = status === 'past';
                    const isCurrent = status === 'current';
                    const isLocked = status === 'locked';
                    const isShaking = shakingId === identity.id;
                    const isHovered = hoveredId === identity.id;
                    const isSelected = selectedId === identity.id && !hoveredId;
                    const detail = DETAILS[identity.id];
                    const Icon = detail.icon;

                    const progress = isCurrent && identity.dayEnd != null
                      ? Math.min((currentDay - identity.dayStart) / (identity.dayEnd - identity.dayStart + 1), 1)
                      : 0;

                    const nodeStyle: React.CSSProperties = isPast
                      ? { background: 'rgba(0,255,200,0.15)', border: '1.5px solid #00FFC8', boxShadow: '0 0 8px rgba(0,255,200,0.4)' }
                      : isCurrent
                        ? { background: 'linear-gradient(135deg,#c8922a,#f0c96a)', border: '2px solid rgba(255,210,100,0.5)' }
                        : { background: '#18181b', border: '2px solid #27272a' };

                    const connectorBg = isPast ? SOLID_MINT : isCurrent ? DASHED_GOLD : DASHED_DIM;

                    return (
                      <div key={identity.id} ref={isCurrent ? currentRef : undefined}>
                        <motion.div
                          className="flex gap-3 items-start"
                          initial={{ opacity: 0, y: 32 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.1 + index * 0.07 }}
                        >
                          {/* Timeline column */}
                          <div className="flex flex-col items-center shrink-0" style={{ width: '2rem', paddingTop: '1rem', zIndex: 2 }}>
                            {isCurrent ? (
                              <motion.div
                                className="w-4 h-4 rounded-full shrink-0"
                                style={nodeStyle}
                                animate={{ boxShadow: ['0 0 6px rgba(240,201,106,0.5)', '0 0 22px rgba(240,201,106,0.95)', '0 0 6px rgba(240,201,106,0.5)'] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              />
                            ) : (
                              <div className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center" style={nodeStyle}>
                                {isPast && <Check className="w-2.5 h-2.5" style={{ color: '#00FFC8' }} strokeWidth={3} />}
                                {isLocked && <Lock className="w-2 h-2" style={{ color: '#3f3f46' }} />}
                              </div>
                            )}
                            {index < IDENTITIES.length - 1 && (
                              <div className="flex-1 mt-1" style={{ width: 1, minHeight: '2rem', background: connectorBg }} />
                            )}
                          </div>

                          {/* Card */}
                          <div className="flex-1 pb-0">
                            {/* Pulsing ring wrapper for current — sits outside overflow-hidden */}
                            <div className="relative">
                              {isCurrent && (
                                <motion.div
                                  className="absolute inset-0 rounded-2xl pointer-events-none"
                                  animate={{
                                    boxShadow: [
                                      '0 0 0 1px rgba(180,140,55,0.4), 0 0 20px rgba(180,140,55,0.1)',
                                      '0 0 0 2px rgba(240,201,106,0.72), 0 0 44px rgba(210,165,60,0.22)',
                                      '0 0 0 1px rgba(180,140,55,0.4), 0 0 20px rgba(180,140,55,0.1)',
                                    ],
                                  }}
                                  transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                                  style={{ zIndex: 5 }}
                                />
                              )}

                              <motion.div
                                animate={isShaking ? { x: [0, -10, 10, -7, 7, -3, 3, 0], transition: { duration: 0.5 } } : { x: 0 }}
                                onMouseEnter={() => setHoveredId(identity.id)}
                                onMouseLeave={() => setHoveredId(null)}
                                onClick={() => {
                                  if (isLocked) shake(identity.id);
                                  else setSelectedId(identity.id);
                                }}
                                className="rounded-2xl overflow-hidden relative"
                                style={{
                                  cursor: isLocked ? 'not-allowed' : 'pointer',
                                  transform: isHovered ? 'scale(1.02)' : isCurrent ? 'scale(1.01)' : 'scale(1)',
                                  transition: 'transform 0.2s',
                                  ...(isCurrent ? {
                                    background: 'linear-gradient(160deg,#0d0a07 0%,#110e0a 100%)',
                                  } : isPast ? {
                                    background: 'rgba(255,255,255,0.03)',
                                    boxShadow: (isHovered || isSelected)
                                      ? `0 0 0 1px ${detail.accentColor}44, 0 6px 24px ${detail.accentColor}14`
                                      : '0 0 0 1px rgba(0,255,200,0.12)',
                                  } : {
                                    background: 'rgba(255,255,255,0.02)',
                                    boxShadow: isHovered
                                      ? `0 0 0 1px ${detail.accentColor}2e`
                                      : '0 0 0 1px rgba(255,255,255,0.05)',
                                  }),
                                }}
                              >
                                {/* Shimmer sweep on hover */}
                                <AnimatePresence>
                                  {isHovered && !isLocked && (
                                    <motion.div
                                      key="shimmer"
                                      className="absolute inset-0 pointer-events-none z-10"
                                      initial={{ x: '-100%' }}
                                      animate={{ x: '220%' }}
                                      exit={{ opacity: 0, transition: { duration: 0 } }}
                                      transition={{ duration: 0.5, ease: 'easeOut' }}
                                      style={{
                                        width: '55%',
                                        background: `linear-gradient(105deg, transparent 20%, ${detail.accentColor}22 50%, transparent 80%)`,
                                      }}
                                    />
                                  )}
                                </AnimatePresence>

                                {/* Image */}
                                <div className="relative overflow-hidden" style={{ height: 152, background: '#0a0809' }}>
                                  <img
                                    src={identity.image}
                                    alt={identity.title}
                                    draggable={false}
                                    className="w-full h-full select-none"
                                    style={{
                                      objectFit: 'cover',
                                      objectPosition: 'center top',
                                      opacity: isLocked ? 0.2 : isPast ? 0.62 : 1,
                                      filter: isLocked ? 'blur(3px) saturate(0.08)' : 'none',
                                      transition: 'all 0.3s',
                                    }}
                                  />
                                  <div
                                    className="absolute inset-0"
                                    style={{ background: 'linear-gradient(to bottom, transparent 35%, rgba(4,3,8,0.72) 100%)' }}
                                  />
                                  {isHovered && !isLocked && (
                                    <div
                                      className="absolute inset-0"
                                      style={{ background: `radial-gradient(ellipse at 50% 110%, ${detail.accentColor}22 0%, transparent 60%)` }}
                                    />
                                  )}
                                  {isLocked && (
                                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.42)' }}>
                                      <motion.div
                                        animate={isShaking ? { scale: [1, 1.4, 0.85, 1.2, 1], rotate: [0, -14, 14, -7, 0], transition: { duration: 0.5 } } : {}}
                                      >
                                        <Lock className="w-7 h-7" style={{ color: 'rgba(255,255,255,0.22)' }} />
                                      </motion.div>
                                    </div>
                                  )}
                                  {isPast && (
                                    <div
                                      className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                                      style={{ background: 'rgba(0,255,200,0.1)', border: '1px solid rgba(0,255,200,0.3)', backdropFilter: 'blur(6px)' }}
                                    >
                                      <Check className="w-3 h-3" style={{ color: '#00FFC8' }} strokeWidth={3} />
                                    </div>
                                  )}
                                  {isCurrent && (
                                    <motion.div
                                      className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full"
                                      style={{ background: 'rgba(240,201,106,0.12)', border: '1px solid rgba(240,201,106,0.3)', backdropFilter: 'blur(8px)' }}
                                      animate={{ opacity: [0.6, 1, 0.6] }}
                                      transition={{ duration: 2.6, repeat: Infinity }}
                                    >
                                      <MapPin className="w-2.5 h-2.5 shrink-0" style={{ color: '#f0c96a' }} />
                                      <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color: '#f0c96a' }}>You are here</span>
                                    </motion.div>
                                  )}
                                  {isCurrent && (
                                    <div
                                      className="absolute bottom-0 left-0 right-0 h-[2px]"
                                      style={{ background: `linear-gradient(90deg, transparent, ${detail.accentColor}88, transparent)` }}
                                    />
                                  )}
                                </div>

                                {/* Card body */}
                                <div className="px-3.5 py-3">
                                  <div className="flex items-center justify-between gap-2 mb-0.5">
                                    <div className="flex items-center gap-2">
                                      <Icon
                                        className="w-3 h-3 shrink-0"
                                        style={{ color: isLocked ? '#3f3f46' : detail.accentColor }}
                                      />
                                      <span
                                        className="font-bold text-sm"
                                        style={{
                                          fontFamily: "'Space Grotesk', sans-serif",
                                          color: isLocked ? 'rgba(255,255,255,0.28)'
                                            : isCurrent ? '#f0c96a'
                                              : isHovered ? detail.accentColor
                                                : '#e4e4e7',
                                          transition: 'color 0.2s',
                                        }}
                                      >
                                        {identity.title}
                                      </span>
                                    </div>
                                    <span
                                      className="text-[9px] font-semibold tabular-nums shrink-0"
                                      style={{
                                        color: isLocked ? 'rgba(255,255,255,0.18)'
                                          : isCurrent ? 'rgba(240,201,106,0.55)'
                                            : 'rgba(0,255,200,0.5)',
                                      }}
                                    >
                                      {identity.dayEnd ? `D${identity.dayStart}–${identity.dayEnd}` : `D${identity.dayStart}+`}
                                    </span>
                                  </div>
                                  <p
                                    className="text-[10px]"
                                    style={{ color: isLocked ? 'rgba(255,255,255,0.16)' : `${detail.accentColor}99` }}
                                  >
                                    {isLocked
                                      ? `${identity.dayStart - currentDay}d away`
                                      : detail.tagline}
                                  </p>
                                  {isCurrent && identity.dayEnd != null && (
                                    <div className="mt-2">
                                      <div className="h-[2px] w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                        <motion.div
                                          initial={{ width: 0 }}
                                          animate={{ width: `${Math.round(progress * 100)}%` }}
                                          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
                                          className="h-full rounded-full"
                                          style={{
                                            background: 'linear-gradient(90deg,#c8922a,#f0c96a)',
                                            boxShadow: '0 0 6px rgba(210,155,50,0.5)',
                                          }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                  {isPast && identity.dayEnd != null && (
                                    <p className="text-[9px] mt-0.5" style={{ color: 'rgba(0,255,200,0.38)' }}>
                                      Held {identity.dayEnd - identity.dayStart + 1} days
                                    </p>
                                  )}
                                </div>
                              </motion.div>
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: detail panel */}
            <div
              className="hidden lg:flex flex-1 flex-col overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.01)' }}
            >
              <AnimatePresence mode="wait">
                <DetailPanel key={shownId} identity={shownEntry} status={shownStatus} currentDay={currentDay} />
              </AnimatePresence>
            </div>

          </div>
        </div>
      </div>
    </motion.div>
  );
}
