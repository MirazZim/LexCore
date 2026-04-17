import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ArrowLeft, X, Sparkles, Loader2, Briefcase, MessageCircle, Sun, GraduationCap, BookPlus } from 'lucide-react';
import { useAddWord } from '@/hooks/useWords';
import { generateDefinition, generateExampleSentences, generateCollocations, generateWord } from '@/lib/llm';
import type { GenerationStyle } from '@/lib/llm';
import type { Register } from '@/lib/types';

const registers: { value: Register; label: string }[] = [
  { value: 'formal',   label: 'Formal' },
  { value: 'casual',   label: 'Casual' },
  { value: 'literary', label: 'Literary' },
  { value: 'slang',    label: 'Slang' },
];

const generationStyles: {
  value: GenerationStyle;
  label: string;
  desc: string;
  icon: React.ElementType;
}[] = [
  { value: 'formal', label: 'Formal',     desc: 'Business & academic',   icon: Briefcase },
  { value: 'casual', label: 'Casual',     desc: 'Friendly conversation', icon: MessageCircle },
  { value: 'daily',  label: 'Daily',      desc: 'Everyday scenarios',    icon: Sun },
  { value: 'ielts',  label: 'IELTS',      desc: 'Band 7–9 academic',     icon: GraduationCap },
];

const container = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariant = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } },
};

export default function AddWordPage() {
  const navigate = useNavigate();
  const [word, setWord]                         = useState('');
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
  const addWord = useAddWord();

  // Generates instantly with current style — no second click needed
  const handleSuggestWord = async () => {
    setLoadingWord(true);
    try {
      const suggested = await generateWord(word.trim(), generationStyle, suggestedWords);
      setWord(suggested);
      setSuggestedWords(prev => [...prev, suggested]);
      toast.success('Word suggested!');
    } catch {
      toast.error('Failed to suggest word');
    } finally {
      setLoadingWord(false);
    }
  };

  // Selecting a style card immediately generates a word with that style
  const handleStyleSelect = async (style: GenerationStyle) => {
    setGenerationStyle(style);
    setLoadingWord(true);
    try {
      const suggested = await generateWord(word.trim(), style, suggestedWords);
      setWord(suggested);
      setSuggestedWords(prev => [...prev, suggested]);
      toast.success('Word suggested!');
    } catch {
      toast.error('Failed to suggest word');
    } finally {
      setLoadingWord(false);
    }
  };

  const handleAutoDefinition = async () => {
    if (!word.trim()) { toast.error('Enter a word first'); return; }
    setLoadingDefinition(true);
    try {
      const result = await generateDefinition(word.trim(), generationStyle);
      setDefinition(result.definition);
      toast.success('Definition generated!');
    } catch {
      toast.error('Failed to generate definition');
    } finally {
      setLoadingDefinition(false);
    }
  };

  const handleAutoExample = async () => {
    if (!word.trim())       { toast.error('Enter a word first'); return; }
    if (!definition.trim()) { toast.error('Add a definition first'); return; }
    setLoadingExample(true);
    try {
      const sentences = await generateExampleSentences(word.trim(), definition.trim(), generationStyle);
      setExampleSentence(sentences[0]);
      toast.success('Example generated!');
    } catch {
      toast.error('Failed to generate example');
    } finally {
      setLoadingExample(false);
    }
  };

  const handleAutoCollocations = async () => {
    if (!word.trim())       { toast.error('Enter a word first'); return; }
    if (!definition.trim()) { toast.error('Add a definition first'); return; }
    setLoadingCollocations(true);
    try {
      const results = await generateCollocations(word.trim(), definition.trim(), generationStyle);
      const unique  = results.filter(c => !collocations.includes(c));
      setCollocations(prev => [...prev, ...unique]);
      toast.success('Collocations generated!');
    } catch {
      toast.error('Failed to generate collocations');
    } finally {
      setLoadingCollocations(false);
    }
  };

  const addCollocation = () => {
    const trimmed = collocationInput.trim();
    if (trimmed && !collocations.includes(trimmed)) {
      setCollocations(prev => [...prev, trimmed]);
      setCollocationInput('');
    }
  };

  const removeCollocation = (index: number) => {
    setCollocations(prev => prev.filter((_, i) => i !== index));
  };

  const handleCollocationKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); addCollocation(); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim() || !definition.trim()) return;
    try {
      await addWord.mutateAsync({
        word:             word.trim(),
        definition:       definition.trim(),
        example_sentence: exampleSentence.trim() || undefined,
        register,
        collocations,
      });
      toast.success(`"${word}" added to your library!`, {
        action: { label: 'Go to Library', onClick: () => navigate('/library') },
      });
      setWord('');
      setDefinition('');
      setExampleSentence('');
      setCollocations([]);
      setCollocationInput('');
      setSuggestedWords([]);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save word');
    }
  };

  return (
    <AppLayout>
      <style>{`
        .glass-panel {
          background: rgba(24,24,27,0.55);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.05);
        }
        .add-input {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 0.875rem;
          padding: 0.75rem 1rem;
          color: #fff;
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .add-input::placeholder { color: #52525b; }
        .add-input:focus { border-color: rgba(0,255,200,0.45); }
        .add-textarea {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 0.875rem;
          padding: 0.75rem 1rem;
          color: #fff;
          font-size: 0.9rem;
          outline: none;
          resize: none;
          min-height: 88px;
          transition: border-color 0.2s;
        }
        .add-textarea::placeholder { color: #52525b; }
        .add-textarea:focus { border-color: rgba(0,255,200,0.45); }
        .ai-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.72rem;
          font-weight: 700;
          color: #00FFC8;
          transition: opacity 0.15s;
        }
        .ai-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .ai-btn:not(:disabled):hover { opacity: 0.75; }
        .glow-mint { box-shadow: 0 0 28px rgba(0,255,200,0.3); }
      `}</style>

      <div className="px-4 pt-6 pb-28 max-w-lg mx-auto">
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

          {/* ── Header ───────────────────────────────────────────────── */}
          <motion.div variants={itemVariant} className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center justify-center w-10 h-10 rounded-full transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)', color: '#a1a1aa' }}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1
                className="text-3xl font-bold text-white leading-none"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Add Word
              </h1>
              <p className="text-zinc-500 text-xs mt-1">Expand your lexicon</p>
            </div>
          </motion.div>

          {/* ── Form card ────────────────────────────────────────────── */}
          <motion.div variants={itemVariant} className="glass-panel rounded-[2rem] p-7 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* ── Word + style selector ────────────────────────────── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">Word</label>
                  <button
                    type="button"
                    onClick={handleSuggestWord}
                    disabled={loadingWord}
                    className="ai-btn"
                  >
                    {loadingWord
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <Sparkles className="h-3 w-3" />}
                    {loadingWord ? 'Suggesting…' : 'Suggest Word'}
                  </button>
                </div>

                <input
                  className="add-input"
                  placeholder="Type a topic hint, or leave blank for a surprise…"
                  value={word}
                  onChange={e => setWord(e.target.value)}
                  required
                />

                {/* Always-visible style pills — click to select AND generate instantly */}
                <div className="grid grid-cols-4 gap-1.5">
                  {generationStyles.map(({ value, label, icon: Icon }) => {
                    const active = generationStyle === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        disabled={loadingWord}
                        onClick={() => handleStyleSelect(value)}
                        className="flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all disabled:opacity-40"
                        style={{
                          background: active ? 'rgba(0,255,200,0.12)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${active ? 'rgba(0,255,200,0.4)' : 'rgba(255,255,255,0.07)'}`,
                        }}
                      >
                        <Icon
                          className="h-3.5 w-3.5"
                          style={{ color: active ? '#00FFC8' : '#52525b' }}
                        />
                        <span
                          className="text-[10px] font-bold"
                          style={{ color: active ? '#00FFC8' : '#71717a' }}
                        >
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-zinc-600">
                  Tap a style to instantly suggest a word in that category.
                </p>
              </div>

              {/* ── Definition ───────────────────────────────────────── */}
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">Definition</label>
                  <button
                    type="button"
                    onClick={handleAutoDefinition}
                    disabled={loadingDefinition || !word.trim()}
                    className="ai-btn"
                  >
                    {loadingDefinition
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <Sparkles className="h-3 w-3" />}
                    {loadingDefinition ? 'Generating…' : 'Auto-fill'}
                  </button>
                </div>
                <textarea
                  className="add-textarea"
                  placeholder="What does this word mean?"
                  value={definition}
                  onChange={e => setDefinition(e.target.value)}
                  required
                />
              </div>

              {/* ── Example sentence ─────────────────────────────────── */}
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                    Example Sentence{' '}
                    <span className="normal-case tracking-normal font-normal text-zinc-600">(optional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoExample}
                    disabled={loadingExample || !word.trim() || !definition.trim()}
                    className="ai-btn"
                  >
                    {loadingExample
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <Sparkles className="h-3 w-3" />}
                    {loadingExample ? 'Generating…' : 'Generate'}
                  </button>
                </div>
                <textarea
                  className="add-textarea"
                  placeholder="Where did you first see this word?"
                  value={exampleSentence}
                  onChange={e => setExampleSentence(e.target.value)}
                />
              </div>

              {/* ── Collocations ─────────────────────────────────────── */}
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                    Collocations{' '}
                    <span className="normal-case tracking-normal font-normal text-zinc-600">(optional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoCollocations}
                    disabled={loadingCollocations || !word.trim() || !definition.trim()}
                    className="ai-btn"
                  >
                    {loadingCollocations
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <Sparkles className="h-3 w-3" />}
                    {loadingCollocations ? 'Generating…' : 'Auto-fill'}
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    className="add-input"
                    placeholder="e.g., make an effort"
                    value={collocationInput}
                    onChange={e => setCollocationInput(e.target.value)}
                    onKeyDown={handleCollocationKeyDown}
                  />
                  <button
                    type="button"
                    onClick={addCollocation}
                    disabled={!collocationInput.trim()}
                    className="shrink-0 px-4 py-2 rounded-xl text-sm font-bold text-zinc-900 disabled:opacity-30 transition-all"
                    style={{ background: 'linear-gradient(135deg, #2cffca 0%, #00FFC8 100%)' }}
                  >
                    Add
                  </button>
                </div>
                {collocations.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {collocations.map((c, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white"
                        style={{ background: 'rgba(0,255,200,0.1)', border: '1px solid rgba(0,255,200,0.2)' }}
                      >
                        {c}
                        <button
                          type="button"
                          onClick={() => removeCollocation(i)}
                          className="text-zinc-500 hover:text-white transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Register ─────────────────────────────────────────── */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">Register</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {registers.map(r => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRegister(r.value)}
                      className={cn('rounded-full px-4 py-2 text-sm font-semibold transition-all')}
                      style={
                        register === r.value
                          ? { background: 'rgba(0,255,200,0.15)', color: '#00FFC8', border: '1px solid rgba(0,255,200,0.4)' }
                          : { background: 'rgba(255,255,255,0.04)', color: '#71717a', border: '1px solid rgba(255,255,255,0.07)' }
                      }
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Submit ───────────────────────────────────────────── */}
              <button
                type="submit"
                disabled={addWord.isPending || !word.trim() || !definition.trim()}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base text-zinc-900 disabled:opacity-40 transition-all hover:scale-[1.02] glow-mint"
                style={{ background: 'linear-gradient(135deg, #2cffca 0%, #00FFC8 100%)' }}
              >
                {addWord.isPending
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <BookPlus className="h-4 w-4" />}
                {addWord.isPending ? 'Saving…' : 'Save Word'}
              </button>

            </form>
          </motion.div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
