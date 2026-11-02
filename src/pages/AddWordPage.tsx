import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { getDiscoveryCount, getDiscoveryGoal, bumpDiscovery } from '@/lib/daily-discovery';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { memeToast } from '@/lib/meme-toast';
import { ArrowLeft, X, Loader2, Briefcase, MessageCircle, Sun, GraduationCap, RotateCw, Dices, Stamp, Plus } from 'lucide-react';
import { useAddWord } from '@/hooks/useWords';
import { generateDefinition, generateExampleSentence, generateCollocations, generateWord, generateSynonyms, generateMemoryTrick, generateWordBundle } from '@/lib/llm';
import type { GenerationStyle } from '@/lib/llm';
import type { Register } from '@/lib/types';

// "The Press": the page is a dictionary entry being typeset, on liquid glass.
// The left slab inks the headword; the right sheet is the entry itself, edited
// in place; saving presses it into the Library. Behind the glass, a liquid
// field takes its colour from the word's register and swirls while setting.

const DISPLAY_FONT = "'Bricolage Grotesque', 'Space Grotesk', sans-serif";
const SERIF_FONT = "Georgia, 'Times New Roman', serif";

const registers: { value: Register; label: string }[] = [
  { value: 'formal', label: 'Formal' },
  { value: 'casual', label: 'Casual' },
  { value: 'literary', label: 'Literary' },
  { value: 'slang', label: 'Slang' },
];

// Liquid palette per register; gold takes over while a word is being pressed
const registerInk: Record<Register, [string, string, string]> = {
  formal: ['#00FFC8', '#38bdf8', '#6366f1'],
  casual: ['#a78bfa', '#f472b6', '#38bdf8'],
  literary: ['#f0c96a', '#c8922a', '#a78bfa'],
  slang: ['#fb7185', '#f97316', '#facc15'],
};
const pressInk: [string, string, string] = ['#f0c96a', '#f6dc94', '#c8922a'];

const generationStyles: {
  value: GenerationStyle;
  label: string;
  desc: string;
  icon: React.ElementType;
}[] = [
    { value: 'formal', label: 'Formal', desc: 'Business & academic', icon: Briefcase },
    { value: 'casual', label: 'Casual', desc: 'Friendly talk', icon: MessageCircle },
    { value: 'daily', label: 'Daily', desc: 'Everyday life', icon: Sun },
    { value: 'ielts', label: 'IELTS', desc: 'Band 7–9', icon: GraduationCap },
  ];

const trickLabels: Record<string, string> = {
  phonetic_split: 'Phonetic split',
  root_hook: 'Root hook',
  sound_alike: 'Sound-alike',
  micro_story: 'Micro story',
  formula: 'Formula',
  contrast_anchor: 'Contrast',
  analogy_bridge: 'Analogy',
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] as const } },
};
// Entry sections "typeset" in one after another when the sheet is filled
const typeset = {
  hidden: { opacity: 0, y: 8, filter: 'blur(6px)' },
  show: (i: number) => ({
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { delay: i * 0.09, duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// Moves a glass panel's caustic highlight to follow the pointer
const followGlow = (e: React.PointerEvent<HTMLElement>) => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
};

// Letters tumble in the slab while a word is being suggested
function useScramble(active: boolean) {
  const [text, setText] = useState('');
  useEffect(() => {
    if (!active) return;
    const abc = 'abcdefghijklmnopqrstuvwxyz';
    const id = setInterval(() => {
      const len = 6 + Math.floor(Math.random() * 4);
      setText(Array.from({ length: len }, () => abc[Math.floor(Math.random() * 26)]).join(''));
    }, 60);
    return () => clearInterval(id);
  }, [active]);
  return text;
}

const blobs = [
  { ink: 0, size: '46vw', left: '-8vw', top: '6vh', dur: 26, delay: 0 },
  { ink: 1, size: '40vw', left: '58vw', top: '-8vh', dur: 31, delay: -7 },
  { ink: 2, size: '34vw', left: '30vw', top: '48vh', dur: 23, delay: -3 },
  { ink: 0, size: '28vw', left: '76vw', top: '56vh', dur: 35, delay: -12 },
  { ink: 1, size: '22vw', left: '6vw', top: '66vh', dur: 19, delay: -5 },
];

// The liquid field behind the glass. `energy` (0–1) is how much of the entry
// is inked; it makes the field fuller and brighter.
function LiquidField({ ink, energy, swirl }: { ink: [string, string, string]; energy: number; swirl: boolean }) {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden>
      <motion.div
        className="absolute inset-0"
        initial={false}
        animate={{ scale: 0.92 + energy * 0.22, opacity: 0.55 + energy * 0.45 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      >
        <div className={cn('liquid-field', swirl && 'liquid-swirl')}>
          {blobs.map((b, i) => (
            <motion.div
              key={i}
              className="liquid-blob"
              initial={false}
              animate={{ backgroundColor: ink[b.ink] }}
              transition={{ duration: 1.4, ease: 'easeInOut' }}
              style={{
                width: b.size, height: b.size, left: b.left, top: b.top,
                animationDuration: `${swirl ? b.dur / 4 : b.dur}s`,
                animationDelay: `${b.delay}s`,
              }}
            />
          ))}
        </div>
      </motion.div>
      <div className="liquid-grain" />
    </div>
  );
}

// Headword whose letters drop in like liquid as they change
function LiquidWord({ text }: { text: string }) {
  return (
    <span aria-label={text}>
      {[...text].map((ch, i) => (
        <motion.span
          key={`${i}-${ch}`}
          className="inline-block origin-bottom"
          initial={{ y: -16, opacity: 0, scaleY: 1.5, scaleX: 0.7 }}
          animate={{ y: 0, opacity: 1, scaleY: 1, scaleX: 1 }}
          transition={{ type: 'spring', stiffness: 520, damping: 15, delay: Math.min(i * 0.02, 0.15) }}
        >
          {ch === ' ' ? ' ' : ch}
        </motion.span>
      ))}
    </span>
  );
}

// Textarea that grows with its content so the entry reads like print
function InkArea({ className, value, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return <textarea ref={ref} rows={1} value={value} className={cn('ink-area', className)} {...props} />;
}

// Example sentence with the headword picked out in teal
function HighlightedExample({ sentence, word }: { sentence: string; word: string }) {
  const w = word.trim();
  if (!w) return <>{sentence}</>;
  const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = sentence.split(new RegExp(`(\\b${escaped}\\w*)`, 'gi'));
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? <mark key={i} className="ink-mark">{p}</mark> : <span key={i}>{p}</span>
      )}
    </>
  );
}

function RegenButton({ onClick, loading, disabled, label }: { onClick: () => void; loading: boolean; disabled: boolean; label: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled || loading} className="regen-btn" title={label} aria-label={label}>
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCw className="h-3 w-3" />}
    </button>
  );
}

function ChipRow({
  items, onRemove, input, setInput, onAdd, placeholder, tone,
}: {
  items: string[]; onRemove: (i: number) => void;
  input: string; setInput: (v: string) => void; onAdd: () => void;
  placeholder: string; tone: 'teal' | 'violet';
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <AnimatePresence initial={false}>
        {items.map((c, i) => (
          <motion.span
            key={c}
            layout
            initial={{ opacity: 0, scale: 0.6, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ type: 'spring', stiffness: 480, damping: 22, delay: Math.min(i * 0.04, 0.3) }}
            className={cn('glass-chip', tone === 'violet' && 'glass-chip-violet')}
          >
            {c}
            <button type="button" onClick={() => onRemove(i)} className="opacity-50 hover:opacity-100 transition-opacity" aria-label={`Remove ${c}`}>
              <X className="h-3 w-3" />
            </button>
          </motion.span>
        ))}
      </AnimatePresence>
      <label className="chip-input">
        <Plus className="h-3 w-3 shrink-0" />
        <input
          value={input}
          placeholder={placeholder}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); onAdd(); } }}
          onBlur={onAdd}
          size={Math.max(placeholder.length, input.length) + 1}
        />
      </label>
    </div>
  );
}

export default function AddWordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [word, setWord] = useState(() => searchParams.get('word') ?? '');
  const [definition, setDefinition] = useState('');
  const [exampleSentence, setExampleSentence] = useState('');
  const [collocations, setCollocations] = useState<string[]>([]);
  const [collocationInput, setCollocationInput] = useState('');
  const [register, setRegister] = useState<Register>('formal');
  const [generationStyle, setGenerationStyle] = useState<GenerationStyle>('daily');
  const [suggestedWords, setSuggestedWords] = useState<string[]>([]);
  const [loadingWord, setLoadingWord] = useState(false);
  const [loadingDefinition, setLoadingDefinition] = useState(false);
  const [loadingExample, setLoadingExample] = useState(false);
  const [loadingCollocations, setLoadingCollocations] = useState(false);
  const [synonyms, setSynonyms] = useState<string[]>([]);
  const [synonymInput, setSynonymInput] = useState('');
  const [loadingSynonyms, setLoadingSynonyms] = useState(false);
  type MemoryTrick = { technique: string; breakdown: string; clarification: string };
  const [memoryTrick, setMemoryTrick] = useState<MemoryTrick | null>(null);
  const [loadingMemoryTrick, setLoadingMemoryTrick] = useState(false);
  const [loadingAutofill, setLoadingAutofill] = useState(false);
  const [editingExample, setEditingExample] = useState(false);
  // Bumped after each autofill so the sheet re-runs its typeset animation
  const [setPass, setSetPass] = useState(0);
  // Word being stamped into the Library; the sheet is locked while it shows
  const [pressed, setPressed] = useState<string | null>(null);
  // Headword the current entry was generated for, to catch a stale entry
  const [entryFor, setEntryFor] = useState<string | null>(null);
  const addWord = useAddWord();
  const [discoveryCount, setDiscoveryCount] = useState(() => getDiscoveryCount());
  const dailyGoal = getDiscoveryGoal();
  const scramble = useScramble(loadingWord);

  const hasWord = !!word.trim();
  const hasDef = !!definition.trim();
  const goalDone = discoveryCount >= dailyGoal;

  // How much of the entry is inked, out of six parts
  const parts = [hasDef, !!exampleSentence.trim(), !!memoryTrick, synonyms.length > 0, collocations.length > 0, hasWord];
  const inked = parts.filter(Boolean).length;
  const fullyInked = inked === parts.length;
  const staleEntry = !!entryFor && hasDef && entryFor.toLowerCase() !== word.trim().toLowerCase();

  // Empty every part of the entry except the headword
  const clearEntry = () => {
    setDefinition(''); setExampleSentence(''); setMemoryTrick(null);
    setCollocations([]); setCollocationInput('');
    setSynonyms([]); setSynonymInput('');
    setEditingExample(false); setEntryFor(null);
  };

  const handleSuggestWord = async (style = generationStyle) => {
    setGenerationStyle(style); setLoadingWord(true);
    try {
      const suggested = await generateWord(word.trim(), style, suggestedWords);
      clearEntry();
      setWord(suggested); setSuggestedWords(p => [...p, suggested]);
      memeToast.wordSuggested();
    } catch { toast.error('Failed to suggest word'); }
    finally { setLoadingWord(false); }
  };

  const handleAutoDefinition = async () => {
    if (!hasWord) { toast.error('Enter a word first'); return; }
    setLoadingDefinition(true);
    try {
      const r = await generateDefinition(word.trim(), generationStyle, definition);
      setDefinition(r.definition); setRegister(r.register); setEntryFor(word.trim()); memeToast.definitionGenerated();
    } catch { toast.error('Failed to generate definition'); }
    finally { setLoadingDefinition(false); }
  };

  const handleAutoExample = async () => {
    if (!hasWord) { toast.error('Enter a word first'); return; }
    if (!hasDef) { toast.error('Add a definition first'); return; }
    setLoadingExample(true);
    try {
      setExampleSentence(await generateExampleSentence(word.trim(), definition.trim(), generationStyle, exampleSentence ? [exampleSentence] : []));
      memeToast.exampleGenerated();
    } catch { toast.error('Failed to generate example'); }
    finally { setLoadingExample(false); }
  };

  const addSynonym = () => {
    const t = synonymInput.trim().replace(/,$/, '');
    if (t && !synonyms.includes(t)) setSynonyms(p => [...p, t]);
    setSynonymInput('');
  };

  const handleAutoSynonyms = async () => {
    if (!hasWord) { toast.error('Enter a word first'); return; }
    if (!hasDef) { toast.error('Add a definition first'); return; }
    setLoadingSynonyms(true);
    try {
      setSynonyms(await generateSynonyms(word.trim(), definition.trim(), generationStyle, synonyms));
      memeToast.synonymsGenerated();
    } catch { toast.error('Failed to generate synonyms'); }
    finally { setLoadingSynonyms(false); }
  };

  const handleAutoMemoryTrick = async () => {
    if (!hasWord) { toast.error('Enter a word first'); return; }
    if (!hasDef) { toast.error('Add a definition first'); return; }
    setLoadingMemoryTrick(true);
    try {
      setMemoryTrick(await generateMemoryTrick(word.trim(), definition.trim()));
      memeToast.memoryTrickGenerated();
    } catch { toast.error('Failed to generate memory trick'); }
    finally { setLoadingMemoryTrick(false); }
  };

  const handleAutofillAll = async () => {
    if (!hasWord) { toast.error('Enter a word first'); return; }
    setLoadingAutofill(true);
    try {
      const b = await generateWordBundle(word.trim(), generationStyle);
      setDefinition(b.definition); setRegister(b.register);
      setExampleSentence(b.example_sentence); setSynonyms(b.synonyms); setCollocations(b.collocations); setMemoryTrick(b.memory_trick);
      setEntryFor(word.trim());
      setSetPass(p => p + 1);
      memeToast.autofillComplete();
    } catch { toast.error('Autofill failed'); }
    finally { setLoadingAutofill(false); }
  };

  const handleAutoCollocations = async () => {
    if (!hasWord) { toast.error('Enter a word first'); return; }
    if (!hasDef) { toast.error('Add a definition first'); return; }
    setLoadingCollocations(true);
    try {
      const results = await generateCollocations(word.trim(), definition.trim(), generationStyle, collocations);
      setCollocations(p => [...p, ...results.filter(c => !p.includes(c))]);
      memeToast.collocationsGenerated();
    } catch { toast.error('Failed to generate collocations'); }
    finally { setLoadingCollocations(false); }
  };

  const addCollocation = () => {
    const t = collocationInput.trim().replace(/,$/, '');
    if (t && !collocations.includes(t)) setCollocations(p => [...p, t]);
    setCollocationInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasWord || !hasDef) return;
    try {
      await addWord.mutateAsync({
        word: word.trim(), definition: definition.trim(),
        example_sentence: exampleSentence.trim() || undefined,
        emotion_anchor: memoryTrick ? `${memoryTrick.breakdown}\n${memoryTrick.clarification}` : undefined,
        register, collocations, synonyms,
      });
      const fromDaily = searchParams.get('from') === 'daily';
      setDiscoveryCount(bumpDiscovery());

      // Let the seal land before the sheet is cleared
      setPressed(word.trim());
      await sleep(1300);
      setPressed(null);

      // Reset shared form state
      const resetForm = (nextWord = '') => {
        setWord(nextWord); clearEntry(); setSuggestedWords([]);
      };

      if (fromDaily) {
        const queueRaw = sessionStorage.getItem('daily_queue');
        const queue: string[] = queueRaw ? JSON.parse(queueRaw) : [];
        if (queue.length > 0) {
          const [nextWord, ...rest] = queue;
          sessionStorage.setItem('daily_queue', JSON.stringify(rest));
          navigate(`/add?word=${encodeURIComponent(nextWord)}&from=daily&left=${rest.length}`, { replace: true });
          resetForm(nextWord);
          memeToast.wordConquered(word, queue.length, { label: `Next: ${nextWord} →`, onClick: () => {} });
        } else {
          sessionStorage.removeItem('daily_queue');
          resetForm();
          memeToast.wordConquered(word, 0, { label: 'Back to Discover →', onClick: () => navigate('/daily') });
        }
      } else {
        memeToast.wordSaved(word, { label: 'Go to Library', onClick: () => navigate('/library') });
        resetForm();
      }
    } catch (err: unknown) {
      setPressed(null);
      toast.error(err instanceof Error ? err.message : 'Failed to save word');
    }
  };

  const busyAll = loadingAutofill;
  const ink = pressed ? pressInk : registerInk[register];

  const pressButton = (
    <button
      type="submit"
      disabled={addWord.isPending || !!pressed || !hasWord || !hasDef}
      className="press-btn liquid-flow"
    >
      {addWord.isPending ? <Loader2 className="relative h-5 w-5 animate-spin shrink-0" /> : <Stamp className="relative h-5 w-5 shrink-0" />}
      <span className="relative truncate">
        {addWord.isPending ? 'Pressing…' : !hasWord ? 'Ink a headword first' : !hasDef ? 'Give it a meaning to press' : `Press “${word.trim()}” into Library`}
      </span>
    </button>
  );

  return (
    <AppLayout>
      <style>{`
        /* ── Liquid field ────────────────────────────────── */
        .liquid-field { position: absolute; inset: -15%; transform-origin: 50% 50%; }
        .liquid-swirl { animation: liquidSwirl 7s linear infinite; }
        @keyframes liquidSwirl { to { transform: rotate(360deg); } }
        .liquid-blob {
          position: absolute;
          opacity: .32;
          filter: blur(48px);
          animation-name: blobFlow;
          animation-iteration-count: infinite;
          animation-timing-function: ease-in-out;
          will-change: transform, border-radius;
        }
        @keyframes blobFlow {
          0%, 100% { transform: translate(0,0) rotate(0deg) scale(1); border-radius: 42% 58% 63% 37% / 41% 44% 56% 59%; }
          33% { transform: translate(7vw,5vh) rotate(70deg) scale(1.1); border-radius: 63% 37% 45% 55% / 55% 62% 38% 45%; }
          66% { transform: translate(-5vw,7vh) rotate(140deg) scale(.92); border-radius: 37% 63% 56% 44% / 48% 35% 65% 52%; }
        }
        .liquid-grain {
          position: absolute; inset: 0;
          opacity: .05;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }
        @media (prefers-reduced-motion: reduce) {
          .liquid-blob, .liquid-swirl, .liquid-flow { animation: none !important; }
        }

        /* ── Liquid glass ────────────────────────────────── */
        .glass {
          position: relative;
          isolation: isolate;
          background:
            linear-gradient(145deg, rgba(255,255,255,.09) 0%, rgba(255,255,255,.025) 42%, rgba(255,255,255,.055) 100%);
          backdrop-filter: blur(30px) saturate(175%);
          -webkit-backdrop-filter: blur(30px) saturate(175%);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.22),
            inset 0 -1px 0 rgba(255,255,255,.04),
            inset 0 -30px 60px -30px rgba(255,255,255,.05),
            0 24px 70px rgba(0,0,0,.45);
        }
        /* specular rim: brightest at top-left and bottom-right, like curved glass */
        .glass::before {
          content: '';
          position: absolute; inset: 0;
          border-radius: inherit;
          padding: 1px;
          background: linear-gradient(135deg, rgba(255,255,255,.5) 0%, rgba(255,255,255,.06) 30%, rgba(255,255,255,0) 55%, rgba(255,255,255,.22) 100%);
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
          z-index: 2;
        }
        /* caustic that follows the pointer */
        .glass::after {
          content: '';
          position: absolute; inset: 0;
          border-radius: inherit;
          background: radial-gradient(380px circle at var(--mx, 20%) var(--my, -10%), rgba(255,255,255,.075), transparent 50%);
          pointer-events: none;
          z-index: -1;
        }

        .press-slab { border-radius: 30px; padding: 22px; overflow: hidden; }
        .sheet { border-radius: 30px; padding: 28px 24px 24px; overflow: hidden; }

        .headword-input {
          width: 100%;
          background: transparent;
          border: none;
          outline: none;
          color: #fff;
          font-family: ${DISPLAY_FONT};
          font-weight: 800;
          font-size: clamp(2.4rem, 8vw, 3.6rem);
          letter-spacing: -.045em;
          line-height: 1;
          padding: 4px 0 10px;
          caret-color: #00FFC8;
          text-shadow: 0 2px 30px rgba(255,255,255,.12);
        }
        .headword-input::placeholder { color: rgba(255,255,255,.12); }

        .headword-rule { height: 2px; border-radius: 2px; background: rgba(255,255,255,.08); position: relative; overflow: hidden; }
        .headword-rule > span {
          position: absolute; inset: 0;
          background: linear-gradient(90deg, var(--ink-a), var(--ink-b), var(--ink-c));
          transform-origin: left;
          transition: transform .5s cubic-bezier(.22,1,.36,1);
        }

        .sec-label {
          font-size: .6rem; font-weight: 900; letter-spacing: .2em; text-transform: uppercase;
          color: rgba(255,255,255,.4);
          display: inline-flex; align-items: center; gap: 8px;
        }
        .sec-label i {
          font-style: italic; text-transform: none; letter-spacing: 0;
          font-family: ${SERIF_FONT};
          font-size: .85rem; font-weight: 400;
          color: #f0c96a; opacity: .8;
        }

        /* voice keys share one liquid bead that flows to the active key */
        .voice-key {
          position: relative;
          display: flex; flex-direction: column; align-items: flex-start; gap: 6px;
          padding: 11px 12px 12px;
          border-radius: 18px;
          background: rgba(255,255,255,.03);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.06);
          text-align: left;
          transition: background .2s, transform .12s;
        }
        .voice-key:not(:disabled):hover { background: rgba(255,255,255,.06); }
        .voice-key:not(:disabled):active { transform: scale(.97); }
        .voice-key:disabled { opacity: .45; }
        .voice-bead {
          position: absolute; inset: 0;
          border-radius: 18px;
          background: linear-gradient(145deg, rgba(255,255,255,.2), rgba(255,255,255,.05));
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.45),
            inset 0 -8px 18px rgba(255,255,255,.04),
            0 8px 24px rgba(0,0,0,.25),
            0 0 0 1px rgba(255,255,255,.14);
          backdrop-filter: blur(8px) saturate(160%);
          -webkit-backdrop-filter: blur(8px) saturate(160%);
        }

        .liquid-flow { background-size: 300% 100%; animation: liquidFlow 7s ease-in-out infinite; }
        .liquid-flow[data-busy='true'] { animation-duration: 1.4s; }
        @keyframes liquidFlow { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }

        .set-type-btn {
          position: relative; overflow: hidden;
          width: 100%;
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
          padding: 16px 18px;
          border-radius: 22px;
          color: #04110e;
          font-family: ${DISPLAY_FONT};
          font-weight: 800; font-size: 1.05rem; letter-spacing: -.01em;
          background-image: linear-gradient(110deg, #2cffca, #7dd3fc, #c4b5fd, #7dd3fc, #2cffca);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.7),
            inset 0 -10px 20px rgba(0,0,0,.08),
            0 0 40px rgba(0,255,200,.22),
            0 10px 30px rgba(56,189,248,.18);
          transition: transform .15s, opacity .15s;
        }
        /* glassy dome highlight on the top half */
        .set-type-btn::before, .press-btn::before {
          content: '';
          position: absolute; left: 6px; right: 6px; top: 3px; height: 45%;
          border-radius: 18px 18px 40% 40% / 18px 18px 100% 100%;
          background: linear-gradient(180deg, rgba(255,255,255,.55), rgba(255,255,255,0));
          opacity: .55;
          pointer-events: none;
        }
        .set-type-btn:not(:disabled):hover { transform: translateY(-1px); }
        .set-type-btn:not(:disabled):active { transform: translateY(1px) scale(.995); }
        .set-type-btn:disabled { opacity: .35; cursor: not-allowed; box-shadow: none; }

        /* liquid tube that fills as the entry is inked */
        .tube {
          position: relative;
          height: 16px;
          border-radius: 999px;
          background: rgba(255,255,255,.04);
          box-shadow: inset 0 1px 3px rgba(0,0,0,.5), inset 0 0 0 1px rgba(255,255,255,.07);
          overflow: hidden;
        }
        .tube-liquid {
          position: absolute; left: 0; top: 0; bottom: 0;
          border-radius: 999px;
          box-shadow: inset 0 2px 0 rgba(255,255,255,.45), 0 0 18px var(--glow);
        }
        .tube-liquid::after {
          content: '';
          position: absolute; right: -6px; top: -4px; bottom: -4px; width: 14px;
          border-radius: 50%;
          background: inherit;
          animation: meniscus 1.6s ease-in-out infinite;
        }
        @keyframes meniscus { 0%,100% { transform: scaleY(1) translateX(0); } 50% { transform: scaleY(.8) translateX(2px); } }
        .tube-ticks { position: absolute; inset: 0; display: grid; grid-template-columns: repeat(6, 1fr); pointer-events: none; }
        .tube-ticks span + span { border-left: 1px solid rgba(255,255,255,.08); }
        .tube::after {
          content: '';
          position: absolute; left: 8px; right: 8px; top: 2px; height: 4px;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(255,255,255,.25), rgba(255,255,255,.05));
          pointer-events: none;
        }

        /* printing roller that sweeps the sheet while it is being set */
        .sheet-roller {
          position: absolute; left: 0; right: 0; height: 120px;
          background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--ink-a) 14%, transparent) 45%, color-mix(in srgb, var(--ink-b) 14%, transparent) 55%, transparent);
          border-bottom: 1px solid color-mix(in srgb, var(--ink-a) 45%, transparent);
          animation: rollerDown 1.4s cubic-bezier(.45,0,.55,1) infinite;
          pointer-events: none;
          z-index: 3;
        }
        @keyframes rollerDown { 0% { top: -120px; } 100% { top: 100%; } }

        /* One line of the entry: italic tag in a gutter, content, tools on hover */
        .entry-row {
          display: grid;
          grid-template-columns: 2.6rem minmax(0, 1fr) auto;
          column-gap: 10px;
          align-items: start;
        }
        .entry-tag {
          font-family: ${SERIF_FONT};
          font-style: italic;
          font-size: .85rem;
          color: rgba(240,201,106,.6);
          padding-top: 7px;
          user-select: none;
        }
        .row-tools { display: flex; gap: 4px; padding-top: 3px; transition: opacity .15s; }
        @media (hover: hover) {
          .entry-row .row-tools { opacity: 0; }
          .entry-row:hover .row-tools, .entry-row:focus-within .row-tools { opacity: 1; }
        }

        .ink-area {
          background: transparent;
          border: none;
          outline: none;
          resize: none;
          overflow: hidden;
          color: #f4f4f5;
          font-family: inherit;
          line-height: 1.6;
          padding: 6px 10px;
          margin: 0 -10px;
          width: calc(100% + 20px);
          border-radius: 14px;
          transition: background .2s, box-shadow .2s;
        }
        .ink-area::placeholder { color: rgba(255,255,255,.2); font-style: italic; }
        .ink-area:hover { background: rgba(255,255,255,.03); }
        .ink-area:focus {
          background: rgba(255,255,255,.05);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.12), inset 0 0 0 1px rgba(255,255,255,.1);
        }

        .ink-mark {
          background: linear-gradient(180deg, transparent 58%, color-mix(in srgb, var(--ink-a) 28%, transparent) 58%);
          color: #fff;
          font-style: normal;
          font-weight: 600;
          padding: 0 1px;
        }

        .regen-btn {
          width: 26px; height: 26px;
          display: inline-flex; align-items: center; justify-content: center;
          border-radius: 999px;
          color: rgba(255,255,255,.4);
          transition: color .15s, background .15s, transform .3s;
        }
        .regen-btn:not(:disabled):hover { color: #fff; background: rgba(255,255,255,.1); transform: rotate(90deg); }
        .regen-btn:disabled { opacity: .3; cursor: not-allowed; }

        .glass-chip {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 4px 11px;
          border-radius: 999px;
          font-size: .82rem; font-weight: 500;
          color: #d5fff4;
          background: linear-gradient(145deg, rgba(0,255,200,.14), rgba(0,255,200,.04));
          box-shadow: inset 0 1px 0 rgba(255,255,255,.18), inset 0 0 0 1px rgba(0,255,200,.14);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
        .glass-chip-violet {
          color: #ece6ff;
          background: linear-gradient(145deg, rgba(167,139,250,.18), rgba(167,139,250,.05));
          box-shadow: inset 0 1px 0 rgba(255,255,255,.18), inset 0 0 0 1px rgba(167,139,250,.18);
        }
        .glass-chip button { width: 0; overflow: hidden; transition: width .15s; }
        .glass-chip:hover button, .glass-chip button:focus-visible { width: 12px; }
        @media (hover: none) { .glass-chip button { width: 12px; } }
        .chip-input {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 4px 6px;
          color: rgba(255,255,255,.25);
          cursor: text;
          transition: color .15s;
        }
        .chip-input:focus-within { color: #fff; }
        .chip-input input { background: transparent; border: none; outline: none; color: #f4f4f5; font-size: .82rem; font-weight: 500; min-width: 0; }
        .chip-input input::placeholder { color: rgba(255,255,255,.22); }

        .hook {
          position: relative;
          padding: 10px 14px 10px 16px;
          border-radius: 16px;
          background: linear-gradient(145deg, rgba(240,201,106,.12), rgba(240,201,106,.03));
          box-shadow: inset 0 1px 0 rgba(255,255,255,.12), inset 0 0 0 1px rgba(240,201,106,.14);
        }

        .register-tag {
          font-family: ${SERIF_FONT};
          font-style: italic;
          font-size: .95rem;
          color: rgba(240,201,106,.7);
          transition: color .15s;
          user-select: none;
        }
        .register-tag:hover { color: #f0c96a; }

        .press-btn {
          position: relative; overflow: hidden;
          width: 100%;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          padding: 17px 20px;
          border-radius: 22px;
          font-family: ${DISPLAY_FONT};
          font-weight: 800; font-size: 1.05rem; letter-spacing: -.01em;
          color: #2a1a03;
          background-image: linear-gradient(110deg, #c8922a, #f6dc94, #f0c96a, #c08828, #c8922a);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.65),
            inset 0 -10px 20px rgba(0,0,0,.12),
            0 0 36px rgba(240,201,106,.25),
            0 12px 30px rgba(0,0,0,.35);
          transition: transform .15s, opacity .15s, box-shadow .15s;
        }
        .press-btn:not(:disabled):hover { transform: translateY(-1px); }
        .press-btn:not(:disabled):active { transform: translateY(2px) scale(.995); }
        .press-btn:disabled { opacity: .3; cursor: not-allowed; box-shadow: none; }

        .seal {
          font-family: ${DISPLAY_FONT};
          font-weight: 800;
          text-align: center;
          color: #2a1a03;
          padding: 22px 30px 20px;
          border-radius: 26px;
          background: linear-gradient(145deg, #f6dc94 0%, #f0c96a 40%, #c8922a 100%);
          box-shadow:
            inset 0 2px 0 rgba(255,255,255,.7),
            inset 0 -10px 24px rgba(120,70,0,.35),
            0 0 0 6px rgba(240,201,106,.18),
            0 20px 60px rgba(240,201,106,.35);
        }

        .ghost-line { height: 10px; border-radius: 999px; background: rgba(255,255,255,.06); }

        .no-scrollbar { scrollbar-width: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }

        /* Desktop: everything scales with screen height so one screen holds it all */
        @media (min-width: 1024px) {
          .press-slab { padding: clamp(16px, 2.4vh, 22px); }
          .sheet { padding: clamp(18px, 3vh, 28px) clamp(18px, 2.4vh, 24px); }
          .headword-input { font-size: clamp(2rem, 6.5vh, 3.4rem); }
          .voice-key { padding: clamp(8px, 1.3vh, 11px) 12px; }
          .set-type-btn, .press-btn { padding-top: clamp(11px, 1.9vh, 17px); padding-bottom: clamp(11px, 1.9vh, 17px); }
        }
      `}</style>

      <LiquidField ink={ink} energy={inked / parts.length} swirl={busyAll} />

      {/* On desktop the page is exactly one screen tall (AppLayout pads 6rem for the nav) */}
      <div
        className="relative z-10 px-4 pt-4 pb-28 max-w-lg mx-auto lg:pt-2 lg:pb-5 lg:max-w-6xl lg:h-[calc(100dvh-6rem)]"
        style={{ '--ink-a': ink[0], '--ink-b': ink[1], '--ink-c': ink[2] } as React.CSSProperties}
      >
        <motion.form
          onSubmit={handleSubmit}
          variants={container}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-4 lg:h-full lg:gap-3"
        >

          {/* ── Header ─────────────────────────────────────── */}
          <motion.div variants={item} className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="glass w-10 h-10 flex items-center justify-center rounded-2xl transition-transform hover:scale-105"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4 text-zinc-300" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#f0c96a]/80 leading-none">The Press</p>
              <h1 className="text-2xl font-bold text-white leading-tight tracking-tight mt-1" style={{ fontFamily: DISPLAY_FONT }}>
                Ink a new word
              </h1>
            </div>

            {/* Daily discovery goal as ink drops — tapping opens the Daily page */}
            <button
              type="button"
              onClick={() => navigate('/daily')}
              onPointerMove={followGlow}
              className="glass shrink-0 flex flex-col items-end gap-1.5 px-3.5 py-2.5 rounded-2xl transition-transform hover:scale-[1.03]"
              title="Daily discovery goal"
            >
              <span className="text-[10px] font-bold leading-none tabular-nums" style={{ color: goalDone ? '#f0c96a' : '#d4d4d8' }}>
                {goalDone ? 'Goal inked ✦' : `${discoveryCount}/${dailyGoal} today`}
              </span>
              {dailyGoal <= 12 ? (
                <span className="flex gap-1">
                  {Array.from({ length: dailyGoal }, (_, i) => (
                    <motion.span
                      key={i}
                      className="w-2 h-2.5 rounded-b-full rounded-t-[40%]"
                      initial={false}
                      animate={i < discoveryCount
                        ? { background: goalDone ? '#f0c96a' : ink[0], scale: 1 }
                        : { background: 'rgba(255,255,255,0.14)', scale: 0.85 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                      style={{ boxShadow: i < discoveryCount ? `0 0 8px ${goalDone ? '#f0c96a' : ink[0]}` : 'none' }}
                    />
                  ))}
                </span>
              ) : (
                <span className="w-20 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <span
                    className="block h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min((discoveryCount / dailyGoal) * 100, 100)}%`,
                      background: goalDone ? '#f0c96a' : `linear-gradient(90deg, ${ink[0]}, ${ink[1]})`,
                    }}
                  />
                </span>
              )}
            </button>
          </motion.div>

          <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-5 lg:flex-1 lg:min-h-0">

            {/* ── THE SLAB: headword + voice + set type + press ── */}
            <motion.div variants={item} className="lg:h-full lg:min-h-0">
              <div className="glass press-slab flex flex-col gap-5 lg:h-full lg:justify-between lg:gap-[1.6vh]" onPointerMove={followGlow}>
                <div className="flex items-center justify-between">
                  <span className="sec-label">Headword</span>
                  <button
                    type="button"
                    onClick={() => handleSuggestWord()}
                    disabled={loadingWord}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full transition-all disabled:opacity-40 hover:bg-white/10"
                    style={{ color: '#f6dc94', background: 'rgba(240,201,106,.08)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.15), inset 0 0 0 1px rgba(240,201,106,.25)' }}
                  >
                    <motion.span animate={loadingWord ? { rotate: 360 } : { rotate: 0 }} transition={loadingWord ? { repeat: Infinity, duration: 0.6, ease: 'linear' } : {}}>
                      <Dices className="h-3.5 w-3.5" />
                    </motion.span>
                    {loadingWord ? 'Rolling…' : 'Roll a word'}
                  </button>
                </div>

                <div>
                  {loadingWord ? (
                    <div className="headword-input select-none" style={{ color: 'rgba(255,255,255,.3)' }} aria-live="polite">
                      {scramble || ' '}
                    </div>
                  ) : (
                    <input
                      className="headword-input"
                      placeholder="serendipity"
                      value={word}
                      onChange={e => setWord(e.target.value)}
                      autoFocus={!word}
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      required
                      aria-label="Word"
                    />
                  )}
                  <div className="headword-rule">
                    <span style={{ transform: `scaleX(${hasWord ? 1 : 0})` }} />
                  </div>
                </div>

                <div className="flex flex-col gap-2.5">
                  <span className="sec-label">Voice <i>— tap to roll in that style</i></span>
                  <div className="grid grid-cols-2 gap-2">
                    {generationStyles.map(({ value, label, desc, icon: Icon }) => {
                      const active = generationStyle === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          disabled={loadingWord}
                          onClick={() => handleSuggestWord(value)}
                          className="voice-key"
                        >
                          {active && (
                            <motion.span layoutId="voice-bead" className="voice-bead" transition={{ type: 'spring', stiffness: 380, damping: 26 }} />
                          )}
                          <Icon className="relative h-4 w-4" style={{ color: active ? '#fff' : 'rgba(255,255,255,.4)' }} />
                          <span className="relative leading-none">
                            <span className="block text-[13px] font-bold" style={{ color: active ? '#fff' : 'rgba(255,255,255,.65)', fontFamily: DISPLAY_FONT }}>{label}</span>
                            <span className="block text-[10px] mt-1 [@media(min-width:1024px)_and_(max-height:800px)]:hidden" style={{ color: active ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.35)' }}>{desc}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAutofillAll}
                  disabled={busyAll || !hasWord || loadingWord}
                  data-busy={busyAll}
                  className="set-type-btn liquid-flow"
                >
                  <span className="relative flex flex-col items-start leading-none">
                    <span>{busyAll ? 'AI is writing it for you…' : 'Let AI do it for you'}</span>
                    <span className="text-[11px] font-semibold mt-1.5 opacity-70" style={{ fontFamily: 'Inter, sans-serif' }}>
                      {busyAll ? 'Filling in every line of the entry' : 'Meaning, example, hook & more in one tap'}
                    </span>
                  </span>
                  <motion.span
                    className="relative text-2xl leading-none shrink-0"
                    animate={busyAll ? { rotate: [0, -12, 12, 0], y: [0, -2, 0] } : { rotate: 0, y: 0 }}
                    transition={busyAll ? { repeat: Infinity, duration: 0.8 } : {}}
                    aria-hidden
                  >
                    {busyAll ? '✍️' : '🪄'}
                  </motion.span>
                </button>

                {/* Ink coverage — a glass tube that fills with liquid */}
                <div className="flex items-center gap-3">
                  <div className="tube flex-1">
                    <motion.div
                      className="tube-liquid liquid-flow"
                      initial={false}
                      animate={{ width: inked === 0 ? '0%' : `calc(${(inked / parts.length) * 100}% - 4px)` }}
                      transition={{ type: 'spring', stiffness: 110, damping: 16 }}
                      style={{
                        backgroundImage: fullyInked
                          ? 'linear-gradient(90deg, #c8922a, #f6dc94, #f0c96a, #c8922a)'
                          : `linear-gradient(90deg, ${ink[0]}, ${ink[1]}, ${ink[2]}, ${ink[0]})`,
                        '--glow': fullyInked ? 'rgba(240,201,106,.5)' : `color-mix(in srgb, ${ink[0]} 45%, transparent)`,
                      } as React.CSSProperties}
                    />
                    <div className="tube-ticks">{parts.map((_, i) => <span key={i} />)}</div>
                  </div>
                  <span className="text-[10px] font-bold tabular-nums w-16 text-right" style={{ color: fullyInked ? '#f0c96a' : 'rgba(255,255,255,.5)' }}>
                    {fullyInked ? 'Fully inked' : `${inked}/${parts.length} inked`}
                  </span>
                </div>

                <div className="hidden lg:block">{pressButton}</div>
              </div>
            </motion.div>

            {/* ── THE SHEET: the entry itself, edited in place ── */}
            <motion.div variants={item} className="flex flex-col gap-4 lg:h-full lg:min-h-0">
              <div className="glass sheet lg:h-full lg:overflow-y-auto no-scrollbar" onPointerMove={followGlow}>
                {busyAll && <div className="sheet-roller" />}

                {/* Seal lands on the sheet after a successful save */}
                <AnimatePresence>
                  {pressed && (
                    <motion.div
                      className="absolute inset-0 z-20 flex items-center justify-center"
                      initial={{ backdropFilter: 'blur(0px)', background: 'rgba(7,6,10,0)' }}
                      animate={{ backdropFilter: 'blur(14px)', background: 'rgba(7,6,10,0.35)' }}
                      exit={{ opacity: 0 }}
                    >
                      {/* gold ripples spreading through the glass */}
                      {[0, 0.18].map(d => (
                        <motion.span
                          key={d}
                          className="absolute rounded-full"
                          style={{ width: 160, height: 160, border: '2px solid rgba(240,201,106,.7)' }}
                          initial={{ scale: 0.3, opacity: 1 }}
                          animate={{ scale: 5, opacity: 0 }}
                          transition={{ duration: 1.1, delay: d, ease: 'easeOut' }}
                        />
                      ))}
                      <motion.div
                        className="seal relative"
                        initial={{ scale: 2.2, rotate: -18, opacity: 0, y: -30 }}
                        animate={{ scale: 1, rotate: -6, opacity: 1, y: 0 }}
                        transition={{ type: 'spring', stiffness: 520, damping: 20 }}
                      >
                        <div className="text-[10px] tracking-[0.35em] uppercase opacity-70">Pressed into Library</div>
                        <div className="text-3xl mt-1 tracking-tight">{pressed}</div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* The headword changed after the entry was set — offer to re-set or clear */}
                <AnimatePresence>
                  {staleEntry && !busyAll && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="relative overflow-hidden"
                    >
                      <div className="hook flex flex-wrap items-center gap-x-3 gap-y-2 mb-5">
                        <p className="flex-1 min-w-[12rem] text-xs text-zinc-300">
                          This entry was written for <b className="text-[#f0c96a]">{entryFor}</b>, not <b className="text-white">{word.trim()}</b>.
                        </p>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={clearEntry}
                            className="text-[11px] font-bold px-3 py-1.5 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                            style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.14)' }}>
                            Clear
                          </button>
                          <button type="button" onClick={handleAutofillAll}
                            className="text-[11px] font-bold px-3 py-1.5 rounded-full transition-transform hover:scale-[1.03]"
                            style={{ background: 'linear-gradient(145deg,#f6dc94,#c8922a)', color: '#2a1a03', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.6)' }}>
                            Re-set for “{word.trim()}”
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div key={setPass} initial="hidden" animate="show" className="relative flex flex-col gap-7 lg:gap-[2.4vh]">

                  {/* Headword, with the register as a quiet dictionary label — tap to cycle */}
                  <motion.div custom={0} variants={typeset} className="flex items-baseline flex-wrap gap-x-3 gap-y-1">
                    <h2
                      className="text-[2rem] leading-none font-extrabold tracking-[-0.04em] break-words"
                      style={{ fontFamily: DISPLAY_FONT, color: hasWord ? '#fff' : 'rgba(255,255,255,.14)' }}
                    >
                      {hasWord ? <LiquidWord text={word.trim()} /> : 'headword'}
                    </h2>
                    <button
                      type="button"
                      className="register-tag"
                      onClick={() => setRegister(r => registers[(registers.findIndex(x => x.value === r) + 1) % registers.length].value)}
                      title="Register — tap to change"
                    >
                      {registers.find(r => r.value === register)?.label.toLowerCase()}
                    </button>
                  </motion.div>

                  {/* Definition */}
                  <motion.div custom={1} variants={typeset} className="entry-row">
                    <span className="entry-tag">def.</span>
                    <div className="min-w-0">
                      {loadingDefinition ? (
                        <div className="flex flex-col gap-2 py-2 animate-pulse"><div className="ghost-line w-11/12" /><div className="ghost-line w-2/3" /></div>
                      ) : (
                        <InkArea
                          value={definition}
                          onChange={e => setDefinition(e.target.value)}
                          placeholder="What does it mean?"
                          className="text-[1.05rem]"
                          required
                          aria-label="Definition"
                        />
                      )}
                    </div>
                    <div className="row-tools">
                      <RegenButton onClick={handleAutoDefinition} loading={loadingDefinition} disabled={busyAll || !hasWord} label="Rewrite definition" />
                    </div>
                  </motion.div>

                  {/* Example */}
                  <motion.div custom={2} variants={typeset} className="entry-row">
                    <span className="entry-tag">e.g.</span>
                    <div className="min-w-0">
                      {loadingExample ? (
                        <div className="flex flex-col gap-2 py-2 animate-pulse"><div className="ghost-line w-full" /><div className="ghost-line w-1/2" /></div>
                      ) : editingExample || !exampleSentence.trim() ? (
                        <InkArea
                          value={exampleSentence}
                          onChange={e => setExampleSentence(e.target.value)}
                          onFocus={() => setEditingExample(true)}
                          onBlur={() => setEditingExample(false)}
                          autoFocus={editingExample}
                          placeholder="Use it in a sentence…"
                          className="text-[1.05rem]"
                          style={{ fontFamily: SERIF_FONT, fontStyle: 'italic' }}
                          aria-label="Example sentence"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingExample(true)}
                          className="block w-full text-left text-[1.05rem] leading-relaxed text-zinc-300 rounded-xl px-2.5 py-1.5 -mx-2.5 hover:bg-white/[.03] transition-colors"
                          style={{ fontFamily: SERIF_FONT, fontStyle: 'italic' }}
                          title="Tap to edit"
                        >
                          <HighlightedExample sentence={exampleSentence} word={word} />
                        </button>
                      )}
                    </div>
                    <div className="row-tools">
                      <RegenButton onClick={handleAutoExample} loading={loadingExample} disabled={busyAll || !hasWord || !hasDef} label="New example" />
                    </div>
                  </motion.div>

                  {/* Memory hook */}
                  <motion.div custom={3} variants={typeset} className="entry-row">
                    <span className="entry-tag">n.b.</span>
                    <div className="min-w-0">
                      {loadingMemoryTrick ? (
                        <div className="hook animate-pulse flex flex-col gap-2"><div className="ghost-line w-3/4" style={{ background: 'rgba(240,201,106,.18)' }} /><div className="ghost-line w-11/12" style={{ background: 'rgba(240,201,106,.1)' }} /></div>
                      ) : memoryTrick ? (
                        <div className="hook" title={trickLabels[memoryTrick.technique]}>
                          <p className="text-[.95rem] font-medium leading-snug text-[#fde68a]">{memoryTrick.breakdown}</p>
                          <p className="text-xs leading-snug mt-1 text-zinc-400">{memoryTrick.clarification}</p>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleAutoMemoryTrick}
                          disabled={busyAll || !hasWord || !hasDef}
                          className="py-1.5 text-left text-sm italic text-white/20 transition-colors enabled:hover:text-[#f0c96a] disabled:cursor-default"
                          style={{ fontFamily: SERIF_FONT }}
                        >
                          {hasDef ? 'Add a memory hook' : 'Memory hook'}
                        </button>
                      )}
                    </div>
                    <div className="row-tools">
                      {memoryTrick && (
                        <button type="button" onClick={() => setMemoryTrick(null)} className="regen-btn" aria-label="Remove memory hook" title="Remove">
                          <X className="h-3 w-3" />
                        </button>
                      )}
                      <RegenButton onClick={handleAutoMemoryTrick} loading={loadingMemoryTrick} disabled={busyAll || !hasWord || !hasDef} label={memoryTrick ? 'New memory hook' : 'Write memory hook'} />
                    </div>
                  </motion.div>

                  {/* Synonyms */}
                  <motion.div custom={4} variants={typeset} className="entry-row">
                    <span className="entry-tag">syn.</span>
                    <ChipRow
                      items={synonyms}
                      onRemove={i => setSynonyms(p => p.filter((_, j) => j !== i))}
                      input={synonymInput} setInput={setSynonymInput} onAdd={addSynonym}
                      placeholder="synonym" tone="violet"
                    />
                    <div className="row-tools">
                      <RegenButton onClick={handleAutoSynonyms} loading={loadingSynonyms} disabled={busyAll || !hasWord || !hasDef} label="Suggest synonyms" />
                    </div>
                  </motion.div>

                  {/* Collocations */}
                  <motion.div custom={5} variants={typeset} className="entry-row">
                    <span className="entry-tag">col.</span>
                    <ChipRow
                      items={collocations}
                      onRemove={i => setCollocations(p => p.filter((_, j) => j !== i))}
                      input={collocationInput} setInput={setCollocationInput} onAdd={addCollocation}
                      placeholder="pairing" tone="teal"
                    />
                    <div className="row-tools">
                      <RegenButton onClick={handleAutoCollocations} loading={loadingCollocations} disabled={busyAll || !hasWord || !hasDef} label="Suggest collocations" />
                    </div>
                  </motion.div>
                </motion.div>
              </div>

              {/* On mobile the press button follows the sheet; on desktop it lives in the slab */}
              <div className="lg:hidden">{pressButton}</div>
            </motion.div>
          </div>
        </motion.form>
      </div>
    </AppLayout>
  );
}
