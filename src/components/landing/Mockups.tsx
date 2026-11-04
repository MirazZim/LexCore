import type { ReactNode } from 'react';
import { Check, Flame, Sparkles, Trophy } from 'lucide-react';

/* ─── Phone frame ───────────────────────────────────────────────── */
export function Phone({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`land-phone relative shrink-0 w-[220px] h-[450px] rounded-[2.6rem] p-[7px] ${className}`}>
      <div className="relative h-full w-full overflow-hidden rounded-[2.2rem] bg-[#08070b]">
        <div className="absolute top-2 left-1/2 -translate-x-1/2 h-[18px] w-[72px] rounded-full bg-black z-20" aria-hidden />
        <div className="flex items-center justify-between px-5 pt-2.5 text-[9px] font-semibold text-white/70">
          <span>9:41</span>
          <span className="flex gap-1 items-center">
            <span className="h-1.5 w-3 rounded-sm bg-white/70" />
          </span>
        </div>
        <div className="px-3.5 pt-5 pb-4 h-[calc(100%-24px)] flex flex-col">{children}</div>
      </div>
    </div>
  );
}

const Eyebrow = ({ children, color = '#71717a' }: { children: ReactNode; color?: string }) => (
  <p className="text-[8px] font-bold uppercase tracking-[0.22em]" style={{ color }}>{children}</p>
);

/* ─── Screen: today's mission ───────────────────────────────────── */
export function MissionScreen() {
  return (
    <>
      <div className="flex items-center justify-between">
        <Eyebrow>Good morning · <span className="land-gold-text">Scholar</span></Eyebrow>
        <span className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] font-bold text-white"
          style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.3)' }}>
          <Flame className="h-2.5 w-2.5 text-orange-500" /> 23
        </span>
      </div>
      <Eyebrow color="#c8922a"><span className="block mt-4">Today&apos;s mission</span></Eyebrow>
      <p className="mt-1.5 font-display text-[19px] font-bold leading-[1.1] text-white">
        <span className="land-mint-text">14 words</span> stand between you and today&apos;s trophy.
      </p>
      <div className="mt-4 flex items-center">
        {['done', 'next', 'later'].map((s, i) => (
          <div key={s} className={`flex items-center ${i < 2 ? 'flex-1' : ''}`}>
            <span className="h-6 w-6 rounded-full grid place-items-center text-[9px] font-bold"
              style={s === 'done'
                ? { background: 'linear-gradient(135deg,#f6dc94,#c8922a)', color: '#3a2606' }
                : s === 'next'
                  ? { background: 'rgba(0,255,200,0.12)', color: '#00FFC8', border: '1.5px solid #00FFC8' }
                  : { color: '#71717a', border: '1.5px dashed rgba(255,255,255,0.14)' }}>
              {s === 'done' ? <Check className="h-3 w-3" strokeWidth={3} /> : 7}
            </span>
            {i < 2 && <span className="flex-1 h-[2px] mx-1 rounded-full" style={{ background: i === 0 ? '#c8922a' : 'rgba(255,255,255,0.08)' }} />}
          </div>
        ))}
      </div>
      <div className="relative mx-auto mt-5 h-[110px] w-[110px] grid place-items-center">
        <div className="absolute inset-0 rounded-full border border-dashed border-[#f0c96a]/25 land-spin" />
        <div className="absolute inset-4 rounded-full border border-dashed border-[#00FFC8]/20 land-spin-rev" />
        <Trophy className="h-10 w-10 text-[#f0c96a] drop-shadow-[0_0_12px_rgba(240,201,106,0.5)]" />
      </div>
      <button className="mt-auto w-full rounded-xl py-2.5 text-[11px] font-bold text-[#04110d]" style={{ background: '#00FFC8' }}>
        Start set 2 of 3
      </button>
    </>
  );
}

/* ─── Screen: review card ───────────────────────────────────────── */
export function ReviewScreen() {
  const ratings = [
    { label: 'Again', c: 'hsl(var(--quality-again))' },
    { label: 'Hard', c: 'hsl(var(--quality-hard))' },
    { label: 'Good', c: 'hsl(var(--quality-good))' },
    { label: 'Easy', c: 'hsl(var(--quality-easy))' },
  ];
  return (
    <>
      <div className="flex items-center gap-2">
        <div className="h-1 flex-1 rounded-full bg-white/[0.07] overflow-hidden">
          <div className="h-full w-[42%] rounded-full bg-[#00FFC8]" />
        </div>
        <span className="text-[8px] text-zinc-500 tabular-nums">3/7</span>
      </div>
      <div className="land-card mt-5 rounded-2xl p-3.5 flex-1 flex flex-col">
        <Eyebrow>Recall</Eyebrow>
        <p className="mt-3 font-display text-[26px] font-bold text-white tracking-tight">ephemeral</p>
        <p className="text-[9px] text-zinc-500 italic">/ɪˈfem(ə)rəl/ · adjective</p>
        <div className="mt-4 rounded-xl p-2.5 text-[10px] leading-relaxed text-zinc-300" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)' }}>
          Lasting for a very short time.
          <span className="block mt-1.5 text-zinc-500">“Fame in the age of feeds is <span className="text-[#00FFC8]">ephemeral</span>.”</span>
        </div>
        <div className="mt-auto flex gap-1.5">
          <span className="flex-1 rounded-lg py-1.5 text-center text-[8px] font-semibold text-zinc-300 border border-white/10">Sure</span>
          <span className="flex-1 rounded-lg py-1.5 text-center text-[8px] font-semibold text-zinc-500 border border-white/5">Unsure</span>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {ratings.map(r => (
          <span key={r.label} className="rounded-lg py-2 text-center text-[9px] font-bold"
            style={{ color: r.c, background: `color-mix(in srgb, ${r.c} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${r.c} 35%, transparent)` }}>
            {r.label}
          </span>
        ))}
      </div>
    </>
  );
}

/* ─── Screen: collocation forge ─────────────────────────────────── */
export function ForgeScreen() {
  const chips = ['make', 'take', 'reach', 'do'];
  return (
    <>
      <Eyebrow color="#f0c96a">Collocation Forge</Eyebrow>
      <p className="mt-1 text-[10px] text-zinc-500">Which verb does a native reach for?</p>
      <div className="land-card mt-4 rounded-2xl p-4 text-center">
        <p className="font-display text-[17px] font-bold text-white leading-snug">
          <span className="inline-block min-w-[46px] border-b-2 border-dashed border-[#00FFC8] text-[#00FFC8]">reach</span> a decision
        </p>
        <p className="mt-2 text-[9px] text-zinc-500">The board will ___ a decision by Friday.</p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {chips.map(c => (
          <span key={c} className="rounded-xl py-2.5 text-center text-[11px] font-semibold"
            style={c === 'reach'
              ? { color: '#04110d', background: '#00FFC8', boxShadow: '0 0 18px rgba(0,255,200,0.35)' }
              : { color: '#a1a1aa', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {c}
          </span>
        ))}
      </div>
      <div className="mt-auto rounded-xl p-2.5 text-[9px] leading-relaxed text-zinc-400" style={{ background: 'rgba(240,201,106,0.06)', border: '1px solid rgba(240,201,106,0.2)' }}>
        <span className="font-bold text-[#f0c96a]">Forged.</span> Also strong: <span className="text-zinc-200">come to</span> a decision.
      </div>
    </>
  );
}

/* ─── Screen: AI coach ──────────────────────────────────────────── */
export function CoachScreen() {
  return (
    <>
      <Eyebrow color="#c4b5fd">Writing Lab</Eyebrow>
      <p className="mt-1 text-[10px] text-zinc-500">Use <span className="text-white">“mitigate”</span> in a sentence</p>
      <div className="mt-4 self-end max-w-[85%] rounded-2xl rounded-br-md px-3 py-2 text-[10px] leading-relaxed text-white" style={{ background: 'hsl(var(--primary))' }}>
        We should mitigate against the risk early.
      </div>
      <div className="land-card mt-3 max-w-[92%] rounded-2xl rounded-bl-md px-3 py-2.5 text-[10px] leading-relaxed text-zinc-300">
        <span className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-[0.18em] text-[#00FFC8] mb-1">
          <Sparkles className="h-2.5 w-2.5" /> Coach
        </span>
        Close! <span className="line-through text-zinc-500">mitigate against</span> → <span className="text-[#00FFC8]">mitigate</span> the risk.
        It already means “reduce”, so it takes a direct object.
      </div>
      <div className="land-card mt-3 rounded-xl px-3 py-2 text-[9px] text-zinc-500">
        <span className="text-[#f0c96a] font-semibold">Remembered:</span> you often add “against” after transitive verbs.
      </div>
      <div className="mt-auto flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2">
        <span className="flex-1 text-[9px] text-zinc-600">Try again…</span>
        <span className="h-5 w-5 rounded-lg bg-[#00FFC8]" />
      </div>
    </>
  );
}

/* ─── Screen: add word (the Press) ──────────────────────────────── */
export function PressScreen() {
  const registers = [
    { label: 'Formal', on: true },
    { label: 'Casual', on: false },
    { label: 'Literary', on: false },
    { label: 'Slang', on: false },
  ];
  return (
    <>
      <Eyebrow color="#00FFC8">The Press</Eyebrow>
      <div className="land-card mt-3 rounded-2xl p-3.5">
        <p className="font-display text-[24px] font-bold text-white tracking-tight">meticulous</p>
        <p className="text-[9px] text-zinc-500 italic">adjective · C1</p>
        <div className="mt-3 flex flex-wrap gap-1">
          {registers.map(r => (
            <span key={r.label} className="rounded-full px-2 py-0.5 text-[8px] font-semibold"
              style={r.on
                ? { color: '#00FFC8', background: 'rgba(0,255,200,0.12)', border: '1px solid rgba(0,255,200,0.4)' }
                : { color: '#71717a', border: '1px solid rgba(255,255,255,0.08)' }}>
              {r.label}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-3 space-y-2 text-[9px] leading-relaxed">
        {[
          ['Definition', 'Showing great attention to detail; very careful.'],
          ['Synonyms', 'thorough · painstaking · scrupulous'],
          ['Collocations', 'meticulous attention · meticulously planned'],
          ['Memory trick', 'META-CULOUS: checks the meta-details.'],
        ].map(([k, v], i) => (
          <div key={k} className="rounded-xl px-2.5 py-2" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', opacity: 1 - i * 0.12 }}>
            <span className="block text-[7px] font-bold uppercase tracking-[0.18em] text-zinc-500">{k}</span>
            <span className="text-zinc-300">{v}</span>
          </div>
        ))}
      </div>
      <button className="mt-auto w-full rounded-xl py-2.5 text-[11px] font-bold text-[#3a2606]" style={{ background: 'linear-gradient(135deg,#f6dc94,#c8922a)' }}>
        Press into Library
      </button>
    </>
  );
}

/* ─── Screen: progress ──────────────────────────────────────────── */
export function ProgressScreen() {
  const bars = [38, 62, 45, 80, 54, 92, 70];
  const breakdown = [
    { l: 'Again', v: 8, c: 'hsl(var(--quality-again))' },
    { l: 'Hard', v: 14, c: 'hsl(var(--quality-hard))' },
    { l: 'Good', v: 52, c: 'hsl(var(--quality-good))' },
    { l: 'Easy', v: 26, c: 'hsl(var(--quality-easy))' },
  ];
  return (
    <>
      <Eyebrow>Progress</Eyebrow>
      <div className="mt-2 flex items-end justify-between">
        <p className="font-display text-[28px] font-bold leading-none land-mint-text">184</p>
        <p className="text-[9px] text-zinc-500 pb-1">words mastered</p>
      </div>
      <div className="land-card mt-3 rounded-2xl p-3">
        <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-zinc-500">Study activity</p>
        <div className="mt-2 flex items-end gap-1.5 h-[64px]">
          {bars.map((h, i) => (
            <span key={i} className="flex-1 rounded-md" style={{ height: `${h}%`, background: i === 5 ? '#00FFC8' : 'rgba(124,58,237,0.55)' }} />
          ))}
        </div>
      </div>
      <div className="land-card mt-3 rounded-2xl p-3">
        <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-zinc-500">Answer breakdown</p>
        <div className="mt-2 flex h-2 overflow-hidden rounded-full">
          {breakdown.map(b => <span key={b.l} style={{ width: `${b.v}%`, background: b.c }} />)}
        </div>
        <div className="mt-2 grid grid-cols-4 text-center text-[8px] text-zinc-500">
          {breakdown.map(b => <span key={b.l}><span className="block font-bold text-white text-[10px]">{b.v}%</span>{b.l}</span>)}
        </div>
      </div>
      <div className="land-card mt-3 rounded-2xl p-3">
        <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-zinc-500">Hardest words</p>
        {['ubiquitous', 'pragmatic'].map(w => (
          <p key={w} className="mt-1.5 flex justify-between text-[10px] text-zinc-300">{w}<span className="text-[hsl(var(--quality-again))]">struggling</span></p>
        ))}
      </div>
    </>
  );
}

/* ─── Screen: identity ladder ───────────────────────────────────── */
export function JourneyScreen() {
  return (
    <>
      <Eyebrow color="#c8922a">Your journey</Eyebrow>
      <div className="mt-3 rounded-2xl p-3 text-center" style={{ background: 'linear-gradient(180deg,#0d0a07,#110e0a)', border: '1px solid rgba(180,140,55,0.28)' }}>
        <img src="/Scholar.webp" alt="" className="mx-auto h-[120px] w-auto object-contain" loading="lazy" />
        <p className="mt-1 font-display text-[18px] font-bold land-gold-text">Scholar</p>
        <p className="text-[9px] text-zinc-500">Day 32 · 14 to Rhetorician</p>
        <div className="mt-2 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div className="h-full w-[46%] rounded-full" style={{ background: 'linear-gradient(90deg,#c8922a,#f0c96a)' }} />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1">
        {Array.from({ length: 21 }, (_, i) => (
          <span key={i} className="aspect-square rounded-[4px]"
            style={{ background: [3, 9, 15].includes(i) ? 'rgba(255,255,255,0.04)' : i > 17 ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg,#f6dc94,#c8922a)', opacity: i > 17 ? 1 : 0.55 + (i % 4) * 0.12 }} />
        ))}
      </div>
      <p className="mt-auto text-center text-[9px] text-zinc-500">One gold trophy for every day you clear.</p>
    </>
  );
}
