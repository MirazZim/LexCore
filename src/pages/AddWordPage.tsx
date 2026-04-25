import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ArrowLeft, X, Sparkles, Loader2, Briefcase, MessageCircle, Sun, GraduationCap, BookPlus, RotateCcw, Zap } from 'lucide-react';
import { useAddWord } from '@/hooks/useWords';
import { generateDefinition, generateExampleSentences, generateCollocations, generateWord, generateSynonyms } from '@/lib/llm';
import type { GenerationStyle } from '@/lib/llm';
import type { Register } from '@/lib/types';

const registers: { value: Register; label: string; emoji: string }[] = [
  { value: 'formal',   label: 'Formal',   emoji: '🎩' },
  { value: 'casual',   label: 'Casual',   emoji: '👋' },
  { value: 'literary', label: 'Literary', emoji: '📖' },
  { value: 'slang',    label: 'Slang',    emoji: '🔥' },
];

const generationStyles: {
  value: GenerationStyle;
  label: string;
  desc: string;
  icon: React.ElementType;
}[] = [
  { value: 'formal', label: 'Formal', desc: 'Business & academic', icon: Briefcase },
  { value: 'casual', label: 'Casual', desc: 'Friendly talk',       icon: MessageCircle },
  { value: 'daily',  label: 'Daily',  desc: 'Everyday life',       icon: Sun },
  { value: 'ielts',  label: 'IELTS',  desc: 'Band 7–9',            icon: GraduationCap },
];

const container = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 18 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] as const } },
};

export default function AddWordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [word, setWord]                         = useState(() => searchParams.get('word') ?? '');
  const [definition, setDefinition]             = useState('');
  const [exampleSentence, setExampleSentence]   = useState('');
  const [collocations, setCollocations]         = useState<string[]>([]);
  const [collocationInput, setCollocationInput] = useState('');
  const [register, setRegister]                 = useState<Register>('formal');
  const [generationStyle, setGenerationStyle]   = useState<GenerationStyle>('daily');
  const [suggestedWords, setSuggestedWords]     = useState<string[]>([]);
  const [loadingWord, setLoadingWord]           = useState(false);
  const [loadingDefinition, setLoadingDefinition]     = useState(false);
  const [loadingExample, setLoadingExample]           = useState(false);
  const [loadingCollocations, setLoadingCollocations] = useState(false);
  const [synonyms, setSynonyms]                       = useState<string[]>([]);
  const [synonymInput, setSynonymInput]               = useState('');
  const [loadingSynonyms, setLoadingSynonyms]         = useState(false);
  const [loadingAutofill, setLoadingAutofill]         = useState(false);
  const addWord = useAddWord();

  const handleSuggestWord = async () => {
    setLoadingWord(true);
    try {
      const suggested = await generateWord(word.trim(), generationStyle, suggestedWords);
      setWord(suggested); setSuggestedWords(p => [...p, suggested]);
      toast.success('Word suggested!');
    } catch { toast.error('Failed to suggest word'); }
    finally { setLoadingWord(false); }
  };

  const handleStyleSelect = async (style: GenerationStyle) => {
    setGenerationStyle(style); setLoadingWord(true);
    try {
      const suggested = await generateWord(word.trim(), style, suggestedWords);
      setWord(suggested); setSuggestedWords(p => [...p, suggested]);
      toast.success('Word suggested!');
    } catch { toast.error('Failed to suggest word'); }
    finally { setLoadingWord(false); }
  };

  const handleAutoDefinition = async () => {
    if (!word.trim()) { toast.error('Enter a word first'); return; }
    setLoadingDefinition(true);
    try {
      const r = await generateDefinition(word.trim(), generationStyle, definition);
      setDefinition(r.definition); toast.success('Definition generated!');
    } catch { toast.error('Failed to generate definition'); }
    finally { setLoadingDefinition(false); }
  };

  const handleAutoExample = async () => {
    if (!word.trim())       { toast.error('Enter a word first'); return; }
    if (!definition.trim()) { toast.error('Add a definition first'); return; }
    setLoadingExample(true);
    try {
      const s = await generateExampleSentences(word.trim(), definition.trim(), generationStyle, exampleSentence ? [exampleSentence] : []);
      setExampleSentence(s[0]); toast.success('Example generated!');
    } catch { toast.error('Failed to generate example'); }
    finally { setLoadingExample(false); }
  };

  const addSynonym = () => {
    const t = synonymInput.trim();
    if (t && !synonyms.includes(t)) { setSynonyms(p => [...p, t]); setSynonymInput(''); }
  };

  const handleAutoSynonyms = async () => {
    if (!word.trim())       { toast.error('Enter a word first'); return; }
    if (!definition.trim()) { toast.error('Add a definition first'); return; }
    setLoadingSynonyms(true);
    try {
      setSynonyms(await generateSynonyms(word.trim(), definition.trim(), generationStyle, synonyms));
      toast.success('Synonyms generated!');
    } catch { toast.error('Failed to generate synonyms'); }
    finally { setLoadingSynonyms(false); }
  };

  const handleAutofillAll = async () => {
    if (!word.trim()) { toast.error('Enter a word first'); return; }
    setLoadingAutofill(true);
    try {
      const result = await generateDefinition(word.trim(), generationStyle);
      setDefinition(result.definition);
      const [sentences, syns, cols] = await Promise.all([
        generateExampleSentences(word.trim(), result.definition, generationStyle),
        generateSynonyms(word.trim(), result.definition, generationStyle),
        generateCollocations(word.trim(), result.definition, generationStyle),
      ]);
      setExampleSentence(sentences[0]); setSynonyms(syns); setCollocations(cols);
      toast.success('All fields filled!');
    } catch { toast.error('Autofill failed'); }
    finally { setLoadingAutofill(false); }
  };

  const handleAutoCollocations = async () => {
    if (!word.trim())       { toast.error('Enter a word first'); return; }
    if (!definition.trim()) { toast.error('Add a definition first'); return; }
    setLoadingCollocations(true);
    try {
      const results = await generateCollocations(word.trim(), definition.trim(), generationStyle, collocations);
      setCollocations(p => [...p, ...results.filter(c => !p.includes(c))]);
      toast.success('Collocations generated!');
    } catch { toast.error('Failed to generate collocations'); }
    finally { setLoadingCollocations(false); }
  };

  const addCollocation = () => {
    const t = collocationInput.trim();
    if (t && !collocations.includes(t)) { setCollocations(p => [...p, t]); setCollocationInput(''); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim() || !definition.trim()) return;
    try {
      await addWord.mutateAsync({
        word: word.trim(), definition: definition.trim(),
        example_sentence: exampleSentence.trim() || undefined,
        register, collocations, synonyms,
      });
      toast.success(`"${word}" added to your library!`, {
        action: { label: 'Go to Library', onClick: () => navigate('/library') },
      });
      setWord(''); setDefinition(''); setExampleSentence('');
      setCollocations([]); setCollocationInput('');
      setSynonyms([]); setSynonymInput(''); setSuggestedWords([]);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save word');
    }
  };

  return (
    <AppLayout>
      <style>{`
        .aw-input {
          width: 100%;
          background: rgba(255,255,255,.03);
          border: 1.5px solid rgba(255,255,255,.07);
          border-radius: 12px;
          padding: 11px 14px;
          color: #fff;
          font-size: .9rem;
          outline: none;
          transition: border-color .18s, background .18s;
          font-family: inherit;
        }
        .aw-input::placeholder { color: #3f3f46; }
        .aw-input:focus { border-color: rgba(0,255,200,.45); background: rgba(0,255,200,.025); }

        .aw-word-input {
          width: 100%;
          background: transparent;
          border: none;
          border-bottom: 2px solid rgba(255,255,255,.08);
          padding: 6px 2px 10px;
          color: #fff;
          font-size: 1.6rem;
          font-weight: 700;
          letter-spacing: -.02em;
          outline: none;
          transition: border-color .18s;
          font-family: 'Space Grotesk', sans-serif;
        }
        .aw-word-input::placeholder { color: #27272a; }
        .aw-word-input:focus { border-color: rgba(0,255,200,.5); }

        .aw-textarea {
          width: 100%;
          background: rgba(255,255,255,.03);
          border: 1.5px solid rgba(255,255,255,.07);
          border-radius: 12px;
          padding: 12px 14px;
          color: #fff;
          font-size: .9rem;
          outline: none;
          resize: none;
          min-height: 88px;
          transition: border-color .18s, background .18s;
          font-family: inherit;
          line-height: 1.65;
        }
        .aw-textarea::placeholder { color: #3f3f46; }
        .aw-textarea:focus { border-color: rgba(0,255,200,.45); background: rgba(0,255,200,.025); }

        @media (min-width: 1024px) {
          .aw-textarea { min-height: 0 !important; flex: 1 !important; }
        }

        .aw-card {
          background: rgba(255,255,255,.025);
          border: 1px solid rgba(255,255,255,.055);
          border-radius: 20px;
          padding: 18px;
        }

        .retry-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: .68rem;
          font-weight: 700;
          letter-spacing: .03em;
          color: #52525b;
          padding: 4px 10px;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,.07);
          background: rgba(255,255,255,.03);
          transition: all .15s;
          white-space: nowrap;
        }
        .retry-btn:not(:disabled):hover { color: #00FFC8; border-color: rgba(0,255,200,.3); background: rgba(0,255,200,.07); }
        .retry-btn:disabled { opacity: .28; cursor: not-allowed; }

        .clear-btn { font-size: .67rem; font-weight: 700; letter-spacing: .02em; color: #3f3f46; transition: color .15s; }
        .clear-btn:hover { color: #f87171; }

        .slabel { font-size: .62rem; font-weight: 900; letter-spacing: .14em; text-transform: uppercase; color: #52525b; }
      `}</style>

      {/*
        Mobile  : normal scroll, single column
        Desktop : fixed viewport height, 2-column, no scroll
      */}
      <div className="
        px-4 pt-4 pb-32 max-w-lg mx-auto
        lg:pb-5 lg:max-w-6xl lg:h-[calc(100dvh-6rem)] lg:overflow-hidden lg:flex lg:flex-col
      ">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-3 lg:flex-1 lg:min-h-0"
        >

          {/* ── Header ─────────────────────────────────────── */}
          <motion.div variants={item} className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors hover:bg-white/10"
              style={{ background: 'rgba(255,255,255,.05)' }}
            >
              <ArrowLeft className="h-4 w-4 text-zinc-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white leading-none tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Add Word
              </h1>
              <p className="text-zinc-600 text-xs mt-0.5">Build your vocabulary</p>
            </div>
          </motion.div>

          {/* ── Form ───────────────────────────────────────── */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 lg:flex-1 lg:min-h-0">

            {/* 2-col on desktop, stacked on mobile */}
            <div className="flex flex-col gap-3 lg:flex-row lg:gap-3 lg:flex-1 lg:min-h-0">

              {/* ── LEFT COLUMN ────────────────────────────── */}
              <div className="flex flex-col gap-3 lg:gap-2 lg:flex-1 lg:min-h-0">

                {/* Word */}
                <motion.div variants={item} className="aw-card flex flex-col gap-4 lg:gap-2 flex-shrink-0 lg:p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="slabel">Word</span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-bold"
                        style={{ background: 'rgba(0,255,200,.08)', color: '#00FFC8', border: '1px solid rgba(0,255,200,.18)' }}>
                        Start here
                      </span>
                    </div>
                    <button type="button" onClick={handleSuggestWord} disabled={loadingWord} className="retry-btn">
                      {loadingWord ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      {loadingWord ? 'Finding…' : 'Surprise me'}
                    </button>
                  </div>

                  <input
                    className="aw-word-input"
                    placeholder="Enter a word…"
                    value={word}
                    onChange={e => setWord(e.target.value)}
                    required
                  />

                  <div className="grid grid-cols-4 gap-2">
                    {generationStyles.map(({ value, label, desc, icon: Icon }) => {
                      const active = generationStyle === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          disabled={loadingWord}
                          onClick={() => handleStyleSelect(value)}
                          className="flex flex-col items-center gap-1 py-3 lg:py-2 rounded-2xl transition-all disabled:opacity-40"
                          style={{
                            background: active ? 'rgba(0,255,200,.09)' : 'rgba(255,255,255,.025)',
                            border: `1.5px solid ${active ? 'rgba(0,255,200,.3)' : 'rgba(255,255,255,.05)'}`,
                          }}
                        >
                          <Icon className="h-3.5 w-3.5" style={{ color: active ? '#00FFC8' : '#3f3f46' }} />
                          <span className="text-[10px] font-bold leading-none" style={{ color: active ? '#00FFC8' : '#52525b' }}>{label}</span>
                          {/* Hide description on desktop to save vertical space */}
                          <span className="text-[8.5px] leading-tight text-center px-1 lg:hidden" style={{ color: active ? 'rgba(0,255,200,.55)' : '#27272a' }}>{desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>

                {/* Autofill hero */}
                <motion.div variants={item} className="flex-shrink-0">
                  <button
                    type="button"
                    onClick={handleAutofillAll}
                    disabled={loadingAutofill || !word.trim()}
                    className="w-full flex items-center justify-center gap-2.5 py-3 lg:py-2.5 rounded-2xl font-bold text-sm transition-all disabled:opacity-35 hover:scale-[1.01] active:scale-[.99]"
                    style={{
                      background: 'linear-gradient(135deg, rgba(0,255,200,.12) 0%, rgba(139,92,246,.12) 100%)',
                      border: '1.5px solid rgba(0,255,200,.2)',
                      color: '#00FFC8',
                    }}
                  >
                    {loadingAutofill
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Zap className="h-4 w-4" style={{ color: '#a78bfa' }} />}
                    <span>
                      {loadingAutofill
                        ? 'Filling everything…'
                        : <><span style={{ color: '#a78bfa' }}>Autofill</span> all fields at once</>}
                    </span>
                  </button>
                </motion.div>

                {/* Definition */}
                <motion.div variants={item} className="aw-card flex flex-col gap-3 lg:flex-1 lg:min-h-0">
                  <div className="flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="slabel">Definition</span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-bold"
                        style={{ background: 'rgba(0,255,200,.08)', color: '#00FFC8', border: '1px solid rgba(0,255,200,.18)' }}>
                        Required
                      </span>
                    </div>
                    <button type="button" onClick={handleAutoDefinition}
                      disabled={loadingDefinition || loadingAutofill || !word.trim()} className="retry-btn">
                      {loadingDefinition ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                      {loadingDefinition ? 'Retrying…' : 'Try Again'}
                    </button>
                  </div>
                  <textarea className="aw-textarea" placeholder="What does this word mean?"
                    value={definition} onChange={e => setDefinition(e.target.value)} required />
                </motion.div>

                {/* Example */}
                <motion.div variants={item} className="aw-card flex flex-col gap-3 lg:flex-1 lg:min-h-0">
                  <div className="flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="slabel">Example</span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-bold"
                        style={{ background: 'rgba(255,255,255,.04)', color: '#52525b', border: '1px solid rgba(255,255,255,.07)' }}>
                        Optional
                      </span>
                    </div>
                    <button type="button" onClick={handleAutoExample}
                      disabled={loadingExample || loadingAutofill || !word.trim() || !definition.trim()} className="retry-btn">
                      {loadingExample ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                      {loadingExample ? 'Retrying…' : 'Try Again'}
                    </button>
                  </div>
                  <textarea className="aw-textarea" placeholder="Use it in a sentence…"
                    value={exampleSentence} onChange={e => setExampleSentence(e.target.value)} />
                </motion.div>

              </div>{/* /LEFT */}

              {/* ── RIGHT COLUMN ───────────────────────────── */}
              <div className="flex flex-col gap-3 lg:gap-2 lg:flex-1 lg:min-h-0">

                {/* Collocations */}
                <motion.div variants={item} className="aw-card flex flex-col gap-3 lg:flex-1 lg:min-h-0">
                  <div className="flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="slabel">Collocations</span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-bold"
                        style={{ background: 'rgba(255,255,255,.04)', color: '#52525b', border: '1px solid rgba(255,255,255,.07)' }}>
                        Optional
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {collocations.length > 0 && (
                        <button type="button" onClick={() => setCollocations([])} className="clear-btn">Clear all</button>
                      )}
                      <button type="button" onClick={handleAutoCollocations}
                        disabled={loadingCollocations || loadingAutofill || !word.trim() || !definition.trim()} className="retry-btn">
                        {loadingCollocations ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                        {loadingCollocations ? 'Retrying…' : 'Try Again'}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <input className="aw-input" placeholder="e.g., make an effort"
                      value={collocationInput} onChange={e => setCollocationInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCollocation(); } }} />
                    <button type="button" onClick={addCollocation} disabled={!collocationInput.trim()}
                      className="shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-900 disabled:opacity-30 transition-all"
                      style={{ background: 'linear-gradient(135deg,#fdba74,#fb923c)' }}>
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 lg:overflow-y-auto lg:flex-1 lg:min-h-0 lg:content-start">
                    {collocations.length === 0
                      ? <span className="text-xs text-zinc-700">Common word pairings will appear here</span>
                      : collocations.map((c, i) => (
                          <span key={i} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold h-fit"
                            style={{ background: 'rgba(251,146,60,.1)', border: '1px solid rgba(251,146,60,.22)', color: '#fb923c' }}>
                            {c}
                            <button type="button" onClick={() => setCollocations(p => p.filter((_, j) => j !== i))}
                              className="opacity-40 hover:opacity-100 transition-opacity">
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))
                    }
                  </div>
                </motion.div>

                {/* Synonyms */}
                <motion.div variants={item} className="aw-card flex flex-col gap-3 lg:flex-1 lg:min-h-0">
                  <div className="flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="slabel">Synonyms</span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-bold"
                        style={{ background: 'rgba(255,255,255,.04)', color: '#52525b', border: '1px solid rgba(255,255,255,.07)' }}>
                        Optional
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {synonyms.length > 0 && (
                        <button type="button" onClick={() => setSynonyms([])} className="clear-btn">Clear all</button>
                      )}
                      <button type="button" onClick={handleAutoSynonyms}
                        disabled={loadingSynonyms || loadingAutofill || !word.trim() || !definition.trim()} className="retry-btn">
                        {loadingSynonyms ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                        {loadingSynonyms ? 'Retrying…' : 'Try Again'}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <input className="aw-input" placeholder="e.g., happy, glad"
                      value={synonymInput} onChange={e => setSynonymInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSynonym(); } }} />
                    <button type="button" onClick={addSynonym} disabled={!synonymInput.trim()}
                      className="shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-900 disabled:opacity-30 transition-all"
                      style={{ background: 'linear-gradient(135deg,#c4b5fd,#a78bfa)' }}>
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 lg:overflow-y-auto lg:flex-1 lg:min-h-0 lg:content-start">
                    {synonyms.length === 0
                      ? <span className="text-xs text-zinc-700">Words with similar meaning will appear here</span>
                      : synonyms.map((s, i) => (
                          <span key={i} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold h-fit"
                            style={{ background: 'rgba(139,92,246,.1)', border: '1px solid rgba(139,92,246,.25)', color: '#a78bfa' }}>
                            {s}
                            <button type="button" onClick={() => setSynonyms(p => p.filter((_, j) => j !== i))}
                              className="opacity-40 hover:opacity-100 transition-opacity">
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))
                    }
                  </div>
                </motion.div>

                {/* Register */}
                <motion.div variants={item} className="aw-card flex flex-col gap-3 flex-shrink-0">
                  <span className="slabel">Register</span>
                  <div className="grid grid-cols-4 gap-2">
                    {registers.map(r => (
                      <button key={r.value} type="button" onClick={() => setRegister(r.value)}
                        className={cn('flex flex-col items-center gap-1.5 py-3 rounded-2xl text-xs font-bold transition-all')}
                        style={
                          register === r.value
                            ? { background: 'rgba(0,255,200,.09)', color: '#00FFC8', border: '1.5px solid rgba(0,255,200,.3)' }
                            : { background: 'rgba(255,255,255,.025)', color: '#3f3f46', border: '1.5px solid rgba(255,255,255,.05)' }
                        }>
                        <span className="text-base leading-none">{r.emoji}</span>
                        {r.label}
                      </button>
                    ))}
                  </div>
                </motion.div>

                {/* Save */}
                <motion.div variants={item} className="flex-shrink-0">
                  <button
                    type="submit"
                    disabled={addWord.isPending || !word.trim() || !definition.trim()}
                    className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-bold text-base text-zinc-900 disabled:opacity-40 transition-all hover:scale-[1.01] active:scale-[.99]"
                    style={{
                      background: 'linear-gradient(135deg,#2cffca 0%,#00FFC8 100%)',
                      boxShadow: '0 0 36px rgba(0,255,200,.22)',
                    }}
                  >
                    {addWord.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <BookPlus className="h-5 w-5" />}
                    {addWord.isPending ? 'Saving…' : 'Save Word'}
                  </button>
                </motion.div>

              </div>{/* /RIGHT */}

            </div>{/* /2-col */}
          </form>
        </motion.div>
      </div>
    </AppLayout>
  );
}
