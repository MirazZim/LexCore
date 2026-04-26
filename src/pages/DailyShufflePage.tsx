import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Check, Shuffle, ArrowRight, Trophy, Brain, X, Zap, Minus, Plus } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import oxfordWordsRaw from '@/data/oxford_words.json';
import { useWords } from '@/hooks/useWords';
import { generatePOSTips } from '@/lib/llm';

type OxfordWord = { word: string; cefr: string; pos: string };
const ALL_WORDS = oxfordWordsRaw as OxfordWord[];

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
type CefrLevel = (typeof CEFR_LEVELS)[number];

const POS_OPTIONS = ['All', ...Array.from(new Set(ALL_WORDS.map(w => w.pos))).sort()];

// LCG seeded PRNG — deterministic for a given date
function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  const rand = seededRandom(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const d = new Date();
const TODAY_SEED = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
const DATE_LABEL = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

const activeStyle = {
  background: 'rgba(0,255,200,0.15)',
  color: '#00FFC8',
  border: '1px solid rgba(0,255,200,0.4)',
};
const inactiveStyle = {
  background: 'rgba(255,255,255,0.04)',
  color: '#71717a',
  border: '1px solid rgba(255,255,255,0.07)',
};

export default function DailyShufflePage() {
  const navigate = useNavigate();
  const [cefr, setCefr]         = useState<CefrLevel>('B1');
  const [pos, setPos]           = useState<string | null>(null);
  const [posOpen, setPosOpen]   = useState(false);
  const [page, setPage]         = useState(0);
  const [shuffleLimit, setShuffleLimit] = useState<number>(() => {
    const stored = localStorage.getItem('lexcore_shuffle_limit');
    return stored ? Math.max(1, Math.min(50, parseInt(stored, 10))) : 5;
  });

  const updateLimit = (val: number) => {
    const clamped = Math.max(1, Math.min(50, val));
    localStorage.setItem('lexcore_shuffle_limit', String(clamped));
    setShuffleLimit(clamped);
    setPage(0);
  };

  const { data: libraryWords } = useWords();
  const librarySet = useMemo(
    () => new Set((libraryWords ?? []).map(w => w.word.toLowerCase())),
    [libraryWords]
  );

  // Shuffle the full filtered pool once per CEFR/POS change, seeded by today
  const shuffledPool = useMemo(() => {
    const pool = ALL_WORDS.filter(w => {
      if (w.cefr !== cefr) return false;
      if (pos && w.pos !== pos) return false;
      return true;
    });
    return seededShuffle(pool, TODAY_SEED);
  }, [cefr, pos]);

  // Exclude already-conquered words
  const remaining = useMemo(
    () => shuffledPool.filter(w => !librarySet.has(w.word.toLowerCase())),
    [shuffledPool, librarySet]
  );

  const dailyWords = remaining.slice(page * shuffleLimit, page * shuffleLimit + shuffleLimit);
  const hasMore    = (page + 1) * shuffleLimit < remaining.length;

  type Tips = { headline: string; why: string; strategy: string; power_insight: string; focus_score: number };
  const [tipsOpen,    setTipsOpen]    = useState(false);
  const [tipsLoading, setTipsLoading] = useState(false);
  const [tips,        setTips]        = useState<Tips | null>(null);

  const openTips = async () => {
    setTipsOpen(true);
    if (tips) return; // already loaded for this session
    setTipsLoading(true);
    try {
      const result = await generatePOSTips(pos, cefr);
      setTips(result);
    } catch {
      setTips(null);
    } finally {
      setTipsLoading(false);
    }
  };

  // Reset tips when POS or CEFR changes so fresh insight is fetched
  const handleCefr = (level: CefrLevel) => { setCefr(level); setPage(0); setTips(null); };
  const handlePos  = (p: string | null)  => { setPos(p);     setPage(0); setTips(null); };

  return (
    <AppLayout>
      <style>{`
        .ds-glass {
          background: rgba(24,24,27,0.55);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.05);
        }
        .ds-glass:hover { border-color: rgba(0,255,200,0.25); }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { scrollbar-width: none; }
        @keyframes tips-slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes tips-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes scan-line {
          0%   { top: 0%; }
          100% { top: 100%; }
        }
        .tips-panel { animation: tips-slide-up 0.38s cubic-bezier(0.22,1,0.36,1) forwards; }
        .tips-content > * { animation: tips-fade-in 0.4s ease forwards; opacity: 0; }
        .tips-content > *:nth-child(1) { animation-delay: 0.15s; }
        .tips-content > *:nth-child(2) { animation-delay: 0.25s; }
        .tips-content > *:nth-child(3) { animation-delay: 0.35s; }
        .tips-content > *:nth-child(4) { animation-delay: 0.45s; }
        .scan-line {
          position: absolute; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(0,255,200,0.5), transparent);
          animation: scan-line 2s linear infinite;
        }
      `}</style>

      <div className="px-4 pt-4 flex flex-col max-w-2xl mx-auto" style={{ minHeight: 'calc(100vh - 96px)' }}>

        {/* ── Header ─────────────────────────────────────── */}
        <div className="shrink-0 mb-5">
          <div className="flex items-center justify-between mb-1">
            <h1
              className="text-3xl font-bold text-white leading-none"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Daily {shuffleLimit}
            </h1>
            <button
              onClick={openTips}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all hover:scale-105"
              style={{ background: 'rgba(139,92,246,0.12)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}
            >
              <Brain className="h-3 w-3" />
              Tips
            </button>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-zinc-500 text-xs">{DATE_LABEL} · {remaining.length} left</p>
          </div>
        </div>

        {/* ── Row 1: CEFR pills ─────────────────────────── */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-2.5 shrink-0">
          {CEFR_LEVELS.map(level => (
            <button
              key={level}
              onClick={() => handleCefr(level)}
              className="shrink-0 px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all"
              style={cefr === level ? activeStyle : inactiveStyle}
            >
              {level}
            </button>
          ))}
        </div>

        {/* ── Row 2: POS + word count stepper ──────────── */}
        <div className="flex items-center gap-2 mb-5 shrink-0">
          {/* POS dropdown */}
          <div className="relative flex-1">
            <button
              onClick={() => setPosOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all"
              style={pos ? activeStyle : inactiveStyle}
            >
              <span>{pos ? `Part of speech: ${pos}` : 'All parts of speech'}</span>
              <ChevronDown
                className="h-3 w-3 transition-transform shrink-0 ml-2"
                style={{ transform: posOpen ? 'rotate(180deg)' : 'none' }}
              />
            </button>

            {posOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setPosOpen(false)} />
                <div
                  className="absolute left-0 top-full mt-2 z-20 rounded-2xl overflow-hidden py-1.5"
                  style={{
                    background: 'rgba(18,18,20,0.97)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(24px)',
                    minWidth: '180px',
                    boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
                  }}
                >
                  {POS_OPTIONS.map(option => {
                    const isActive = option === 'All' ? pos === null : pos === option;
                    return (
                      <button
                        key={option}
                        onClick={() => { handlePos(option === 'All' ? null : option); setPosOpen(false); }}
                        className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold capitalize transition-colors"
                        style={{ color: isActive ? '#00FFC8' : '#a1a1aa', background: isActive ? 'rgba(0,255,200,0.07)' : 'transparent' }}
                        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; }}
                        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                      >
                        {option}
                        {isActive && <Check className="h-3 w-3" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Word count stepper */}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-full shrink-0"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <button
              onClick={() => updateLimit(shuffleLimit - 1)}
              disabled={shuffleLimit <= 1}
              className="flex items-center justify-center w-6 h-6 rounded-full transition-all disabled:opacity-30 hover:bg-white/10"
            >
              <Minus className="h-3 w-3 text-zinc-400" />
            </button>
            <span
              className="text-sm font-bold tabular-nums w-5 text-center"
              style={{ color: '#00FFC8' }}
            >
              {shuffleLimit}
            </span>
            <button
              onClick={() => updateLimit(shuffleLimit + 1)}
              disabled={shuffleLimit >= 50}
              className="flex items-center justify-center w-6 h-6 rounded-full transition-all disabled:opacity-30 hover:bg-white/10"
            >
              <Plus className="h-3 w-3 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* ── Word cards ────────────────────────────────── */}
        <div className="flex-1 space-y-3 pb-6">
          {dailyWords.length === 0 ? (
            <div className="ds-glass rounded-2xl p-16 text-center">
              <Trophy className="h-10 w-10 mx-auto mb-4" style={{ color: '#00FFC8' }} />
              <p
                className="text-white font-bold text-lg"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                All conquered!
              </p>
              <p className="text-zinc-500 text-sm mt-2">
                Try a different CEFR level or POS filter.
              </p>
            </div>
          ) : (
            <>
              {dailyWords.map((w, i) => (
                <button
                  key={`${w.word}-${i}`}
                  onClick={() => navigate(`/add?word=${encodeURIComponent(w.word)}`)}
                  className="ds-glass w-full rounded-2xl px-6 py-5 flex items-center justify-between text-left transition-all group"
                >
                  <div className="flex items-center gap-5">
                    {/* Position number */}
                    <span
                      className="text-2xl font-bold tabular-nums"
                      style={{ color: 'rgba(0,255,200,0.35)', fontFamily: "'Space Grotesk', sans-serif", minWidth: '28px' }}
                    >
                      {page * shuffleLimit + i + 1}
                    </span>
                    <div className="w-px h-9 rounded-full bg-zinc-800" />
                    <div>
                      <p
                        className="font-bold text-white text-xl leading-tight"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {w.word}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span
                          className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
                          style={{ background: 'rgba(0,255,200,0.1)', color: '#00FFC8' }}
                        >
                          {w.cefr}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
                          style={{ background: 'rgba(255,255,255,0.05)', color: '#71717a' }}
                        >
                          {w.pos}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 transition-all group-hover:translate-x-1"
                    style={{ color: '#3f3f46' }}
                    onMouseEnter={e => (e.currentTarget as SVGElement & { style: CSSStyleDeclaration }).style.color = '#00FFC8'}
                    onMouseLeave={e => (e.currentTarget as SVGElement & { style: CSSStyleDeclaration }).style.color = '#3f3f46'}
                  />
                </button>
              ))}

              {/* ── Pagination ──────────────────────────── */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setPage(p => p - 1)}
                  disabled={page === 0}
                  className="px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-25 disabled:cursor-not-allowed"
                  style={page > 0 ? inactiveStyle : { background: 'transparent', color: '#3f3f46', border: '1px solid transparent' }}
                >
                  ← Prev
                </button>
                <span className="text-zinc-600 text-[11px] font-bold tabular-nums">
                  {page * shuffleLimit + 1}–{Math.min(page * shuffleLimit + shuffleLimit, remaining.length)} of {remaining.length}
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={!hasMore}
                  className="px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-25 disabled:cursor-not-allowed"
                  style={hasMore ? activeStyle : { background: 'transparent', color: '#3f3f46', border: '1px solid transparent' }}
                >
                  Next 5 →
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Intelligence Tips Panel ───────────────────── */}
      {tipsOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            onClick={() => setTipsOpen(false)}
          />

          {/* Slide-up panel */}
          <div
            className="tips-panel fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden"
            style={{
              background: 'rgba(9,9,11,0.97)',
              border: '1px solid rgba(139,92,246,0.25)',
              borderBottom: 'none',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
          >
            {/* Scan line effect */}
            {tipsLoading && <div className="scan-line" />}

            {/* Panel header */}
            <div
              className="sticky top-0 flex items-center justify-between px-6 py-4"
              style={{ background: 'rgba(9,9,11,0.97)', borderBottom: '1px solid rgba(139,92,246,0.15)' }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="flex items-center justify-center w-7 h-7 rounded-lg"
                  style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}
                >
                  <Brain className="h-3.5 w-3.5" style={{ color: '#a78bfa' }} />
                </div>
                <div>
                  <p className="text-white text-xs font-bold uppercase tracking-widest">Intelligence Report</p>
                  <p className="text-zinc-600 text-[10px]">{pos ?? 'All POS'} · {cefr}</p>
                </div>
              </div>
              <button
                onClick={() => setTipsOpen(false)}
                className="flex items-center justify-center w-7 h-7 rounded-full transition-colors hover:bg-white/10"
              >
                <X className="h-4 w-4 text-zinc-500" />
              </button>
            </div>

            <div className="px-6 py-5">
              {tipsLoading ? (
                <div className="space-y-4 py-4">
                  {[80, 95, 65, 75].map((w, i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-2 rounded-full bg-zinc-800 animate-pulse" style={{ width: `${w}%` }} />
                      <div className="h-2 rounded-full bg-zinc-800 animate-pulse" style={{ width: `${w - 20}%` }} />
                    </div>
                  ))}
                </div>
              ) : tips ? (
                <div className="tips-content space-y-5">

                  {/* Headline + score */}
                  <div className="flex items-start justify-between gap-4">
                    <h2
                      className="text-xl font-bold text-white leading-snug"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {tips.headline}
                    </h2>
                    <div
                      className="shrink-0 flex flex-col items-center justify-center w-14 h-14 rounded-2xl"
                      style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)' }}
                    >
                      <span className="text-2xl font-bold" style={{ color: '#a78bfa', fontFamily: "'Space Grotesk', sans-serif" }}>
                        {tips.focus_score}
                      </span>
                      <span className="text-[9px] text-zinc-600 uppercase tracking-wider">/10</span>
                    </div>
                  </div>

                  {/* Why */}
                  <div
                    className="rounded-2xl p-4"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#a78bfa' }}>
                      Why This Matters
                    </p>
                    <p className="text-zinc-300 text-sm leading-relaxed">{tips.why}</p>
                  </div>

                  {/* Strategy */}
                  <div
                    className="rounded-2xl p-4"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#00FFC8' }}>
                      Optimal Strategy
                    </p>
                    <p className="text-zinc-300 text-sm leading-relaxed">{tips.strategy}</p>
                  </div>

                  {/* Power insight */}
                  <div
                    className="rounded-2xl p-4 relative overflow-hidden"
                    style={{ background: 'rgba(0,255,200,0.04)', border: '1px solid rgba(0,255,200,0.2)' }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-3 w-3" style={{ color: '#00FFC8' }} />
                      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#00FFC8' }}>
                        Power Insight
                      </p>
                    </div>
                    <p className="text-zinc-200 text-sm leading-relaxed font-medium">{tips.power_insight}</p>
                  </div>

                </div>
              ) : (
                <p className="text-zinc-500 text-sm text-center py-8">Failed to load. Try again.</p>
              )}
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}
