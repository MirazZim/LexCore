import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RankBadge } from '@/components/RankBadge';
import { useAuth } from '@/contexts/AuthContext';
import { ChronicleVisitor } from '@/components/ChronicleVisitor';
import { Lock, Check, X, ChevronLeft, ChevronRight, ScrollText, Star, Zap, BookOpen, Brain, Feather, Search, Layers, Infinity as InfinityIcon } from 'lucide-react';

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
      "Four thousand years ago in Sumer, children sat in the *edubba*, the 'tablet house', pressing the same wedges into wet clay until their hands remembered. Every scribe who ever recorded a king's law began exactly where you are, {name}: early, unsure, and *showing up anyway*. Most people never walk through that door. You already have. Come back tomorrow, and the clay begins to hold your shape.",
    quote: "Well begun is half done.",
    quoteAuthor: "Aristotle",
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
      "In ancient Egypt, fathers told their sons, '*Be a scribe*, it saves you from toil.' Scribes were the only ones who could carry a word across time. {name}, you have passed the first week, the point where most people quietly stop. What you do now is what they did in the shadow of the pyramids: small, daily marks that outlast the hand that made them. *Keep the reed moving*.",
    quote: "Spoken words fly away; written words remain.",
    quoteAuthor: "Latin proverb",
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
      "At *Alexandria*, scholars did not just store scrolls. They compared them, catalogued them, and found the pattern hiding across a thousand pages. That is what is happening in your mind now, {name}: a root here, a prefix there, a word you studied weeks ago surfacing on its own. *Eratosthenes* measured the whole Earth with a stick and a shadow. Never underestimate patient noticing.",
    quote: "I know that I know nothing.",
    quoteAuthor: "Socrates",
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
      "*Demosthenes* stammered. So he filled his mouth with pebbles and spoke over the roar of the sea until all of Athens leaned in to listen. *Cicero* chose his words so carefully that we still quote him two thousand years later. {name}, you are entering their company. You no longer just know words; you reach for the exact one at the exact moment. People will feel it before they can name it.",
    quote: "Grasp the subject, and the words will follow.",
    quoteAuthor: "Cato the Elder",
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
      "Around 2,400 years ago, *Pāṇini* described the whole of Sanskrit in about four thousand rules, so precise that linguists still study them. In Rome, *Varro* wrote an entire work on where Latin words came from. They saw the architecture beneath speech, {name}, and now so do you. You notice how meaning is built, and you cannot unsee it. That is rare. Guard it.",
    quote: "If names are not correct, language is not in accordance with the truth of things.",
    quoteAuthor: "Confucius",
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
      "When Nineveh fell, the fire that swept *Ashurbanipal's library* baked its clay tablets hard and kept them safe for twenty-six centuries. *Words outlive empires*. 'Salary' still carries the salt of Roman soldiers; 'disaster' still remembers an ill-fated star. {name}, you now read like an archaeologist, brushing the dust from each word to find the civilisation underneath.",
    quote: "No one ever steps in the same river twice.",
    quoteAuthor: "Heraclitus",
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
      "The Greeks called a word's origin its *etymon*, its 'true sense'. In the *Cratylus*, Plato asked whether names belong to things by nature or by agreement, and scholars have argued ever since. You no longer need to argue, {name}. Meet a word you have never seen and you take it apart, root by root, until it gives up its meaning. Nearly a year of daily practice did that.",
    quote: "The beginning of wisdom is the definition of terms.",
    quoteAuthor: "Socrates",
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
      "*Aristotle* wrote on stars, poetry, politics and living things, because to him knowledge was one great continent. In Baghdad's *House of Wisdom*, scholars carried the world's books into Arabic and set them talking to each other. {name}, a full year of showing up has placed you in that lineage. This was never about a test. It was about becoming someone whose world has no edges, least of all in words.",
    quote: "As long as you live, keep learning how to live.",
    quoteAuthor: "Seneca",
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
type Entry = typeof IDENTITIES[number];

function getStatus(currentDay: number, dayStart: number, dayEnd: number | null): Status {
  if (dayEnd !== null && currentDay > dayEnd) return 'past';
  if (dayStart <= currentDay) return 'current';
  return 'locked';
}

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

/* Vintage palette: leather, parchment, gold leaf and oxblood ink */
const INK = {
  parchment: '#ead9b5',
  faded: '#a89676',
  dim: '#6d604c',
  gold: '#c9a45c',
  goldHi: '#f3dfa2',
  oxblood: '#9b2a2f',
};
const cinzel = { fontFamily: "'Cinzel', serif" };
const bookSerif = { fontFamily: "'Lora', Georgia, serif" };
const GOLD_LEAF = 'linear-gradient(180deg, #fff1c2 0%, #e2bd6a 45%, #a87b2c 100%)';
const GRAIN = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.92 0 0 0 0 0.82 0 0 0 0 0.62 0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;

/** How far through a tier you are, 0–1. */
function tierProgress(e: Entry, currentDay: number, status: Status) {
  if (status === 'past') return 1;
  if (status === 'locked' || e.dayEnd == null) return status === 'current' ? 1 : 0;
  return Math.min((currentDay - e.dayStart + 1) / (e.dayEnd - e.dayStart + 1), 1);
}

const Fleuron = ({ className = '' }: { className?: string }) => (
  <div className={`flex items-center gap-3 ${className}`} aria-hidden>
    <span className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, ${INK.gold}88)` }} />
    <span className="text-sm leading-none" style={{ color: INK.gold }}>❦</span>
    <span className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${INK.gold}88, transparent)` }} />
  </div>
);

/** A red wax seal; shown wherever a title is still locked. */
function WaxSeal({ size = 84 }: { size?: number }) {
  const pts = Array.from({ length: 72 }, (_, i) => {
    const a = (i / 72) * Math.PI * 2;
    const r = 44 + 3 * Math.sin(i * 1.7) + 2 * Math.cos(i * 3.1);
    return `${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden style={{ filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.6))' }}>
      <defs>
        <radialGradient id="wax" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#c8424a" />
          <stop offset="60%" stopColor="#8e1d24" />
          <stop offset="100%" stopColor="#4d0b10" />
        </radialGradient>
      </defs>
      <polygon points={pts} fill="url(#wax)" />
      <circle cx="50" cy="50" r="30" fill="none" stroke="#5a0f14" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="26" fill="none" stroke="#c8424a" strokeOpacity="0.35" strokeWidth="1" />
      <rect x="40" y="48" width="20" height="15" rx="2" fill="#5a0f14" />
      <path d="M44 48 V43 A6 6 0 0 1 56 43 V48" fill="none" stroke="#5a0f14" strokeWidth="3.2" />
      <circle cx="50" cy="55" r="2" fill="#c8424a" opacity="0.6" />
    </svg>
  );
}

/* ─── Card back: a sealed title ─────────────────────────────────── */
function SealedBack({ entry, currentDay }: { entry: Entry; currentDay: number }) {
  const days = entry.dayStart - currentDay;
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center"
      style={{
        background: `repeating-linear-gradient(45deg, ${INK.gold}10 0 1px, transparent 1px 18px), repeating-linear-gradient(-45deg, ${INK.gold}10 0 1px, transparent 1px 18px), radial-gradient(circle at 50% 45%, #2a1c10 0%, #140d07 75%)`,
      }}>
      <WaxSeal size={96} />
      <p className="mt-5 text-sm font-semibold uppercase tracking-[0.35em]" style={{ ...cinzel, color: INK.gold }}>Sealed</p>
      <p className="mt-1 text-lg italic" style={{ ...bookSerif, color: INK.faded }}>
        until day {entry.dayStart} · {days} day{days === 1 ? '' : 's'} hence
      </p>
    </div>
  );
}

/* ─── The big card ──────────────────────────────────────────────── */
/* The card grows grander with rank: bronze → silver → gold → platinum →
   ruby → diamond, with patterned borders, jewelled corners, a travelling sheen,
   holographic foil, and finally radiant rays. */
type Metal = 'bronze' | 'silver' | 'gold' | 'platinum' | 'ruby' | 'diamond';
type GemKind = 'ruby' | 'diamond';
const METAL: Record<Metal, { name: string; frame: string; accent: string; text: string; glow: string; gem: GemKind }> = {
  bronze: {
    name: 'Bronze',
    frame: 'linear-gradient(145deg, #f2c08a, #b4733d 32%, #5c3216 58%, #d8975a 82%, #7a4520)',
    accent: '#c88a52',
    text: 'linear-gradient(180deg, #ffd9ad 0%, #c98a4e 50%, #7a4520 100%)',
    glow: '200,138,82', gem: 'ruby',
  },
  silver: {
    name: 'Silver',
    frame: 'linear-gradient(145deg, #ffffff, #b5b9bf 30%, #555a62 55%, #e3e6ea 80%, #7d828a)',
    accent: '#cfd4da',
    text: 'linear-gradient(180deg, #ffffff 0%, #c9ced6 50%, #7d838c 100%)',
    glow: '220,228,240', gem: 'ruby',
  },
  gold: {
    name: 'Gold',
    frame: 'linear-gradient(145deg, #fff1c2, #d6a640 30%, #73500f 55%, #f0cf7a 80%, #8a6420)',
    accent: '#e2bd6a',
    text: GOLD_LEAF,
    glow: '226,189,106', gem: 'ruby',
  },
  platinum: {
    name: 'Platinum',
    frame: 'linear-gradient(145deg, #ffffff, #dbe2ea 24%, #8794a3 48%, #f5f8fb 72%, #a2aebb 88%, #6c7886)',
    accent: '#dfe6ee',
    text: 'linear-gradient(180deg, #ffffff 0%, #d8dfe8 45%, #8592a1 100%)',
    glow: '225,235,248', gem: 'diamond',
  },
  ruby: {
    name: 'Ruby',
    frame: 'linear-gradient(145deg, #ffc9d0, #e02a44 26%, #6a0816 50%, #ff6478 72%, #a4122a 86%, #f0c96a)',
    accent: '#f3a6b0',
    text: 'linear-gradient(180deg, #ffe1e5 0%, #f0566c 50%, #8e0c22 100%)',
    glow: '255,70,100', gem: 'ruby',
  },
  diamond: {
    name: 'Diamond',
    frame: 'linear-gradient(145deg, #ffffff, #d8f4ff 16%, #9fdcff 30%, #f4e9ff 44%, #bff3ff 58%, #ffffff 70%, #ffe9f6 82%, #a9c9ff)',
    accent: '#d6f2ff',
    text: 'linear-gradient(180deg, #ffffff 0%, #c4ecff 45%, #8fb2ff 100%)',
    glow: '170,225,255', gem: 'diamond',
  },
};

type Band = 'dots' | 'beads' | 'meander' | 'laurel' | null;
interface TierLook { metal: Metal; frameW: number; band: Band; corners: 0 | 1 | 2; gems: boolean; plateGem: boolean; nameplate: boolean; sheen: boolean; foil: boolean; radiant: boolean }
const TIER_LOOK: TierLook[] = [
  { metal: 'bronze', frameW: 3, band: null, corners: 0, gems: false, plateGem: false, nameplate: false, sheen: false, foil: false, radiant: false },
  { metal: 'bronze', frameW: 3, band: null, corners: 1, gems: false, plateGem: false, nameplate: false, sheen: false, foil: false, radiant: false },
  { metal: 'silver', frameW: 4, band: 'dots', corners: 1, gems: false, plateGem: false, nameplate: false, sheen: false, foil: false, radiant: false },
  { metal: 'gold', frameW: 4, band: 'beads', corners: 1, gems: false, plateGem: true, nameplate: false, sheen: true, foil: false, radiant: false },
  { metal: 'platinum', frameW: 5, band: 'meander', corners: 2, gems: false, plateGem: true, nameplate: true, sheen: true, foil: false, radiant: false },
  { metal: 'ruby', frameW: 5, band: 'meander', corners: 2, gems: true, plateGem: true, nameplate: true, sheen: true, foil: false, radiant: false },
  { metal: 'diamond', frameW: 6, band: 'laurel', corners: 2, gems: true, plateGem: true, nameplate: true, sheen: true, foil: true, radiant: false },
  { metal: 'diamond', frameW: 6, band: 'laurel', corners: 2, gems: true, plateGem: true, nameplate: true, sheen: true, foil: true, radiant: true },
];

const svgUri = (svg: string) => `url("data:image/svg+xml;utf8,${svg.replace(/#/g, '%23').replace(/"/g, "'")}")`;

/** The patterned border band that sits inside the frame. */
function bandStyle(band: Band, accent: string): React.CSSProperties {
  switch (band) {
    case 'dots':
      return { backgroundImage: `radial-gradient(circle, ${accent} 1px, transparent 1.6px)`, backgroundSize: '8px 8px' };
    case 'beads':
      return { backgroundImage: `radial-gradient(circle at 40% 40%, #fff 0, ${accent} 1.4px, rgba(0,0,0,0.6) 2.6px, transparent 3px)`, backgroundSize: '8px 8px' };
    case 'meander':
      return {
        backgroundImage: svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 20 20"><path d="M0 18 H18 V2 H4 V14 H14 V6 H8 V10" fill="none" stroke="${accent}" stroke-width="1.8"/></svg>`),
        backgroundSize: '14px 14px',
      };
    case 'laurel':
      return {
        backgroundImage: svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="18" height="10" viewBox="0 0 24 12"><path d="M0 6 H24" stroke="${accent}" stroke-width="0.8"/><path d="M3 6 Q7 0 11 5 Q7 7 3 6 Z M13 6 Q17 12 21 7 Q17 5 13 6 Z" fill="${accent}"/></svg>`),
        backgroundSize: '18px 10px',
      };
    default:
      return {};
  }
}

const Gem = ({ size = 8, kind }: { size?: number; kind: GemKind }) => (
  <span className="inline-block rotate-45" aria-hidden
    style={{
      width: size, height: size,
      borderRadius: kind === 'diamond' ? 1 : '50%',
      background: kind === 'diamond'
        ? 'conic-gradient(from 45deg, #ffffff, #bfeaff, #ffffff, #e6d4ff, #ffffff, #c4f5ff, #ffffff)'
        : 'radial-gradient(circle at 35% 30%, #ffd0d0 0%, #d42a36 40%, #5e0a10 100%)',
      boxShadow: kind === 'diamond'
        ? '0 0 8px rgba(200,240,255,0.9), inset 0 0 0 1px rgba(120,170,220,0.6)'
        : '0 0 6px rgba(255,60,70,0.6), inset 0 0 0 1px rgba(0,0,0,0.35)',
    }} />
);

/** Corner filigree: simple at first, ornate scrollwork (with a gem) at higher ranks. */
const Corner = ({ className, color, ornate = false, gem = false, gemKind = 'ruby' }: { className: string; color: string; ornate?: boolean; gem?: boolean; gemKind?: GemKind }) =>
  ornate ? (
    <svg viewBox="0 0 36 36" className={`absolute h-9 w-9 ${className}`} fill="none" stroke={color} strokeWidth={1.3} strokeLinecap="round" aria-hidden>
      <path d="M2 32 V2 H32" strokeWidth={1.6} />
      <path d="M2 24 C11 24 15 20 15 11 C15 7 18 5 22 7 C25 9 24 13 20 13" />
      <path d="M24 2 C24 11 20 15 11 15 C7 15 5 18 7 22 C9 25 13 24 13 20" />
      <path d="M6 30 q4 -1 5 -5 M30 6 q-1 4 -5 5" />
      {gem
        ? <circle cx="7" cy="7" r="3.4" fill={`url(#jr-${gemKind})`} stroke={gemKind === 'diamond' ? '#9fc8e8' : 'none'} strokeWidth={0.6} />
        : <circle cx="7" cy="7" r="1.8" fill={color} stroke="none" />}
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className={`absolute h-6 w-6 ${className}`} fill="none" stroke={color} strokeWidth={1.2} aria-hidden>
      <path d="M2 16 V2 H16" />
      <path d="M6 12 V6 H12" />
      <circle cx="6" cy="6" r="1.4" fill={color} />
      <path d="M2 20 C6 20 8 18 8 14 M20 2 C20 6 18 8 14 8" />
    </svg>
  );

/** Rays and twinkles behind the highest card. */
function Radiance() {
  const sparkles = [[-6, 12], [104, 20], [-10, 62], [108, 70], [8, 102], [92, 100], [50, -8], [30, 106]];
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <div className="jr-rays absolute left-1/2 top-1/2 aspect-square w-[190%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: 'repeating-conic-gradient(from 0deg, rgba(255,214,130,0.16) 0deg 3deg, transparent 3deg 15deg)',
          maskImage: 'radial-gradient(circle, #000 25%, transparent 68%)',
          WebkitMaskImage: 'radial-gradient(circle, #000 25%, transparent 68%)',
        }} />
      {sparkles.map(([x, y], i) => (
        <svg key={i} viewBox="0 0 20 20" className="jr-twinkle absolute h-4 w-4" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.45}s` }}>
          <path d="M10 0 L12 8 L20 10 L12 12 L10 20 L8 12 L0 10 L8 8 Z" fill="#fff1c2" />
        </svg>
      ))}
    </div>
  );
}

function TitleCard({ entry, status, currentDay, index, direction }: { entry: Entry; status: Status; currentDay: number; index: number; direction: number }) {
  const locked = status === 'locked';
  const current = status === 'current';
  const look = TIER_LOOK[index];
  const metal = METAL[look.metal];
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    setTilt({ x: ((e.clientY - r.top) / r.height - 0.5) * -8, y: ((e.clientX - r.left) / r.width - 0.5) * 10 });
  };

  // A locked card still shows its metal, dulled, as a promise of what's coming
  const frame = locked ? `linear-gradient(rgba(18,11,5,0.6), rgba(18,11,5,0.6)), ${metal.frame}` : metal.frame;
  const precious = look.metal !== 'bronze' && look.metal !== 'silver';
  const glow = locked ? 'transparent' : `rgba(${metal.glow},${(current ? 0.3 : 0.18) + (precious ? 0.1 : 0)})`;
  const ring = look.band ? 18 : 7; // where the inner rule sits, past the band
  const decoOpacity = locked ? 0.45 : 1;

  return (
    <div className="relative h-full [perspective:1600px]">
      {look.radiant && !locked && <Radiance />}
      <motion.div
        key={entry.id}
        initial={{ rotateY: direction * -60, opacity: 0, scale: 0.94 }}
        animate={{ rotateY: 0, opacity: 1, scale: 1 }}
        exit={{ rotateY: direction * 60, opacity: 0, scale: 0.94 }}
        transition={{ duration: 0.45, ease: EASE }}
        onPointerMove={onMove}
        onPointerLeave={() => setTilt({ x: 0, y: 0 })}
        className={`relative aspect-[3/4] w-[min(68vw,280px)] lg:w-auto lg:h-full lg:max-h-[560px] rounded-[14px] [transform-style:preserve-3d] ${look.metal === 'diamond' && !locked ? 'jr-prism' : ''}`}
        style={{
          padding: look.frameW,
          background: frame,
          ...(look.metal === 'diamond' && !locked ? { backgroundSize: '220% 220%' } : {}),
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: 'transform 0.15s ease-out',
          boxShadow: `0 40px 90px rgba(0,0,0,0.75), 0 0 ${precious ? 90 : 60}px ${glow}, inset 0 1px 0 rgba(255,255,255,0.4)`,
        }}
      >
        <svg width="0" height="0" className="absolute" aria-hidden>
          <defs>
            <radialGradient id="jr-ruby" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#ffd0d0" />
              <stop offset="40%" stopColor="#d42a36" />
              <stop offset="100%" stopColor="#5e0a10" />
            </radialGradient>
            <radialGradient id="jr-diamond" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="45%" stopColor="#d4f1ff" />
              <stop offset="100%" stopColor="#8fb8e0" />
            </radialGradient>
          </defs>
        </svg>

        {/* Crest: the title's medal, standing proud of the card */}
        <div className="absolute left-1/2 top-0 z-10" style={{ transform: 'translate(-50%, -55%) translateZ(40px)' }}>
          <RankBadge tier={index} locked={locked} size={index === 7 ? 104 : 92} title={`${entry.title} medal`} />
        </div>

        <div className="relative h-full w-full overflow-hidden rounded-[11px]" style={{ background: '#1a120b' }}>
          {/* Patterned border band between the frame and the inner rule */}
          {look.band && (
            <>
              <div className="pointer-events-none absolute inset-[6px] rounded-[8px]" style={{ ...bandStyle(look.band, metal.accent), opacity: 0.75 * decoOpacity, border: `1px solid ${metal.accent}66` }} />
              <div className="pointer-events-none absolute rounded-[6px]" style={{ inset: ring, background: '#1a120b', boxShadow: `0 0 0 1px ${metal.accent}77` }} />
            </>
          )}
          <div className="pointer-events-none absolute inset-0 opacity-[0.18] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />

          {locked ? <SealedBack entry={entry} currentDay={currentDay} /> : (
            <div className="absolute flex flex-col" style={{ inset: ring, padding: '5% 5% 4%', paddingTop: look.band ? '10%' : '12%' }}>
              {/* The plate: art set inside a thin metal rule */}
              <div className="relative w-full aspect-square overflow-hidden" style={{ boxShadow: `0 0 0 1px ${metal.accent}cc, 0 0 0 4px #1a120b, 0 0 0 5px ${metal.accent}55` }}>
                <img src={entry.image} alt={entry.title} draggable={false} className="h-full w-full object-cover select-none"
                  style={{ filter: precious ? 'sepia(0.2) saturate(1) contrast(1.06)' : 'sepia(0.35) saturate(0.85) contrast(1.05) brightness(0.95)' }} />
                <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(26,18,11,0.65) 100%)' }} />
                <div className="pointer-events-none absolute inset-0 mix-blend-soft-light"
                  style={{ background: `radial-gradient(circle at ${50 + tilt.y * 5}% ${50 - tilt.x * 5}%, rgba(255,240,200,0.5) 0%, transparent 50%)` }} />
                {/* Holographic foil on the art for the top ranks */}
                {look.foil && (
                  <div className="pointer-events-none absolute inset-0 mix-blend-color-dodge opacity-30"
                    style={{
                      background: 'linear-gradient(115deg, transparent 20%, #ff6ec7 32%, #ffd36b 40%, #6effc3 48%, #6ec3ff 56%, #c66eff 64%, transparent 76%)',
                      backgroundSize: '250% 250%',
                      backgroundPosition: `${50 + tilt.y * 8}% ${50 - tilt.x * 8}%`,
                    }} />
                )}
              </div>

              <div className="flex flex-1 flex-col items-center justify-center text-center">
                {look.nameplate ? (
                  // An engraved metal nameplate
                  <div className="relative px-[12%] py-[0.35em]"
                    style={{ background: metal.frame, clipPath: 'polygon(6% 0, 94% 0, 100% 50%, 94% 100%, 6% 100%, 0 50%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)' }}>
                    <p className="text-[clamp(1.05rem,3vh,1.5rem)] font-bold tracking-[0.08em]"
                      style={{ ...cinzel, color: '#2a1806', textShadow: '0 1px 0 rgba(255,240,200,0.55)' }}>
                      {entry.title}
                    </p>
                  </div>
                ) : (
                  <p className="text-[clamp(1.2rem,3.4vh,1.7rem)] font-semibold tracking-[0.06em]"
                    style={{ ...cinzel, background: metal.text, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {entry.title}
                  </p>
                )}
                <div className="mt-1.5 flex w-2/3 items-center gap-2" aria-hidden>
                  <span className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, ${metal.accent}99)` }} />
                  {look.plateGem ? <Gem size={9} kind={metal.gem} /> : <span className="text-sm leading-none" style={{ color: metal.accent }}>❦</span>}
                  <span className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${metal.accent}99, transparent)` }} />
                </div>
                <p className="mt-1 text-[14px] italic" style={{ ...bookSerif, color: INK.faded }}>
                  {entry.dayEnd ? `Days ${entry.dayStart} – ${entry.dayEnd}` : `From day ${entry.dayStart}, onward`}
                </p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.35em]"
                  style={{ ...cinzel, background: metal.text, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {look.radiant ? 'Radiant Diamond' : metal.name}
                </p>
              </div>
            </div>
          )}

          {/* Inner rule and corner work */}
          {!look.band && <div className="pointer-events-none absolute inset-[7px] rounded-[7px]" style={{ border: `1px solid ${metal.accent}55`, opacity: decoOpacity }} />}
          {look.corners > 0 && (
            <div className="pointer-events-none absolute inset-0" style={{ opacity: decoOpacity }}>
              <Corner className="left-1.5 top-1.5" color={metal.accent} ornate={look.corners === 2} gem={look.gems} gemKind={metal.gem} />
              <Corner className="right-1.5 top-1.5 rotate-90" color={metal.accent} ornate={look.corners === 2} gem={look.gems} gemKind={metal.gem} />
              <Corner className="bottom-1.5 right-1.5 rotate-180" color={metal.accent} ornate={look.corners === 2} gem={look.gems} gemKind={metal.gem} />
              <Corner className="bottom-1.5 left-1.5 -rotate-90" color={metal.accent} ornate={look.corners === 2} gem={look.gems} gemKind={metal.gem} />
            </div>
          )}

          {/* A slow band of light travelling across gilded cards */}
          {look.sheen && !locked && <div className="jr-sheen pointer-events-none absolute inset-0 mix-blend-overlay" />}
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Story beside the card: written on a scorched sheet of parchment ─ */
/* Ink on parchment */
const SCROLL_INK = { ink: '#2b1a0b', soft: '#4a3119', faint: '#7a5a36', bronze: '#7d4f17', red: '#8a1c22' };

/**
 * A sheet of parchment drawn with SVG filters at its real pixel size, so the
 * noise isn't stretched: displaced edges for the burnt outline, a blurred
 * char rim beneath, then fibres, grain, stains and a darkened border.
 */
function Parchment({ className = '', children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const uid = useId().replace(/:/g, '');
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { w, h } = box;
  const p = 12;
  const id = (k: string) => `pm-${k}-${uid}`;
  const sheet = { x: p, y: p, width: Math.max(0, w - p * 2), height: Math.max(0, h - p * 2) };
  // Every edge layer shares one outline: a large tear, then fine jagged detail on top.
  // blur = 0 keeps the layer crisp.
  const edge = (k: string, blur: number) => (
    <filter id={id(k)} x="-8%" y="-8%" width="116%" height="116%">
      <feTurbulence type="fractalNoise" baseFrequency="0.028" numOctaves={4} seed={4} result="t" />
      <feDisplacementMap in="SourceGraphic" in2="t" scale={26} xChannelSelector="R" yChannelSelector="G" result="d1" />
      <feTurbulence type="fractalNoise" baseFrequency="0.16" numOctaves={2} seed={9} result="t2" />
      <feDisplacementMap in="d1" in2="t2" scale={6} xChannelSelector="R" yChannelSelector="G" result="d" />
      {blur > 0 && <feGaussianBlur in="d" stdDeviation={blur} />}
    </filter>
  );
  // Foxing: fixed pseudo-random specks so they never shuffle between renders
  const specks = useMemo(() => {
    let s = 17;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    return Array.from({ length: 34 }, () => ({ x: rnd(), y: rnd(), r: 0.6 + rnd() * 2.2, o: 0.12 + rnd() * 0.25 }));
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      {w > 0 && (
        <svg width={w} height={h} className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden>
          <defs>
            {edge('rough', 0)}
            {edge('singe', 1.6)}
            {edge('burn', 12)}
            {/* Crumpled relief: a noise height map lit from the top-left */}
            <filter id={id('relief')} x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.014" numOctaves={5} seed={6} result="n" />
              <feDiffuseLighting in="n" surfaceScale={4.5} diffuseConstant={1.05} lightingColor="#fff6e0">
                <feDistantLight azimuth={235} elevation={48} />
              </feDiffuseLighting>
            </filter>
            {/* Large, uneven age mottling */}
            <filter id={id('mottle')} x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.0055" numOctaves={3} seed={21} />
              <feColorMatrix values="0 0 0 0 0.48  0 0 0 0 0.3  0 0 0 0 0.11  0 0 0 1.5 -0.62" />
            </filter>
            <filter id={id('grain')} x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves={3} seed={11} />
              <feColorMatrix values="0 0 0 0 0.3  0 0 0 0 0.18  0 0 0 0 0.07  0 0 0 0.3 0" />
            </filter>
            <filter id={id('fibre')} x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.005 0.11" numOctaves={3} seed={2} />
              <feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.3  0 0 0 0 0.12  0 0 0 0.2 0" />
            </filter>
            <filter id={id('blot')} x="-50%" y="-50%" width="200%" height="200%">
              <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves={2} seed={8} result="t" />
              <feDisplacementMap in="SourceGraphic" in2="t" scale={30} />
              <feGaussianBlur stdDeviation={6} />
            </filter>
            <filter id={id('soft')} x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation={0.8} />
            </filter>
            <radialGradient id={id('paper')} cx="46%" cy="42%" r="75%">
              <stop offset="0%" stopColor="#f4e6c6" />
              <stop offset="40%" stopColor="#e8d2a2" />
              <stop offset="75%" stopColor="#d5b47a" />
              <stop offset="100%" stopColor="#b48649" />
            </radialGradient>
            <mask id={id('mask')}>
              <rect {...sheet} fill="#fff" filter={`url(#${id('rough')})`} />
            </mask>
          </defs>

          {/* Shadow on the table, then the char that shows past the burnt edge */}
          <rect x={sheet.x + 8} y={sheet.y + 22} width={sheet.width} height={sheet.height} fill="#000" opacity={0.42} filter={`url(#${id('burn')})`} />
          <rect x={sheet.x - 2.5} y={sheet.y - 2.5} width={sheet.width + 5} height={sheet.height + 5} fill="#1a0802" filter={`url(#${id('rough')})`} />

          <g mask={`url(#${id('mask')})`}>
            <rect width={w} height={h} fill={`url(#${id('paper')})`} />
            <rect width={w} height={h} filter={`url(#${id('mottle')})`} />
            <rect width={w} height={h} filter={`url(#${id('relief')})`} opacity={0.55} style={{ mixBlendMode: 'soft-light' }} />
            <rect width={w} height={h} filter={`url(#${id('relief')})`} opacity={0.18} style={{ mixBlendMode: 'multiply' }} />
            <rect width={w} height={h} filter={`url(#${id('fibre')})`} />
            <rect width={w} height={h} filter={`url(#${id('grain')})`} />

            {/* Old fold lines: a dark crease with a lit ridge beside it */}
            <g opacity={0.5}>
              <path d={`M${p} ${h * 0.36} Q${w * 0.5} ${h * 0.37} ${w - p} ${h * 0.355}`} stroke="#6b4518" strokeWidth={1.2} fill="none" filter={`url(#${id('soft')})`} />
              <path d={`M${p} ${h * 0.36 + 2} Q${w * 0.5} ${h * 0.37 + 2} ${w - p} ${h * 0.355 + 2}`} stroke="#fff4dc" strokeWidth={1.4} fill="none" opacity={0.7} filter={`url(#${id('soft')})`} />
              <path d={`M${w * 0.52} ${p} Q${w * 0.515} ${h * 0.5} ${w * 0.525} ${h - p}`} stroke="#6b4518" strokeWidth={1} fill="none" opacity={0.7} filter={`url(#${id('soft')})`} />
              <path d={`M${w * 0.52 + 2} ${p} Q${w * 0.515 + 2} ${h * 0.5} ${w * 0.525 + 2} ${h - p}`} stroke="#fff4dc" strokeWidth={1.2} fill="none" opacity={0.6} filter={`url(#${id('soft')})`} />
            </g>

            {/* Water stains and foxing */}
            <ellipse cx={w * 0.8} cy={h * 0.74} rx={w * 0.17} ry={h * 0.12} fill="#8a5a24" opacity={0.17} filter={`url(#${id('blot')})`} />
            <ellipse cx={w * 0.8} cy={h * 0.74} rx={w * 0.17} ry={h * 0.12} fill="none" stroke="#7a4a1a" strokeWidth={2} opacity={0.18} filter={`url(#${id('blot')})`} />
            <ellipse cx={w * 0.18} cy={h * 0.28} rx={w * 0.09} ry={h * 0.07} fill="#8a5a24" opacity={0.13} filter={`url(#${id('blot')})`} />
            {/* A coffee-cup ring, long dried */}
            <circle cx={w * 0.86} cy={h * 0.2} r={Math.min(w, h) * 0.075} fill="none" stroke="#6e3f12" strokeWidth={3.5} opacity={0.22} filter={`url(#${id('blot')})`} />
            <circle cx={w * 0.86} cy={h * 0.2} r={Math.min(w, h) * 0.075} fill="#8a5a24" opacity={0.06} />
            {specks.map((s, i) => (
              <circle key={i} cx={p + s.x * sheet.width} cy={p + s.y * sheet.height} r={s.r} fill="#5a3410" opacity={s.o} filter={`url(#${id('soft')})`} />
            ))}

            {/* Graduated burn: tan scorch, brown singe, then black char at the very edge */}
            <rect {...sheet} fill="none" stroke="#a06a2c" strokeWidth={60} opacity={0.3} filter={`url(#${id('burn')})`} />
            <rect {...sheet} fill="none" stroke="#6a3410" strokeWidth={20} opacity={0.7} filter={`url(#${id('singe')})`} />
            <rect {...sheet} fill="none" stroke="#3a1606" strokeWidth={9} opacity={0.85} filter={`url(#${id('rough')})`} />
            <rect {...sheet} fill="none" stroke="#120501" strokeWidth={4} filter={`url(#${id('rough')})`} />
          </g>
        </svg>
      )}
      <div className="relative">{children}</div>
    </div>
  );
}

/** A glass inkwell with a brass collar and a quill standing in it. */
function QuillAndInk({ className = '' }: { className?: string }) {
  const barbs = Array.from({ length: 26 }, (_, i) => i / 25);
  // Points along the shaft, from the inkwell up to the tip
  const shaft = (t: number) => {
    const x = 68 + 88 * t + 6 * Math.sin(t * Math.PI);
    const y = 120 - 112 * t + 10 * Math.sin(t * Math.PI);
    return [x, y] as const;
  };
  return (
    <svg viewBox="0 0 170 200" className={className} aria-hidden style={{ filter: 'drop-shadow(6px 12px 10px rgba(0,0,0,0.55))' }}>
      <defs>
        <linearGradient id="qi-vane" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#8a6a42" />
          <stop offset="35%" stopColor="#d9c39a" />
          <stop offset="75%" stopColor="#f3e7cc" />
          <stop offset="100%" stopColor="#b8976a" />
        </linearGradient>
        <linearGradient id="qi-glass" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0d0805" />
          <stop offset="30%" stopColor="#3a2416" />
          <stop offset="55%" stopColor="#1a0f08" />
          <stop offset="100%" stopColor="#050302" />
        </linearGradient>
        <linearGradient id="qi-brass" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6e4a14" />
          <stop offset="40%" stopColor="#f0d07a" />
          <stop offset="70%" stopColor="#a8792a" />
          <stop offset="100%" stopColor="#5a3a0c" />
        </linearGradient>
      </defs>

      {/* Feather: two vanes with fine barbs */}
      <path d="M72 112 C86 84 104 56 156 8 C140 44 122 74 98 106 C90 112 80 116 72 112 Z" fill="url(#qi-vane)" stroke="#6b4c28" strokeWidth={0.8} />
      <path d="M74 116 C98 104 124 78 156 8 C150 52 128 88 92 118 C86 122 78 121 74 116 Z" fill="url(#qi-vane)" stroke="#6b4c28" strokeWidth={0.8} opacity={0.92} />
      <g stroke="#6b4c28" strokeWidth={0.55} opacity={0.55}>
        {barbs.map(t => {
          const [x, y] = shaft(t * 0.92 + 0.04);
          return <path key={t} d={`M${x} ${y} l${-14 + t * 8} ${-6 + t * 2} M${x} ${y} l${10 - t * 4} ${10 - t * 6}`} />;
        })}
      </g>
      <path d={`M${shaft(0)[0]} ${shaft(0)[1]} ${barbs.map(t => { const [x, y] = shaft(t); return `L${x.toFixed(1)} ${y.toFixed(1)}`; }).join(' ')}`} fill="none" stroke="#f6eedb" strokeWidth={1.6} strokeLinecap="round" />

      {/* Inkwell */}
      <ellipse cx="70" cy="190" rx="40" ry="6" fill="#000" opacity={0.4} />
      <path d="M36 152 C36 134 50 126 70 126 C90 126 104 134 104 152 V174 C104 184 92 190 70 190 C48 190 36 184 36 174 Z" fill="url(#qi-glass)" stroke="#000" strokeWidth={1} />
      <path d="M44 146 C46 136 54 132 60 131 C54 138 50 150 50 168 C46 166 43 156 44 146 Z" fill="#fff" opacity={0.18} />
      <path d="M92 140 C96 146 97 160 95 172" fill="none" stroke="#fff" strokeOpacity={0.12} strokeWidth={2} strokeLinecap="round" />
      <rect x="54" y="112" width="32" height="16" rx="3" fill="url(#qi-brass)" stroke="#3d2606" strokeWidth={0.8} />
      <ellipse cx="70" cy="112" rx="17" ry="4.5" fill="url(#qi-brass)" stroke="#3d2606" strokeWidth={0.8} />
      <ellipse cx="70" cy="112" rx="11" ry="2.6" fill="#0a0603" />
      <path d="M54 120 H86" stroke="#3d2606" strokeWidth={0.8} opacity={0.6} />
    </svg>
  );
}

/** A stack of worn leather books. */
function BookStack({ className = '' }: { className?: string }) {
  const books = [
    { w: 150, h: 24, x: 20, color: '#4a2a1a', band: '#c9a45c', tilt: -1 },
    { w: 136, h: 30, x: 30, color: '#28402f', band: '#c9a45c', tilt: 1.5 },
    { w: 158, h: 22, x: 14, color: '#5c1e1e', band: '#d8b46a', tilt: -0.5 },
    { w: 128, h: 28, x: 36, color: '#2f3047', band: '#c9a45c', tilt: 2 },
    { w: 144, h: 20, x: 26, color: '#6a4a24', band: '#e0c27a', tilt: -2 },
  ];
  let y = 168;
  return (
    <svg viewBox="0 0 200 180" className={className} aria-hidden style={{ filter: 'drop-shadow(-6px 12px 12px rgba(0,0,0,0.55))' }}>
      <defs>
        <linearGradient id="bk-shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity={0.22} />
          <stop offset="45%" stopColor="#fff" stopOpacity={0} />
          <stop offset="100%" stopColor="#000" stopOpacity={0.35} />
        </linearGradient>
        <linearGradient id="bk-pages" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#efe2c2" />
          <stop offset="100%" stopColor="#bfa577" />
        </linearGradient>
      </defs>
      <ellipse cx="100" cy="172" rx="90" ry="6" fill="#000" opacity={0.35} />
      {books.map((b, i) => {
        y -= b.h;
        const pageW = 10;
        return (
          <g key={i} transform={`rotate(${b.tilt} ${b.x + b.w / 2} ${y + b.h / 2})`}>
            {/* Page block on the right */}
            <rect x={b.x + b.w - pageW - 2} y={y + 3} width={pageW + 4} height={b.h - 6} rx={1.5} fill="url(#bk-pages)" />
            {Array.from({ length: Math.floor((b.h - 8) / 2.2) }, (_, k) => (
              <path key={k} d={`M${b.x + b.w - pageW} ${y + 5 + k * 2.2} h${pageW + 1}`} stroke="#9b8257" strokeWidth={0.35} />
            ))}
            {/* Spine */}
            <rect x={b.x} y={y} width={b.w - pageW} height={b.h} rx={4} fill={b.color} />
            <rect x={b.x} y={y} width={b.w - pageW} height={b.h} rx={4} fill="url(#bk-shade)" />
            <rect x={b.x} y={y} width={b.w - pageW} height={b.h} rx={4} fill="none" stroke="#000" strokeOpacity={0.45} strokeWidth={0.8} />
            {/* Gilt bands and a title panel */}
            {[b.x + 12, b.x + 17, b.x + b.w - pageW - 18, b.x + b.w - pageW - 13].map(x => (
              <path key={x} d={`M${x} ${y + 2} v${b.h - 4}`} stroke={b.band} strokeWidth={1.4} opacity={0.85} />
            ))}
            <rect x={b.x + (b.w - pageW) / 2 - 18} y={y + b.h / 2 - 4} width={36} height={8} rx={1} fill="none" stroke={b.band} strokeWidth={0.9} opacity={0.75} />
            {/* Scuffs */}
            <path d={`M${b.x + 30} ${y + 3} q8 2 14 0`} stroke="#fff" strokeOpacity={0.12} strokeWidth={1.2} fill="none" />
          </g>
        );
      })}
    </svg>
  );
}

/* ─── Ink stamp for the title's status ──────────────────────────── */
function Stamp({ status, entry, currentDay }: { status: Status; entry: Entry; currentDay: number }) {
  const color = status === 'current' ? SCROLL_INK.red : status === 'past' ? SCROLL_INK.bronze : SCROLL_INK.faint;
  const label = status === 'current' ? `You are here · Day ${currentDay}` : status === 'past' ? 'Earned' : `Sealed until day ${entry.dayStart}`;
  return (
    <span className="inline-block -rotate-2 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.16em]"
      style={{ ...cinzel, color, border: `2px double ${color}`, borderRadius: 3, opacity: 0.88, mixBlendMode: 'multiply' }}>
      {label}
    </span>
  );
}

/** Tally marks scratched for each day of the tier: inked once lived, pencilled until then. */
function Tally({ total, done }: { total: number; done: number }) {
  const unit = Math.ceil(total / 45);
  const marks = Math.ceil(total / unit);
  const inked = Math.min(marks, Math.floor(done / unit));
  const groups = Math.ceil(marks / 5);
  let s = total * 7 + 3;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280) - 0.5;
  const gw = 26;
  return (
    <div className="flex items-center gap-3">
      <svg width={groups * gw} height={22} viewBox={`0 0 ${groups * gw} 22`} aria-hidden className="shrink-0">
        {Array.from({ length: marks }, (_, i) => {
          const g = Math.floor(i / 5);
          const k = i % 5;
          const on = i < inked;
          const style = on
            ? { stroke: SCROLL_INK.ink, strokeWidth: 1.9, opacity: 0.85 }
            : { stroke: SCROLL_INK.faint, strokeWidth: 1.2, opacity: 0.45, strokeDasharray: '2 2' };
          const x0 = g * gw + 3;
          if (k === 4) {
            return <path key={i} d={`M${x0 - 2 + rnd()} ${16 + rnd()} L${x0 + 18 + rnd()} ${5 + rnd()}`} fill="none" strokeLinecap="round" {...style} />;
          }
          const x = x0 + k * 4.5 + rnd() * 0.8;
          return <path key={i} d={`M${x + rnd() * 0.8} ${3 + rnd()} L${x + rnd() * 1.2} ${19 + rnd()}`} fill="none" strokeLinecap="round" {...style} />;
        })}
      </svg>
      {unit > 1 && <span className="text-[12px] italic" style={{ ...bookSerif, color: SCROLL_INK.faint }}>each mark, {unit} days</span>}
    </div>
  );
}

/** A wax seal, cracked in two once the title has been earned. */
function BrokenSeal({ size = 64 }: { size?: number }) {
  return (
    <svg viewBox="0 0 120 100" width={size * 1.2} height={size} aria-hidden style={{ filter: 'drop-shadow(0 4px 6px rgba(40,15,3,0.45))' }}>
      <defs>
        <radialGradient id="bseal" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#c8424a" />
          <stop offset="60%" stopColor="#8e1d24" />
          <stop offset="100%" stopColor="#4d0b10" />
        </radialGradient>
      </defs>
      {/* Ribbon tails the seal once held */}
      <path d="M44 62 L30 96 L40 90 L44 99 L54 66 Z" fill="#7a1a1f" opacity={0.85} />
      <path d="M70 62 L86 94 L76 89 L72 98 L62 66 Z" fill="#5e1418" opacity={0.85} />
      <g transform="rotate(-8 40 50)">
        <path d="M58 12 C40 8 20 16 18 36 C16 56 30 70 50 72 L54 58 L46 50 L56 40 L48 30 Z" fill="url(#bseal)" />
        <path d="M40 30 C34 34 32 44 36 52" fill="none" stroke="#5a0f14" strokeWidth={2.5} strokeLinecap="round" />
      </g>
      <g transform="translate(8 3) rotate(10 72 50)">
        <path d="M62 12 C82 10 100 22 100 42 C100 62 84 74 64 72 L60 58 L68 50 L58 40 L66 30 Z" fill="url(#bseal)" />
        <path d="M78 30 C84 34 86 44 82 52" fill="none" stroke="#5a0f14" strokeWidth={2.5} strokeLinecap="round" />
      </g>
    </svg>
  );
}

/** Blend two #rrggbb colours; t = 0 gives a, t = 1 gives b. */
function mixHex(a: string, b: string, t: number) {
  const p = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * A silk bookmark ribbon hanging over the sheet, drawn every frame: it sways
 * like a pendulum, ripples more toward its tail, flutters on hover, jolts when
 * tugged and springs to a longer drop when its leaf is open. The label is
 * woven along the ribbon's centre line, so it bends with the silk.
 */
function Bookmark({ label, color, active, onClick }: { label: string; color: string; active: boolean; onClick: () => void }) {
  const W = 30;            // ribbon width
  const BOX_W = 64;        // room to sway
  // Long enough that the label never runs off the end
  const SHORT = Math.max(92, Math.round(label.length * 10.5 + 46));
  const LONG = SHORT + 38;
  const uid = useId().replace(/:/g, '');
  const bodyRef = useRef<SVGPathElement>(null);
  const shineRef = useRef<SVGPathElement>(null);
  const shadeRef = useRef<SVGPathElement>(null);
  const lineRef = useRef<SVGPathElement>(null);
  const state = useRef({ len: active ? LONG : SHORT, vel: 0, kick: 0, hover: false, target: active ? LONG : SHORT });

  useEffect(() => {
    state.current.target = active ? LONG : SHORT;
    state.current.kick = 1;
  }, [active, LONG, SHORT]);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let last = performance.now();
    const t0 = last + Math.random() * 4000;
    const frame = (now: number) => {
      const st = state.current;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = (now - t0) / 1000;
      // Length follows a damped spring toward its target
      st.vel += ((st.target - st.len) * 90 - st.vel * 11) * dt;
      st.len += st.vel * dt;
      st.kick = Math.max(0, st.kick - dt * 0.9);

      const L = st.len;
      const amp = reduce ? 0 : 1.6 + (st.hover ? 3.2 : 0) + st.kick * 7;
      const sway = reduce ? 0 : Math.sin(t * 0.8) * 0.035 + st.kick * Math.sin(t * 9) * 0.05;
      const cx = BOX_W / 2;
      const N = 28;
      const centre: [number, number][] = [];
      for (let i = 0; i <= N; i++) {
        const y = (i / N) * L;
        const f = Math.pow(y / L, 1.4); // the top is pinned, the tail swings
        const x = cx + y * sway + amp * f * Math.sin(y / 26 - t * 2.6);
        centre.push([x, y]);
      }
      const left = centre.map(([x, y]) => `${(x - W / 2).toFixed(2)} ${y.toFixed(2)}`);
      const right = centre.map(([x, y]) => `${(x + W / 2).toFixed(2)} ${y.toFixed(2)}`).reverse();
      const [tx, ty] = centre[N];
      const notch = `${tx.toFixed(2)} ${(ty - 11).toFixed(2)}`;
      const outline = `M${left.join(' L')} L${notch} L${right.join(' L')} Z`;
      bodyRef.current?.setAttribute('d', outline);
      shadeRef.current?.setAttribute('d', outline);
      const line = centre.slice(0, N - 1).map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`);
      lineRef.current?.setAttribute('d', `M${line.join(' L')}`);
      shineRef.current?.setAttribute('d', `M${centre.slice(0, N - 1).map(([x, y]) => `${(x - W * 0.22).toFixed(2)} ${y.toFixed(2)}`).join(' L')}`);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <button role="tab" aria-selected={active} aria-label={label} title={label}
      onClick={() => { state.current.kick = 1; onClick(); }}
      onPointerEnter={() => { state.current.hover = true; }}
      onPointerLeave={() => { state.current.hover = false; }}
      className="relative -mx-2 outline-none focus-visible:ring-2 focus-visible:ring-[#c9a45c]"
      style={{ width: BOX_W, height: LONG + 18 }}
    >
      <svg width={BOX_W} height={LONG + 18} className="overflow-visible" aria-hidden
        style={{ filter: `drop-shadow(3px 5px 4px rgba(30,10,2,0.45))${active ? '' : ' saturate(0.6) brightness(0.72)'}`, transition: 'filter 0.3s' }}>
        <defs>
          <linearGradient id={`rb-silk-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={mixHex(color, '#000000', 0.3)} />
            <stop offset="30%" stopColor={color} />
            <stop offset="48%" stopColor={mixHex(color, '#ffffff', 0.28)} />
            <stop offset="70%" stopColor={color} />
            <stop offset="100%" stopColor={mixHex(color, '#000000', 0.4)} />
          </linearGradient>
          <linearGradient id={`rb-top-${uid}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="30">
            <stop offset="0%" stopColor="#000" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#000" stopOpacity={0} />
          </linearGradient>
        </defs>
        <path ref={bodyRef} fill={`url(#rb-silk-${uid})`} />
        <path ref={shineRef} fill="none" stroke="#fff" strokeOpacity={0.22} strokeWidth={2.5} strokeLinecap="round" />
        {/* the end tucked under the book's spine sits in shadow */}
        <path ref={shadeRef} fill={`url(#rb-top-${uid})`} />
        <path id={`rb-line-${uid}`} ref={lineRef} fill="none" />
        <text fontFamily="Cinzel, serif" fontWeight={700} fontSize={10.5} letterSpacing={2.2} fill="#f6e6b4" dominantBaseline="central"
          style={{ textShadow: '0 1px 1px rgba(0,0,0,0.5)', textTransform: 'uppercase' }}>
          <textPath href={`#rb-line-${uid}`} startOffset={22}>{label}</textPath>
        </text>
      </svg>
    </button>
  );
}

/**
 * Text that writes itself in ink: a quill nib travels along the line and each
 * letter appears behind it, landing wet and blurred before it dries dark.
 * Click to finish at once. Reduced-motion users, and `instant`, see it plainly.
 *
 * Words wrapped in *asterisks* are keywords: written in red, marked with
 * data-chronicle-keyword, and announced with a bubbling `chronicle:keyword`
 * event once fully written (the Chronicle's visitor stops to read them).
 */
function InkWriting({ text, play, instant = false, delay = 0, cps = 20, ink = SCROLL_INK.ink, lead, className = '', style, onStart, onDone }: {
  text: string; play: boolean; instant?: boolean; delay?: number; cps?: number; ink?: string;
  lead?: React.ReactNode; className?: string; style?: React.CSSProperties;
  onStart?: () => void; onDone?: () => void;
}) {
  const boxRef = useRef<HTMLParagraphElement>(null);
  const quillRef = useRef<SVGSVGElement>(null);
  const reduce = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const [done, setDone] = useState(instant || reduce);
  const started = useRef(false);
  const callbacks = useRef({ onStart, onDone });
  callbacks.current = { onStart, onDone };

  // Tell the page when writing finishes, however it finishes
  useEffect(() => {
    if (done && started.current) callbacks.current.onDone?.();
  }, [done]);

  useEffect(() => {
    if (!play || done) return;
    const box = boxRef.current;
    const quill = quillRef.current;
    if (!box || !quill) return;
    const chars = Array.from(box.querySelectorAll<HTMLElement>('[data-ch]'));
    // The index of each keyword's last letter, in writing order
    const keywordEnds = Array.from(box.querySelectorAll<HTMLElement>('[data-chronicle-keyword]'))
      .map(el => { const own = el.querySelectorAll('[data-ch]'); return { el, end: chars.indexOf(own[own.length - 1] as HTMLElement) }; })
      .filter(k => k.end >= 0)
      .sort((a, b) => a.end - b.end);
    let nextKeyword = 0;
    const start = performance.now() + delay * 1000;
    let raf = 0;
    let qx = -1, qy = -1;
    const frame = (now: number) => {
      const t = (now - start) / 1000;
      if (t < 0) { raf = requestAnimationFrame(frame); return; }
      if (!started.current) { started.current = true; callbacks.current.onStart?.(); }
      const idx = Math.floor(t * cps);
      while (nextKeyword < keywordEnds.length && keywordEnds[nextKeyword].end < idx) {
        const { el } = keywordEnds[nextKeyword++];
        el.dispatchEvent(new CustomEvent('chronicle:keyword', { bubbles: true, detail: { element: el } }));
      }
      if (idx >= chars.length) { setDone(true); return; }
      const el = chars[idx];
      const x = el.offsetLeft + el.offsetWidth;
      const y = el.offsetTop + el.offsetHeight * 0.82 + Math.sin(t * 22) * 1.2; // the nib's little scratch
      // Glide to the next letter, but jump straight to a new line
      if (qx < 0 || Math.abs(y - qy) > 8) { qx = x; qy = y; } else { qx += (x - qx) * 0.35; qy += (y - qy) * 0.35; }
      quill.style.opacity = '1';
      quill.style.transform = `translate(${qx}px, ${qy - 44}px) rotate(${Math.sin(t * 3) * 4}deg)`;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [play, done, delay, cps]);

  // *keyword* segments become red, marked spans
  const segments = text.split(/(\*[^*]+\*)/).filter(Boolean).map(seg =>
    seg.length > 2 && seg.startsWith('*') && seg.endsWith('*') ? { text: seg.slice(1, -1), keyword: true } : { text: seg, keyword: false });
  const plain = segments.map(s => s.text).join('');

  // Split into words so wrapping still happens between words, not mid-word
  let n = 0;
  const words = (str: string, key: string) => str.split(/(\s+)/).map((part, i) => {
    if (!part) return null;
    if (/^\s+$/.test(part)) return part;
    return (
      <span key={`${key}-${i}`} className="inline-block whitespace-nowrap">
        {Array.from(part).map((ch, j) => {
          const k = n++;
          return <span key={j} data-ch className="ink-ch" style={{ animationDelay: `${delay + k / cps}s` }}>{ch}</span>;
        })}
      </span>
    );
  });
  const parts = segments.map((seg, s) => seg.keyword
    ? <span key={s} data-chronicle-keyword="" className="font-semibold" style={{ ['--ink' as string]: SCROLL_INK.red }}>{words(seg.text, `k${s}`)}</span>
    : words(seg.text, `t${s}`));

  return (
    <p ref={boxRef} onClick={() => setDone(true)}
      className={`relative ${done ? 'ink-done' : play ? 'ink-play cursor-pointer' : ''} ${className}`}
      style={{ ...style, ['--ink' as string]: ink }}
      title={done || !play ? undefined : 'Click to finish writing'}>
      {lead}
      <span className="sr-only">{plain}</span>
      <span aria-hidden>{parts}</span>
      {!done && (
        <svg ref={quillRef} viewBox="0 0 44 44" width={44} height={44} aria-hidden
          className="pointer-events-none absolute left-0 top-0 z-10 opacity-0 transition-opacity duration-300"
          style={{ transformOrigin: '0 44px', filter: 'drop-shadow(2px 3px 2px rgba(40,15,3,0.35))' }}>
          <path d="M2 42 C10 30 22 16 42 2 C34 16 22 30 8 40 Z" fill="#efe3c6" stroke="#7a5a34" strokeWidth={0.8} />
          <path d="M2 42 L30 12" stroke="#7a5a34" strokeWidth={0.7} opacity={0.6} />
          {[8, 13, 18, 23, 28].map(d => (
            <path key={d} d={`M${d} ${42 - d} l${-4} ${-2} M${d} ${42 - d} l${3} ${4}`} stroke="#9a7a50" strokeWidth={0.5} opacity={0.6} />
          ))}
          <path d="M0 44 L4 39" stroke="#1a0d04" strokeWidth={1.6} strokeLinecap="round" />
        </svg>
      )}
    </p>
  );
}

function Story({ entry, status, currentDay, name }: { entry: Entry; status: Status; currentDay: number; name: string }) {
  const detail = DETAILS[entry.id];
  const locked = status === 'locked';
  const current = status === 'current';
  const idx = IDENTITIES.findIndex(i => i.id === entry.id);
  const next = IDENTITIES[idx + 1];
  const days = entry.dayStart - currentDay;
  const [leaf, setLeaf] = useState<'chronicle' | 'proven'>('chronicle');
  const [provenOpened, setProvenOpened] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [writing, setWriting] = useState(false);
  // One reproducible walk per title
  const visitorSeed = Array.from(entry.id).reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  useEffect(() => { if (leaf === 'proven') setProvenOpened(true); }, [leaf]);
  const CPS = 20; // a steady handwriting pace
  // The quill greets you by name before it writes, like the opening of a letter
  const greeting = name ? `My dear ${name},` : 'My dear reader,';
  const provenIntro = locked
    ? `${name ? `${name}, this` : 'This'} is what awaits you:`
    : `${name ? `${name}, here` : 'Here'} is what you have proven:`;
  const descStart = 0.5 + greeting.length / CPS + 0.7; // a breath after the greeting
  // The chronicle speaks to you by name
  const chronicle = detail.description.split('{name}').join(name || 'friend');
  const writeTime = descStart + chronicle.replace(/\*/g, '').length / CPS;
  const milestoneStart = 0.3 + provenIntro.length / CPS + 0.5;
  const gap = 'mt-[clamp(6px,1.3vh,12px)]';
  const total = entry.dayEnd != null ? entry.dayEnd - entry.dayStart + 1 : 0;
  const done = current ? currentDay - entry.dayStart + 1 : total;

  const leaves = [
    { id: 'chronicle' as const, tab: 'Chronicle', label: 'The Chronicle', icon: ScrollText, color: '#8a1c22' },
    { id: 'proven' as const, tab: locked ? 'Awaits' : 'Proven', label: locked ? 'What awaits you' : "What you've proven", icon: Feather, color: '#24513a' },
  ];
  const open = leaves.find(l => l.id === leaf)!;
  const lineFont = 'text-[clamp(14px,1.9vh,16.5px)]';
  // Faint ruled lines under the writing, one per line of text
  const ruled = {
    backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent calc(1.6em - 1px), rgba(122,74,26,0.2) calc(1.6em - 1px), rgba(122,74,26,0.2) 1.6em)',
    backgroundPosition: '0 0.28em',
  };

  return (
    <motion.div
      key={entry.id}
      initial={{ opacity: 0, y: 14, rotate: -0.8 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="relative w-full max-w-[660px] pt-[clamp(22px,4vh,44px)] pl-[clamp(16px,3vh,32px)] pr-[clamp(12px,2vh,24px)] pb-[clamp(12px,2.5vh,28px)]"
    >
      <QuillAndInk className="absolute left-0 top-0 z-20 w-[clamp(78px,12.5vh,120px)] -translate-x-[22%]" />
      <BookStack className="absolute bottom-0 right-0 z-20 w-[clamp(110px,17vh,170px)] translate-x-[18%]" />

      {/* Silk bookmarks hanging over the sheet's top edge switch between its two leaves */}
      <div className="absolute right-[clamp(40px,9%,80px)] top-[clamp(10px,2.4vh,28px)] z-20 flex" role="tablist" aria-label="Story pages">
        {leaves.map(l => (
          <Bookmark key={l.id} label={l.tab} color={l.color} active={leaf === l.id} onClick={() => setLeaf(l.id)} />
        ))}
      </div>

      {/* Seal on the bottom edge: broken once earned, intact while sealed */}
      <div className="absolute bottom-[clamp(2px,1vh,12px)] left-[clamp(40px,8%,72px)] z-20">
        {locked ? <WaxSeal size={58} /> : <BrokenSeal size={52} />}
      </div>

      <Parchment className="z-10">
        <div ref={sheetRef} className="relative px-[clamp(30px,4.5vw,54px)] pt-[clamp(30px,5vh,48px)] pb-[clamp(48px,8.5vh,76px)]">
          {/* Red double margin rule, as on a scribe's ledger */}
          <span className="pointer-events-none absolute bottom-[12%] top-[12%] left-[clamp(18px,2.6vw,32px)] w-[4px]" aria-hidden
            style={{ borderLeft: '1px solid rgba(138,28,34,0.35)', borderRight: '1px solid rgba(138,28,34,0.35)' }} />

          <div className="flex flex-wrap items-center gap-3 pl-[clamp(26px,4.5vh,48px)] pr-[100px]">
            <Stamp status={status} entry={entry} currentDay={currentDay} />
            <span className="text-[11px] font-bold uppercase tracking-[0.24em]" style={{ ...cinzel, color: SCROLL_INK.faint }}>{detail.tier}</span>
          </div>

          <div className={`${gap} flex items-center gap-3 pr-[100px]`}>
            <RankBadge tier={idx} locked={locked} size={54} ribbon={false} className="shrink-0" />
            <div className="min-w-0">
              <h3 className="text-[clamp(1.7rem,4.6vh,2.7rem)] font-bold leading-none tracking-[0.02em]"
                style={{ ...cinzel, color: locked ? SCROLL_INK.faint : current ? SCROLL_INK.red : SCROLL_INK.ink, textShadow: '0 1px 0 rgba(255,240,210,0.35)' }}>
                {entry.title}
              </h3>
              <p className={`mt-1 text-[clamp(14px,1.85vh,16px)] italic ${locked ? 'blur-[4px] select-none' : ''}`} style={{ ...bookSerif, color: SCROLL_INK.bronze, fontWeight: 500 }} aria-hidden={locked}>
                {detail.tagline}
              </p>
            </div>
          </div>

          {!locked && entry.dayEnd != null && (
            <div className={gap}>
              <div className="flex justify-between text-[13.5px] italic" style={{ ...bookSerif, color: SCROLL_INK.soft }}>
                <span>{current ? `Day ${done} of ${total}` : `Held for ${total} days`}</span>
                {current && next && <span>{entry.dayEnd - currentDay + 1} days to {next.title}</span>}
              </div>
              <div className="mt-1"><Tally total={total} done={done} /></div>
            </div>
          )}

          {/* The open leaf's name, set between rules */}
          <div className={`${gap} flex items-center gap-3`} aria-hidden>
            <span className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, ${SCROLL_INK.bronze}88)` }} />
            <span className="text-sm leading-none" style={{ color: SCROLL_INK.bronze }}>❦</span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={open.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}
                className="text-[12px] font-bold uppercase tracking-[0.2em]" style={{ ...cinzel, color: SCROLL_INK.ink }}>
                {open.label}
              </motion.span>
            </AnimatePresence>
            <span className="text-sm leading-none" style={{ color: SCROLL_INK.bronze }}>❦</span>
            <span className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${SCROLL_INK.bronze}88, transparent)` }} />
          </div>

          {/* A locked title keeps its story sealed: blurred, unselectable, hidden from screen readers */}
          <div className={`relative ${gap}`}>
            {locked && (
              <div className="absolute inset-x-0 top-2 z-10 flex justify-center">
                <div className="flex items-center gap-3 rounded-sm px-5 py-3"
                  style={{ background: 'rgba(242,227,191,0.92)', border: `1px solid ${SCROLL_INK.bronze}66`, boxShadow: '0 10px 30px rgba(60,30,8,0.35)' }}>
                  <WaxSeal size={48} />
                  <div>
                    <p className="text-[13px] font-bold uppercase tracking-[0.14em]" style={{ ...cinzel, color: SCROLL_INK.ink }}>
                      {days} day{days === 1 ? '' : 's'} until this chapter opens
                    </p>
                    <p className="text-sm italic" style={{ ...bookSerif, color: SCROLL_INK.soft }}>Keep your streak alive. Don&apos;t break what you&apos;re building.</p>
                  </div>
                </div>
              </div>
            )}
            {/* Both leaves share one grid cell, so the sheet keeps the taller one's height */}
            <div className={`grid ${locked ? 'pointer-events-none select-none blur-[6px] opacity-60' : ''}`} aria-hidden={locked}>
              <div className="[grid-area:1/1] transition-opacity duration-300" data-inactive-leaf={leaf === 'chronicle' ? undefined : ''} style={{ opacity: leaf === 'chronicle' ? 1 : 0, visibility: leaf === 'chronicle' ? 'visible' : 'hidden' }}>
                <InkWriting
                  text={greeting}
                  play={!locked}
                  instant={locked}
                  delay={0.5}
                  cps={CPS}
                  className="text-[clamp(15px,2vh,17.5px)] italic"
                  style={{ ...bookSerif, color: SCROLL_INK.bronze, fontWeight: 500 }}
                  ink={SCROLL_INK.bronze}
                />
                <InkWriting
                  text={chronicle}
                  play={!locked}
                  instant={locked}
                  delay={descStart}
                  cps={CPS}
                  onStart={() => setWriting(true)}
                  onDone={() => setWriting(false)}
                  className={`${lineFont} leading-[1.6]`}
                  style={{ ...bookSerif, ...ruled, color: SCROLL_INK.ink }}
                />
                <motion.blockquote className={`${gap} [@media(max-height:760px)]:hidden`}
                  initial={locked ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: locked ? 0 : writeTime + 0.2, duration: 0.6 }}>
                  <p className="text-[clamp(13.5px,1.75vh,15.5px)] italic leading-snug" style={{ ...bookSerif, color: SCROLL_INK.soft }}>
                    <span className="mr-0.5 text-xl leading-none align-[-0.15em]" style={{ color: SCROLL_INK.red }}>“</span>{detail.quote}<span className="ml-0.5 text-xl leading-none align-[-0.15em]" style={{ color: SCROLL_INK.red }}>”</span>
                  </p>
                  <footer className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ ...cinzel, color: SCROLL_INK.bronze }}>— {detail.quoteAuthor}</footer>
                </motion.blockquote>
              </div>

              <div className="[grid-area:1/1] transition-opacity duration-300" data-inactive-leaf={leaf === 'proven' ? undefined : ''} style={{ opacity: leaf === 'proven' ? 1 : 0, visibility: leaf === 'proven' ? 'visible' : 'hidden' }}>
                <InkWriting
                  text={provenIntro}
                  play={provenOpened}
                  instant={locked}
                  delay={0.3}
                  cps={CPS}
                  className="mb-1.5 text-[clamp(15px,2vh,17.5px)] italic"
                  style={{ ...bookSerif, color: SCROLL_INK.bronze, fontWeight: 500 }}
                  ink={SCROLL_INK.bronze}
                />
                <p className="text-[12px] font-bold uppercase tracking-[0.18em]" style={{ ...cinzel, color: SCROLL_INK.red }}>
                  {detail.traits.join('  ·  ')}
                </p>
                <ul className={`${gap} ${lineFont} leading-[1.6]`} style={{ ...bookSerif, ...ruled, color: SCROLL_INK.ink }}>
                  {detail.milestones.map((m, i) => {
                    const before = detail.milestones.slice(0, i).reduce((sum, x) => sum + x.length, 0);
                    return (
                      <li key={m} className="flex gap-2.5">
                        <span className="shrink-0" style={{ color: SCROLL_INK.bronze }}>❧</span>
                        <InkWriting text={m} play={provenOpened} instant={locked} delay={milestoneStart + before / CPS + i * 0.25} cps={CPS} />
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
          {/* An unseen visitor walks the page while the quill writes */}
          <ChronicleVisitor isWriting={writing} containerRef={sheetRef} seed={visitorSeed} />
        </div>
      </Parchment>
    </motion.div>
  );
}

/* ─── Deck: the eight medals on a gold thread ───────────────────── */
function Deck({ currentDay, selected, onSelect }: { currentDay: number; selected: number; onSelect: (i: number) => void }) {
  const curIdx = IDENTITIES.findIndex(i => getStatus(currentDay, i.dayStart, i.dayEnd) === 'current');
  const cur = IDENTITIES[curIdx];
  const fill = (curIdx + tierProgress(cur, currentDay, 'current')) / (IDENTITIES.length - 1);
  const selRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { selRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }, [selected]);

  return (
    <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="mx-auto w-max px-6 pt-5 pb-5">
        {/* Fixed-width slots so the thread's ends and the gold fill line up with the medal centres */}
        <div className="relative flex gap-1 sm:gap-3">
          <div className="absolute left-[44px] right-[44px] top-[30px] h-px" style={{ backgroundImage: `repeating-linear-gradient(90deg, ${INK.dim} 0 4px, transparent 4px 9px)` }} aria-hidden>
            <motion.div className="h-[2px] -translate-y-[0.5px]" style={{ background: `linear-gradient(90deg, #8a6420, ${INK.goldHi})`, boxShadow: `0 0 8px ${INK.gold}88` }}
              initial={{ width: 0 }} animate={{ width: `${Math.min(fill, 1) * 100}%` }} transition={{ duration: 1.2, delay: 0.3, ease: EASE }} />
          </div>
          {IDENTITIES.map((e, i) => {
            const status = getStatus(currentDay, e.dayStart, e.dayEnd);
            const on = i === selected;
            return (
              <button key={e.id} ref={on ? selRef : undefined} onClick={() => onSelect(i)}
                aria-label={`${e.title}, ${status === 'locked' ? 'locked' : status === 'past' ? 'earned' : 'current'}`}
                aria-current={on ? 'true' : undefined}
                className="group relative flex w-[88px] shrink-0 flex-col items-center gap-1.5 outline-none">
                {status === 'current' && (
                  <span className="absolute -top-4 text-[13px] italic leading-none" style={{ ...bookSerif, color: INK.goldHi }}>you</span>
                )}
                <motion.span
                  animate={{ y: on ? -6 : 0, scale: on ? 1.12 : 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 26 }}
                  className={`relative grid h-[60px] w-[60px] place-items-center rounded-full group-focus-visible:ring-2 group-focus-visible:ring-[#c9a45c] transition-opacity ${on || status !== 'locked' ? '' : 'opacity-60 group-hover:opacity-100'}`}
                  style={{ background: on ? `radial-gradient(circle, ${INK.gold}40 0%, transparent 70%)` : undefined }}
                >
                  <RankBadge tier={i} locked={status === 'locked'} size={58} ribbon={false} />
                </motion.span>
                <span className="text-[9.5px] font-semibold uppercase tracking-[0.14em] whitespace-nowrap transition-colors"
                  style={{ ...cinzel, color: on ? INK.goldHi : status === 'locked' ? '#8f7c5e' : INK.faded }}>
                  {e.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── The desk: walnut grain, candlelight and drifting dust ──────── */
function DeskBackdrop() {
  // Fixed positions so the dust never reshuffles between renders
  const motes = useMemo(() => {
    let s = 5;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    return Array.from({ length: 26 }, () => ({
      left: 4 + rnd() * 60, top: 20 + rnd() * 75, size: 1.5 + rnd() * 2.5,
      dur: 16 + rnd() * 18, delay: -rnd() * 30, drift: (rnd() - 0.5) * 60,
    }));
  }, []);
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <svg className="absolute inset-0 h-full w-full">
        <defs>
          <filter id="jr-wood" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.0022 0.055" numOctaves={4} seed={3} />
            <feColorMatrix values="0.42 0 0 0 0.05  0.24 0 0 0 0.028  0.1 0 0 0 0.012  0 0 0 0 1" />
          </filter>
          <filter id="jr-knots" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="turbulence" baseFrequency="0.006 0.02" numOctaves={2} seed={12} />
            <feColorMatrix values="0 0 0 0 0.05  0 0 0 0 0.02  0 0 0 0 0.01  0 0 0 -2.2 1.05" />
          </filter>
        </defs>
        <rect width="100%" height="100%" filter="url(#jr-wood)" />
        <rect width="100%" height="100%" filter="url(#jr-knots)" opacity={0.35} />
        {/* Plank seams */}
        {[27, 58, 86].map(y => (
          <g key={y}>
            <rect x="0" y={`${y}%`} width="100%" height="2" fill="#000" opacity={0.55} />
            <rect x="0" y={`${y + 0.25}%`} width="100%" height="1" fill="#c08a4a" opacity={0.08} />
          </g>
        ))}
      </svg>
      {/* Dim the wood so the paper and card carry the light */}
      <div className="absolute inset-0" style={{ background: 'rgba(12,7,3,0.5)' }} />
      {/* Candlelight pooling to the left, flickering */}
      <div className="jr-flicker absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 50% 70% at 6% 78%, rgba(255,170,70,0.28) 0%, rgba(255,140,50,0.10) 40%, transparent 70%), radial-gradient(ellipse 55% 60% at 32% 50%, rgba(220,150,70,0.13) 0%, transparent 70%)' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 45% 50%, transparent 40%, rgba(0,0,0,0.78) 100%)' }} />
      {motes.map((m, i) => (
        <span key={i} className="jr-mote absolute rounded-full"
          style={{ left: `${m.left}%`, top: `${m.top}%`, width: m.size, height: m.size, animationDuration: `${m.dur}s`, animationDelay: `${m.delay}s`, ['--drift' as string]: `${m.drift}px` }} />
      ))}
    </div>
  );
}

/** A brass chamberstick with a burning candle. */
function Candle({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 260" className={className} aria-hidden style={{ filter: 'drop-shadow(10px 14px 10px rgba(0,0,0,0.6))' }}>
      <defs>
        <radialGradient id="cd-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffd690" stopOpacity={0.55} />
          <stop offset="100%" stopColor="#ff9a3c" stopOpacity={0} />
        </radialGradient>
        <linearGradient id="cd-wax" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#c9b48a" />
          <stop offset="35%" stopColor="#f4e8cc" />
          <stop offset="70%" stopColor="#e2cfa6" />
          <stop offset="100%" stopColor="#a8916a" />
        </linearGradient>
        <linearGradient id="cd-brass" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#5a3a0c" />
          <stop offset="35%" stopColor="#e8c46a" />
          <stop offset="60%" stopColor="#a8792a" />
          <stop offset="100%" stopColor="#4a2e08" />
        </linearGradient>
        <radialGradient id="cd-flame" cx="50%" cy="70%" r="60%">
          <stop offset="0%" stopColor="#fffbe8" />
          <stop offset="35%" stopColor="#ffd36b" />
          <stop offset="75%" stopColor="#ff8a2a" stopOpacity={0.9} />
          <stop offset="100%" stopColor="#ff5a10" stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx="60" cy="40" r="46" fill="url(#cd-glow)" className="jr-flicker" />
      {/* Flame and wick */}
      <g className="jr-flame" style={{ transformOrigin: '60px 70px' }}>
        <path d="M60 20 C68 36 70 50 66 60 C64 66 56 66 54 60 C50 50 52 36 60 20 Z" fill="url(#cd-flame)" />
        <ellipse cx="60" cy="58" rx="3.2" ry="5" fill="#5a8ad0" opacity={0.55} />
      </g>
      <path d="M60 60 V70" stroke="#2a1a0c" strokeWidth={1.6} />
      {/* Candle with drips */}
      <path d="M44 70 C44 66 76 66 76 70 V196 H44 Z" fill="url(#cd-wax)" />
      <path d="M44 70 C44 74 49 76 50 84 C51 90 47 92 47 98 C47 102 52 102 52 96 V74 C58 76 66 76 70 74 V88 C70 93 74 93 74 88 V72" fill="#efe1c1" opacity={0.9} />
      <ellipse cx="60" cy="70" rx="16" ry="3.5" fill="#fff6dc" opacity={0.6} />
      {/* Brass dish and handle */}
      <path d="M38 196 H82 L86 206 H34 Z" fill="url(#cd-brass)" />
      <ellipse cx="60" cy="214" rx="54" ry="11" fill="url(#cd-brass)" />
      <ellipse cx="60" cy="211" rx="46" ry="7" fill="#3d2706" opacity={0.45} />
      <path d="M104 212 C118 210 118 228 104 226" fill="none" stroke="url(#cd-brass)" strokeWidth={5} strokeLinecap="round" />
    </svg>
  );
}

/* ─── Main component ─────────────────────────────────────────────── */
export function IdentityJourneyMap({ currentDay, onClose }: Props) {
  const curIdx = Math.max(0, IDENTITIES.findIndex(i => getStatus(currentDay, i.dayStart, i.dayEnd) === 'current'));
  const [[selected, direction], setSel] = useState<[number, number]>([curIdx, 0]);
  const select = (i: number) => setSel(([prev]) => [Math.max(0, Math.min(IDENTITIES.length - 1, i)), Math.sign(i - prev)]);

  const entry = IDENTITIES[selected];
  const status = getStatus(currentDay, entry.dayStart, entry.dayEnd);
  const earned = IDENTITIES.filter(i => getStatus(currentDay, i.dayStart, i.dayEnd) !== 'locked').length;
  // First name from the profile, so the chronicle can address you
  const { user } = useAuth();
  const firstName = String(user?.user_metadata?.display_name ?? '').trim().split(/\s+/)[0] ?? '';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') setSel(([p]) => [Math.min(IDENTITIES.length - 1, p + 1), 1]);
      else if (e.key === 'ArrowLeft') setSel(([p]) => [Math.max(0, p - 1), -1]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const arrow = 'grid h-10 w-10 shrink-0 place-items-center rounded-full transition disabled:opacity-25 disabled:cursor-not-allowed';

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      style={{ background: '#0f0a06' }}
      role="dialog"
      aria-modal="true"
      aria-label="Identity journey"
    >
      <style>{`
        @keyframes jr-turn { to { transform: rotate(360deg); } }
        .jr-astrolabe { animation: jr-turn 140s linear infinite; }
        @keyframes jr-flicker { 0%,100% { opacity: 1 } 18% { opacity: .86 } 22% { opacity: .97 } 47% { opacity: .9 } 63% { opacity: 1 } 80% { opacity: .84 } }
        .jr-flicker { animation: jr-flicker 3.4s ease-in-out infinite; }
        @keyframes jr-flame { 0%,100% { transform: scale(1,1) skewX(0deg) } 25% { transform: scale(.94,1.06) skewX(-2deg) } 50% { transform: scale(1.04,.95) skewX(1.5deg) } 75% { transform: scale(.97,1.04) skewX(-1deg) } }
        .jr-flame { animation: jr-flame 1.6s ease-in-out infinite; transform-box: view-box; }
        @keyframes jr-mote { 0% { transform: translate(0,0); opacity: 0 } 15% { opacity: .7 } 85% { opacity: .5 } 100% { transform: translate(var(--drift), -160px); opacity: 0 } }
        .jr-mote { background: #f6dc9c; filter: blur(0.6px); box-shadow: 0 0 6px rgba(246,220,156,0.7); animation: jr-mote linear infinite; }
        .ink-ch { opacity: 0; color: var(--ink); animation: jr-ink 1.6s ease-out both; animation-play-state: paused; }
        .ink-play .ink-ch { animation-play-state: running; }
        .ink-done .ink-ch { animation: none; opacity: 1; }
        @keyframes jr-ink { 0% { opacity: 0; filter: blur(1.6px); color: #8a5a24; } 35% { opacity: 1; filter: blur(0.4px); color: #5c3412; } 100% { opacity: 1; filter: blur(0); color: var(--ink); } }
        .jr-sheen { background: linear-gradient(105deg, transparent 35%, rgba(255,245,215,0.55) 48%, transparent 60%); background-size: 260% 100%; animation: jr-sheen 5.5s ease-in-out infinite; }
        @keyframes jr-sheen { 0%, 55% { background-position: 130% 0; } 100% { background-position: -40% 0; } }
        .jr-rays { animation: jr-turn 60s linear infinite; }
        @keyframes jr-prism { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        .jr-prism { animation: jr-prism 8s ease-in-out infinite; }
        @keyframes jr-twinkle { 0%, 100% { opacity: 0; transform: scale(0.4) rotate(0deg); } 50% { opacity: 1; transform: scale(1) rotate(45deg); } }
        .jr-twinkle { animation: jr-twinkle 3.6s ease-in-out infinite; filter: drop-shadow(0 0 4px rgba(255,230,160,0.9)); }
        .jr-knob {
          background: radial-gradient(circle at 35% 30%, #f6dc94 0%, #b88a34 45%, #5a3a0c 100%);
          box-shadow: inset 0 1px 1px rgba(255,240,200,0.6), inset 0 -2px 3px rgba(0,0,0,0.45), 0 4px 10px rgba(0,0,0,0.55);
          color: #2a1606;
        }
        .jr-knob:not(:disabled):hover { filter: brightness(1.12); }
        @media (prefers-reduced-motion: reduce) { .jr-astrolabe, .jr-flicker, .jr-flame, .jr-mote, .ink-ch, .jr-sheen, .jr-rays, .jr-twinkle, .jr-prism { animation: none; } .ink-ch { opacity: 1; } .jr-mote { display: none; } }
      `}</style>

      <DeskBackdrop />
      <Candle className="pointer-events-none absolute bottom-[clamp(90px,14vh,140px)] left-[1.5%] z-[5] hidden w-[clamp(70px,10vh,104px)] xl:block" />

      {/* Header */}
      <header className="relative z-10 grid grid-cols-[40px_1fr_40px] items-center gap-4 px-5 sm:px-10 pt-4 pb-1 shrink-0">
        <span />
        <div className="text-center">
          <div className="flex items-center justify-center gap-4">
            <span className="hidden sm:block h-px w-24" style={{ background: `linear-gradient(90deg, transparent, ${INK.gold})` }} aria-hidden />
            <h2 className="text-[clamp(15px,2.2vh,20px)] font-semibold uppercase tracking-[0.32em]"
              style={{ ...cinzel, background: GOLD_LEAF, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              The Chronicle of Becoming
            </h2>
            <span className="hidden sm:block h-px w-24" style={{ background: `linear-gradient(90deg, ${INK.gold}, transparent)` }} aria-hidden />
          </div>
          <p className="mt-0.5 text-[15px] italic" style={{ ...bookSerif, color: INK.faded }}>
            Day <span style={{ color: INK.parchment }}>{currentDay}</span> of your journey{firstName && <>, <span style={{ color: INK.parchment }}>{firstName}</span></>} · {earned} of {IDENTITIES.length} titles unlocked
          </p>
        </div>
        <button onClick={onClose} aria-label="Close" className={`jr-knob ${arrow}`}>
          <X className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </header>

      {/* Stage: fits the window on desktop; scrolls only on small screens */}
      <main className="relative z-10 flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
        <div className="mx-auto grid h-full max-w-6xl items-center gap-8 lg:gap-14 px-5 sm:px-10 lg:grid-cols-[auto_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]">
          <div className="relative flex items-center justify-center gap-3 sm:gap-5 pt-16 pb-4 lg:h-full lg:pt-[clamp(56px,9vh,84px)] lg:pb-[clamp(16px,3vh,32px)]">
            {/* A slow-turning astrolabe behind the card */}
            <svg viewBox="0 0 200 200" className="jr-astrolabe pointer-events-none absolute left-1/2 top-1/2 h-[118%] max-h-[720px] -translate-x-1/2 -translate-y-1/2 opacity-[0.22]" aria-hidden>
              <circle cx="100" cy="100" r="96" fill="none" stroke={INK.gold} strokeWidth="0.5" />
              <circle cx="100" cy="100" r="88" fill="none" stroke={INK.gold} strokeWidth="0.3" strokeDasharray="1 2" />
              {Array.from({ length: 72 }, (_, i) => {
                const a = (i * 5 * Math.PI) / 180;
                const r1 = i % 6 === 0 ? 86 : 92;
                return <line key={i} x1={100 + r1 * Math.cos(a)} y1={100 + r1 * Math.sin(a)} x2={100 + 96 * Math.cos(a)} y2={100 + 96 * Math.sin(a)} stroke={INK.gold} strokeWidth="0.4" />;
              })}
              {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'].map((n, i) => {
                const a = ((i * 30 - 90) * Math.PI) / 180;
                return <text key={n} x={100 + 79 * Math.cos(a)} y={100 + 79 * Math.sin(a) + 2} textAnchor="middle" fontSize="6" fill={INK.gold} fontFamily="Cinzel, serif">{n}</text>;
              })}
            </svg>

            <button onClick={() => select(selected - 1)} disabled={selected === 0} aria-label="Previous title" className={`jr-knob relative ${arrow}`}>
              <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
            </button>
            <AnimatePresence mode="wait" initial={false}>
              <TitleCard key={entry.id} entry={entry} status={status} currentDay={currentDay} index={selected} direction={direction} />
            </AnimatePresence>
            <button onClick={() => select(selected + 1)} disabled={selected === IDENTITIES.length - 1} aria-label="Next title" className={`jr-knob relative ${arrow}`}>
              <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>
          <div className="flex justify-center lg:justify-start lg:items-center lg:h-full lg:min-h-0 pb-6 lg:pb-0">
            <AnimatePresence mode="wait" initial={false}>
              <Story key={entry.id} entry={entry} status={status} currentDay={currentDay} name={firstName} />
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Deck */}
      <footer className="relative z-10 shrink-0 px-4 pb-3">
        {/* A stitched leather strap the medals are pinned to */}
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[14px]"
          style={{
            background: 'linear-gradient(180deg, #3a2414 0%, #2a190d 45%, #1d1108 100%)',
            boxShadow: 'inset 0 1px 0 rgba(255,220,160,0.12), inset 0 -2px 6px rgba(0,0,0,0.5), 0 14px 30px rgba(0,0,0,0.55)',
          }}>
          <div className="pointer-events-none absolute inset-0 opacity-30 mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
          <div className="pointer-events-none absolute inset-[6px] rounded-[10px]" style={{ border: `1.5px dashed ${INK.gold}55` }} />
          <div className="relative"><Deck currentDay={currentDay} selected={selected} onSelect={select} /></div>
        </div>
      </footer>
    </motion.div>
  );
}
