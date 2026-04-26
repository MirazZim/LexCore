import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronDown, Check } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import oxfordWordsRaw from '@/data/oxford_words.json';

type OxfordWord = { word: string; cefr: string; pos: string };
const ALL_WORDS = oxfordWordsRaw as OxfordWord[];

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
type CefrLevel = (typeof CEFR_LEVELS)[number];

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const POS_OPTIONS = ['All', ...Array.from(new Set(ALL_WORDS.map(w => w.pos))).sort()];

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

export default function DictionaryPage() {
  const navigate    = useNavigate();
  const alphabetRef = useRef<HTMLDivElement>(null);

  const [cefr, setCefr]       = useState<CefrLevel>('A1');
  const [letter, setLetter]   = useState<string | null>(null);
  const [pos, setPos]         = useState<string | null>(null);
  const [posOpen, setPosOpen] = useState(false);
  const [search, setSearch]   = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return ALL_WORDS.filter(w => {
      // CEFR only applies when not searching
      if (!q && w.cefr !== cefr) return false;
      if (letter && !w.word.toLowerCase().startsWith(letter.toLowerCase())) return false;
      if (pos && w.pos !== pos) return false;
      if (q && !w.word.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [cefr, letter, pos, search]);

  const handleAlphabetWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!alphabetRef.current) return;
    e.preventDefault();
    alphabetRef.current.scrollLeft += e.deltaY;
  };

  return (
    <AppLayout>
      <style>{`
        .dict-glass {
          background: rgba(24,24,27,0.55);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.05);
        }
        .dict-glass:hover { border-color: rgba(0,255,200,0.25); }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { scrollbar-width: none; }
      `}</style>

      <div
        className="px-4 pt-4 flex flex-col max-w-4xl mx-auto"
        style={{ height: 'calc(100vh - 96px)' }}
      >
        {/* ── Header ─────────────────────────────────────── */}
        <div className="shrink-0 mb-4">
          <h1
            className="text-3xl font-bold text-white leading-none"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Dictionary
          </h1>
          <p className="text-zinc-500 text-xs mt-1">Oxford 3000 · {filtered.length} words</p>
        </div>

        {/* ── CEFR row + POS dropdown ────────────────────── */}
        <div className="flex items-center gap-2 mb-3 shrink-0">
          {/* CEFR pills — scrollable */}
          <div className="flex-1 flex gap-2 overflow-x-auto scrollbar-hide">
            {CEFR_LEVELS.map(level => (
              <button
                key={level}
                onClick={() => setCefr(level)}
                className="shrink-0 px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all"
                style={cefr === level ? activeStyle : inactiveStyle}
              >
                {level}
              </button>
            ))}
          </div>

          {/* POS dropdown button — pinned to the right */}
          <div className="relative shrink-0">
            <button
              onClick={() => setPosOpen(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all"
              style={pos ? activeStyle : inactiveStyle}
            >
              <span>{pos ?? 'POS'}</span>
              <ChevronDown
                className="h-3 w-3 transition-transform"
                style={{ transform: posOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>

            {posOpen && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setPosOpen(false)}
                />
                {/* Dropdown panel */}
                <div
                  className="absolute right-0 top-full mt-2 z-20 rounded-2xl overflow-hidden py-1.5"
                  style={{
                    background: 'rgba(18,18,20,0.97)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(24px)',
                    minWidth: '140px',
                    boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
                  }}
                >
                  {POS_OPTIONS.map(option => {
                    const isActive = option === 'All' ? pos === null : pos === option;
                    return (
                      <button
                        key={option}
                        onClick={() => {
                          setPos(option === 'All' ? null : option);
                          setPosOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold capitalize transition-colors"
                        style={{
                          color: isActive ? '#00FFC8' : '#a1a1aa',
                          background: isActive ? 'rgba(0,255,200,0.07)' : 'transparent',
                        }}
                        onMouseEnter={e => {
                          if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)';
                        }}
                        onMouseLeave={e => {
                          if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                        }}
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
        </div>

        {/* ── Search ─────────────────────────────────────── */}
        <div className="relative shrink-0 mb-3">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
          <input
            placeholder={`Search ${cefr} words…`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-11 pl-11 pr-4 rounded-full bg-zinc-900/60 border border-white/5 text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#00FFC8]/40 transition-colors"
          />
        </div>

        {/* ── Alphabet row ───────────────────────────────── */}
        <div
          ref={alphabetRef}
          onWheel={handleAlphabetWheel}
          className="flex gap-1.5 overflow-x-auto scrollbar-hide mb-3 shrink-0"
        >
          <button
            onClick={() => setLetter(null)}
            className="shrink-0 px-3 h-8 rounded-full text-[10px] font-bold transition-all"
            style={letter === null ? activeStyle : inactiveStyle}
          >
            All
          </button>
          {ALPHABET.map(l => (
            <button
              key={l}
              onClick={() => setLetter(letter === l ? null : l)}
              className="shrink-0 w-8 h-8 rounded-full text-[10px] font-bold transition-all"
              style={letter === l ? activeStyle : inactiveStyle}
            >
              {l}
            </button>
          ))}
        </div>

        {/* ── Word list ──────────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide pb-4">
          {filtered.length === 0 ? (
            <div className="dict-glass rounded-2xl p-12 text-center">
              <p className="text-white font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                No words found
              </p>
              <p className="text-zinc-500 text-xs mt-1">Try a different filter or search</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {filtered.map((w, i) => (
                <button
                  key={`${w.word}-${i}`}
                  onClick={() => navigate(`/add?word=${encodeURIComponent(w.word)}`)}
                  className="dict-glass rounded-2xl p-4 flex flex-col items-start text-left transition-all"
                >
                  {/* Accent bar */}
                  <div
                    style={{
                      width: '22px',
                      height: '2px',
                      background: 'linear-gradient(90deg, #00FFC8, rgba(0,255,200,0.3))',
                      borderRadius: '1px',
                      marginBottom: '10px',
                    }}
                  />
                  {/* Word */}
                  <span
                    className="font-bold text-white text-sm leading-snug break-words w-full"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {w.word}
                  </span>
                  {/* Badges */}
                  <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                    {search && (
                      <span
                        className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
                        style={{ background: 'rgba(0,255,200,0.1)', color: '#00FFC8' }}
                      >
                        {w.cefr}
                      </span>
                    )}
                    <span
                      className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
                      style={{ background: 'rgba(255,255,255,0.05)', color: '#71717a' }}
                    >
                      {w.pos}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
