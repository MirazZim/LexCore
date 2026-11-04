import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  BarChart3, BookMarked, BookOpen, BookText, Check, Compass, Home, Moon, PenLine, PlusCircle, Repeat, Settings, Trophy,
} from 'lucide-react';
import AccordionGallery from '@/components/ui/AccordionGallery';

type Tile = {
  icon: typeof Home;
  room: string;
  title: string;
  body: string;
  accent: string;
  span?: string;
  visual: ReactNode;
};

const chip = (on: boolean, accent = '#00FFC8') =>
  on
    ? { color: accent, background: `color-mix(in srgb, ${accent} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${accent} 40%, transparent)` }
    : { color: '#71717a', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' };

const Chips = ({ items, on = [], accent }: { items: string[]; on?: string[]; accent?: string }) => (
  <div className="flex flex-wrap gap-1.5">
    {items.map(t => (
      <span key={t} className="rounded-full px-2.5 py-1 text-[10px] font-semibold" style={chip(on.includes(t), accent)}>{t}</span>
    ))}
  </div>
);

const TILES: Tile[] = [
  {
    icon: Home, room: 'Home', accent: '#00FFC8', span: 'lg:col-span-2',
    title: "Today's mission, at a glance",
    body: 'Your due words split into small sets, your streak, your title and one button to start.',
    visual: (
      <div className="flex items-center">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`flex items-center ${i < 3 ? 'flex-1' : ''}`}>
            <span className="h-7 w-7 rounded-full grid place-items-center text-[10px] font-bold shrink-0"
              style={i < 2
                ? { background: 'linear-gradient(135deg,#f6dc94,#c8922a)', color: '#3a2606' }
                : i === 2
                  ? { background: 'rgba(0,255,200,0.12)', color: '#00FFC8', border: '1.5px solid #00FFC8' }
                  : { color: '#71717a', border: '1.5px dashed rgba(255,255,255,0.14)' }}>
              {i < 2 ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : 7}
            </span>
            {i < 3 && <span className="flex-1 h-[2px] mx-1.5 rounded-full" style={{ background: i < 2 ? '#c8922a' : 'rgba(255,255,255,0.08)' }} />}
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: PlusCircle, room: 'Add', accent: '#00FFC8',
    title: 'Press a word, AI sets the entry',
    body: 'Definition, examples, synonyms, collocations and a memory trick, tuned to the register you pick.',
    visual: <Chips items={['Formal', 'Casual', 'Literary', 'Slang']} on={['Literary']} />,
  },
  {
    icon: BookOpen, room: 'Library', accent: '#7dd3fc',
    title: 'Every word, by memory strength',
    body: 'Filter by due, mastered or register and see which words are fading before they go.',
    visual: (
      <div className="space-y-1.5">
        {[['Strong memory', 92, 'hsl(var(--ease-strong))'], ['Getting familiar', 55, 'hsl(var(--ease-learning))'], ['Just met', 18, 'hsl(var(--ease-struggling))']].map(([l, v, c]) => (
          <div key={l as string} className="flex items-center gap-2 text-[10px] text-zinc-400">
            <span className="w-[92px] shrink-0">{l}</span>
            <span className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden"><span className="block h-full rounded-full" style={{ width: `${v}%`, background: c as string }} /></span>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Repeat, room: 'Review', accent: '#c4b5fd', span: 'lg:col-span-2',
    title: 'Six ways to meet each word',
    body: 'Reviews go beyond flip-and-rate. Words you struggle with get extra passes until they stick.',
    visual: <Chips items={['Recall battle', 'Context', 'Collocation Forge', 'Synonyms', 'Memory trick', 'Your sentence']} on={['Recall battle', 'Collocation Forge']} accent="#c4b5fd" />,
  },
  {
    icon: BookMarked, room: 'Dictionary', accent: '#00FFC8', span: 'lg:col-span-2',
    title: 'Oxford & IELTS word lists',
    body: 'Browse curated lists by CEFR level, letter and part of speech, and add any word in one tap.',
    visual: (
      <div className="flex flex-wrap items-center gap-1.5">
        {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(l => (
          <span key={l} className="h-8 w-9 grid place-items-center rounded-lg text-[11px] font-bold" style={chip(l === 'C1')}>{l}</span>
        ))}
        <span className="ml-1 text-[10px] text-zinc-600 tracking-[0.3em]">A B C D E …</span>
      </div>
    ),
  },
  {
    icon: BarChart3, room: 'Progress', accent: '#7dd3fc',
    title: 'See your memory grow',
    body: 'Study calendar, words mastered, answer breakdown, upcoming reviews and your hardest words.',
    visual: (
      <div className="flex items-end gap-1 h-10">
        {[30, 55, 40, 72, 50, 90, 64].map((h, i) => (
          <span key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: i === 5 ? '#7dd3fc' : 'rgba(124,58,237,0.5)' }} />
        ))}
      </div>
    ),
  },
  {
    icon: Trophy, room: 'Achievements', accent: '#f0c96a',
    title: 'A trophy for every cleared day',
    body: 'Review everything due and a gold trophy lands on your calendar. Streaks build themselves.',
    visual: (
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 14 }, (_, i) => (
          <span key={i} className="aspect-square rounded-[4px]" style={{ background: [4, 10].includes(i) || i > 11 ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#f6dc94,#c8922a)' }} />
        ))}
      </div>
    ),
  },
  {
    icon: BookText, room: 'Grammar', accent: '#fbbf24',
    title: 'Grammar rules that click',
    body: 'Visual lessons like the “Lock & Key” for subject–verb agreement and a 3-question system for articles, each with drills.',
    visual: <Chips items={['Lock & Key', 'Replace Test', 'a / an / the']} on={['Lock & Key']} accent="#fbbf24" />,
  },
  {
    icon: Settings, room: 'Settings', accent: '#a1a1aa',
    title: 'Tune the algorithm',
    body: 'Set your retention target, how many new words a day and the pace that fits your life.',
    visual: (
      <div>
        <div className="flex justify-between text-[10px] text-zinc-500"><span>Retention target</span><span className="font-bold text-white">90%</span></div>
        <div className="mt-1.5 h-1.5 rounded-full bg-white/[0.06]"><div className="h-full w-[90%] rounded-full bg-[#00FFC8]" /></div>
        <div className="mt-3"><Chips items={['Relaxed', 'Standard', 'Focused']} on={['Standard']} /></div>
      </div>
    ),
  },
  {
    icon: Compass, room: 'Discover', accent: '#a78bfa',
    title: 'A fresh shuffle every day',
    body: 'A new handful of words each day from the Oxford and IELTS lists, with a daily discovery goal.',
    visual: (
      <div className="flex gap-1.5">
        {['candid', 'resilient', 'nuance'].map((w, i) => (
          <span key={w} className="rounded-xl px-2.5 py-2 text-[11px] font-semibold text-white" style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.25)', transform: `rotate(${(i - 1) * 4}deg)` }}>{w}</span>
        ))}
      </div>
    ),
  },
  {
    icon: PenLine, room: 'Writing Lab', accent: '#fbbf24', span: 'lg:col-span-2',
    title: 'IELTS writing with a coach that remembers',
    body: 'A fresh IELTS prompt every session, an optional 40-minute timed mode, and feedback that tracks your recurring mistakes.',
    visual: (
      <div className="flex items-center gap-3">
        <span className="font-display text-2xl font-bold tabular-nums text-[#fbbf24]">39:42</span>
        <span className="flex-1 rounded-xl px-3 py-2 text-[10px] text-zinc-400" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          Some people believe technology has made us <span className="text-[#00FFC8]">less sociable</span>…
        </span>
      </div>
    ),
  },
  {
    icon: Moon, room: 'Sleep Prep', accent: '#00FFC8',
    title: 'One last pass before bed',
    body: 'From 8 pm to 3 am a short sleep-prep review opens, while your brain is primed to consolidate.',
    visual: (
      <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold text-[#00FFC8]" style={{ background: 'rgba(0,255,200,0.08)', border: '1px solid rgba(0,255,200,0.3)', boxShadow: '0 0 18px rgba(0,255,200,0.18)' }}>
        <Moon className="h-3.5 w-3.5" /> Sleep Prep is open
      </span>
    ),
  },
];

/** The twelve rooms, paired into six panels so every strip has room for a readable label. */
type Group = { name: string; rooms: string[]; tiles: Tile[] };

const GROUPS: Group[] = [
  { name: 'Your day', rooms: ['Home', 'Sleep Prep'] },
  { name: 'Collect', rooms: ['Add', 'Discover'] },
  { name: 'Remember', rooms: ['Review', 'Library'] },
  { name: 'Explore', rooms: ['Dictionary', 'Grammar'] },
  { name: 'Grow', rooms: ['Progress', 'Achievements'] },
  { name: 'Practise', rooms: ['Writing Lab', 'Settings'] },
].map(g => ({ ...g, tiles: g.rooms.map(r => TILES.find(t => t.room === r)!) }));

const IconBadge = ({ t }: { t: Tile }) => (
  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${t.accent} 10%, transparent)`, boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${t.accent} 28%, transparent)` }}>
    <t.icon className="h-4 w-4" style={{ color: t.accent }} />
  </span>
);

function FeatureBlock({ t }: { t: Tile }) {
  return (
    <div className="flex-1 min-h-0 flex flex-col py-6 first:pt-0 last:pb-0">
      <div className="flex items-center gap-2.5">
        <IconBadge t={t} />
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">{t.room}</span>
      </div>
      <h3 className="mt-3.5 font-display text-xl font-bold leading-tight text-white">{t.title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{t.body}</p>
      <div className="mt-auto pt-4">{t.visual}</div>
    </div>
  );
}

function GroupPanel({ g, index }: { g: Group; index: number }) {
  const accent = g.tiles[0].accent;
  return (
    <article
      className="h-full w-full p-7 flex flex-col text-left divide-y divide-white/[0.07]"
      style={{
        background: `radial-gradient(ellipse 80% 45% at 0% 0%, color-mix(in srgb, ${accent} 13%, transparent) 0%, transparent 70%), linear-gradient(180deg, #121018 0%, #0a090d 100%)`,
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.1)',
        borderRadius: 'inherit',
      }}
      aria-label={`${String(index + 1).padStart(2, '0')} ${g.name}`}
    >
      {g.tiles.map(t => <FeatureBlock key={t.room} t={t} />)}
    </article>
  );
}

/** A closed panel: its number, its name and the two rooms inside, all set horizontally. */
function CollapsedStrip({ g, index, vertical }: { g: Group; index: number; vertical: boolean }) {
  const accent = g.tiles[0].accent;
  return (
    <span
      className={`flex h-full w-full ${vertical ? 'flex-row items-center gap-4 px-5' : 'flex-col justify-between p-4'}`}
      style={{
        background: `linear-gradient(${vertical ? '90deg' : '180deg'}, color-mix(in srgb, ${accent} 8%, #0e0c13) 0%, #0a090d 100%)`,
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
      }}
    >
      <span className="font-display text-xs font-bold tabular-nums text-zinc-600">{String(index + 1).padStart(2, '0')}</span>
      <span className={`flex ${vertical ? 'flex-1 items-center justify-between gap-3' : 'flex-col gap-3'}`}>
        <span className="font-display text-base font-bold text-white leading-tight">{g.name}</span>
        <span className={`flex ${vertical ? 'gap-2' : 'flex-col gap-2'}`}>
          {g.tiles.map(t => (
            <span key={t.room} className="flex items-center gap-1.5 text-[11px] font-medium leading-tight text-zinc-400">
              <t.icon className="h-3.5 w-3.5 shrink-0" style={{ color: t.accent }} />
              {!vertical && t.room}
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}

function useNarrow() {
  const query = '(max-width: 767px)';
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setNarrow(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return narrow;
}

export function FeatureAccordion() {
  const narrow = useNarrow();
  const items = useMemo(
    () => GROUPS.map((g, i) => ({
      label: `${g.name}: ${g.rooms.join(' and ')}`,
      content: <GroupPanel g={g} index={i} />,
      collapsed: <CollapsedStrip g={g} index={i} vertical={narrow} />,
    })),
    [narrow]
  );

  return (
    <AccordionGallery
      key={narrow ? 'v' : 'h'}
      items={items}
      ariaLabel="LexCore features"
      orientation={narrow ? 'vertical' : 'horizontal'}
      defaultIndex={0}
      height={narrow ? 600 : 500}
      expandRatio={narrow ? 0.62 : 0.5}
      gap={10}
      radius={24}
      accentColor="#00FFC8"
      overlayColor="#07060a"
      tilt={narrow ? 0 : 8}
      duration={0.6}
      ease="power3.out"
      trigger="hover"
      showLabels={false}
      grayscale={false}
    />
  );
}
