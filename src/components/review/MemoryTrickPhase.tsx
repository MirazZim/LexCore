import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Volume2, ArrowDown, ArrowRight } from 'lucide-react';
import type { DueWordItem } from './types';
import { HERO, HERO_BUTTON, HERO_MUTED, SURFACE, ink } from './twoTone';

interface Props {
  currentItem: DueWordItem;
  currentIndex: number;
  onNext: () => void;
}

const AMBER = '#fbbf24';
// The hook is drawn on the light surface, so it uses the deeper amber.
const AMBER_INK = ink(AMBER);
const FONT_DISPLAY = "'Space Grotesk', sans-serif";
const CARD_STYLE = { height: 'min(calc(100dvh - 13rem), 640px)' };

// ── Parse the trick into a technique-specific shape ───────────────
// The trick line comes from the LLM in one of 7 formats (see llm.ts prompt).
// Each is parsed into a structure we can draw; anything unparseable falls
// back to the "scene" view, so a malformed trick still renders fine.

interface Part { main: string; note?: string }

type Hook =
  | { kind: 'split'; label: string; parts: Part[]; meaning: string }
  | { kind: 'formula'; lhs: string; terms: string[] }
  | { kind: 'contrast'; not: string; is: string }
  | { kind: 'sound'; alike: string; meaning: string }
  | { kind: 'analogy'; like: string; but: string }
  | { kind: 'scene'; text: string };

const stripQuotes = (s: string) => s.trim().replace(/^["'“‘]+|["'”’]+$/g, '').trim();
// Separator between the two halves of a trick: an em/en dash, or a hyphen only
// when spaced — so hyphenated words like 'a-rid' or 'self-made' aren't split.
const SEP = '(?:\\s*[—–]\\s*|\\s+-\\s+)';

/** "bene (like benefit)" → { main: 'bene', note: 'like benefit' }. Tolerates a
 *  stray "word = " prefix and parts that are only a bracketed gloss. */
function parsePart(raw: string): Part {
  let s = raw.trim();
  const eq = s.lastIndexOf('=');
  if (eq !== -1) s = s.slice(eq + 1).trim();
  const m = s.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
  if (!m) return { main: stripQuotes(s) };
  const main = stripQuotes(m[1]);
  return main ? { main, note: m[2].trim() } : { main: m[2].trim() };
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseHook(line: string, word: string): Hook {
  const full = stripQuotes(line);
  // Drop a leading "word =" / "word:" / "word →" echo of the headword
  // (kept in `full` — a formula's left-hand side IS the headword)
  const text = full.replace(new RegExp(`^${escapeRegex(word)}\\s*[=:→]\\s*`, 'i'), '');

  // phonetic_split / root_hook: "a + dept → meaning"
  const arrow = text.split('→');
  if (arrow.length >= 2 && arrow[0].includes('+')) {
    const parts = arrow[0].split('+').map(parsePart).filter(p => p.main);
    if (parts.length >= 2) {
      const isRoot = parts.some(p => p.note);
      return {
        kind: 'split',
        label: isRoot ? '🌱 Root Hook' : '🔤 Phonetic Split',
        parts,
        meaning: arrow.slice(1).join('→').trim(),
      };
    }
  }

  // contrast_anchor: "NOT shy — they simply choose not to talk"
  const contrast = text.match(new RegExp(`^NOT\\s+(.+?)${SEP}(.+)$`));
  if (contrast) return { kind: 'contrast', not: contrast[1].trim(), is: contrast[2].trim() };

  // sound_alike: "sounds like 'a-rid' — rid of ALL moisture"
  const sound = text.match(new RegExp(`sounds?\\s+like\\s+(.+?)${SEP}(.+)$`, 'i'));
  if (sound) return { kind: 'sound', alike: stripQuotes(sound[1]), meaning: sound[2].trim() };

  // formula: "ambivalent = 'yes' + 'no' …"
  const eq = full.indexOf('=');
  if (eq > 0 && /[+×*]/.test(full.slice(eq))) {
    // Unwrap quoted segments anywhere in a term: "'no' running…" → "no running…"
    const unquote = (t: string) => t.replace(/['"‘“]([^'"’”]+)['"’”]/g, '$1').trim();
    const terms = full.slice(eq + 1).split(/\s+[+]\s+/).map(unquote).filter(Boolean);
    if (terms.length >= 2) return { kind: 'formula', lhs: stripQuotes(full.slice(0, eq)), terms };
  }

  // analogy_bridge: "Like cleaning your house — except you're replacing walls"
  const analogy = text.match(new RegExp(`^Like\\s+(.+?)(?:${SEP}|,\\s*)(?:but|except)\\s+(.+)$`, 'i'));
  if (analogy) return { kind: 'analogy', like: analogy[1].trim(), but: analogy[2].trim() };

  // micro_story and anything else
  return { kind: 'scene', text };
}

const HOOK_LABEL: Record<Hook['kind'], string> = {
  split: '',
  formula: '⚡ Formula',
  contrast: '↔️ Contrast',
  sound: '🔊 Sound-Alike',
  analogy: '🔗 Analogy',
  scene: '🎬 Micro Story',
};

// ── Visuals per technique ─────────────────────────────────────────
const pop = (i: number) => ({
  initial: { opacity: 0, y: 10, scale: 0.9 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { type: 'spring' as const, stiffness: 380, damping: 22, delay: 0.25 + i * 0.18 },
});

function Chip({ children, tone = 'amber', strike = false }: { children: React.ReactNode; tone?: 'amber' | 'rose' | 'mint' | 'plain'; strike?: boolean }) {
  const tones = {
    amber: { bg: '#fef3c7', border: '#fcd34d', color: '#92400e' },
    rose: { bg: '#ffe4e6', border: '#fda4af', color: '#be123c' },
    mint: { bg: '#d1fae5', border: '#6ee7b7', color: '#047857' },
    plain: { bg: '#ffffff', border: 'rgba(15,23,20,0.12)', color: '#18181b' },
  }[tone];
  return (
    <span
      className="inline-block px-3 py-1.5 rounded-xl text-base font-bold"
      style={{
        background: tones.bg,
        border: `1px solid ${tones.border}`,
        color: tones.color,
        fontFamily: FONT_DISPLAY,
        textDecoration: strike ? 'line-through' : 'none',
        textDecorationThickness: 2,
      }}
    >
      {children}
    </span>
  );
}

function Meaning({ text, delay }: { text: string; delay: number }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="text-[15px] leading-snug text-center text-zinc-800 max-w-sm"
    >
      {text}
    </motion.p>
  );
}

function DownArrow({ delay }: { delay: number }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="w-7 h-7 rounded-full flex items-center justify-center"
      style={{ background: '#fef3c7', border: '1px solid #fcd34d' }}
    >
      <ArrowDown className="h-3.5 w-3.5" style={{ color: AMBER_INK }} />
    </motion.span>
  );
}

function HookVisual({ hook, word }: { hook: Hook; word: string }) {
  switch (hook.kind) {
    case 'split': {
      const end = 0.25 + hook.parts.length * 0.18;
      return (
        <div className="flex flex-col items-center gap-3">
          <div className="flex flex-wrap items-start justify-center gap-2">
            {hook.parts.map((p, i) => (
              <motion.div key={i} {...pop(i)} className="flex items-start gap-2">
                {i > 0 && <span className="text-zinc-400 font-bold mt-1.5">+</span>}
                <div className="flex flex-col items-center">
                  <Chip>{p.main}</Chip>
                  {p.note && <span className="text-[11px] text-zinc-500 mt-1 max-w-[9rem] text-center leading-tight">{p.note}</span>}
                </div>
              </motion.div>
            ))}
          </div>
          <DownArrow delay={end} />
          <Meaning text={hook.meaning} delay={end + 0.15} />
        </div>
      );
    }
    case 'formula':
      return (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <motion.span {...pop(0)}><Chip tone="plain">{hook.lhs || word}</Chip></motion.span>
          <motion.span {...pop(1)} className="text-xl font-black" style={{ color: AMBER_INK }}>=</motion.span>
          {hook.terms.map((t, i) => (
            <motion.span key={i} {...pop(i + 2)} className="flex items-center gap-2">
              {i > 0 && <span className="text-zinc-400 font-bold">+</span>}
              <Chip>{t}</Chip>
            </motion.span>
          ))}
        </div>
      );
    case 'contrast':
      return (
        <div className="flex flex-col items-center gap-3">
          <motion.div {...pop(0)} className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-rose-600">Not</span>
            <Chip tone="rose" strike>{hook.not}</Chip>
          </motion.div>
          <DownArrow delay={0.5} />
          <motion.div {...pop(2)} className="flex items-start gap-2 max-w-sm">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mt-1">Is</span>
            <p className="text-[15px] leading-snug text-zinc-900">{hook.is}</p>
          </motion.div>
        </div>
      );
    case 'sound':
      return (
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2.5">
            <motion.span {...pop(0)}><Chip tone="plain">{word}</Chip></motion.span>
            <motion.span {...pop(1)} className="text-xl font-black" style={{ color: AMBER_INK }}>≈</motion.span>
            <motion.span {...pop(2)}><Chip>“{hook.alike}”</Chip></motion.span>
          </div>
          <DownArrow delay={0.75} />
          <Meaning text={hook.meaning} delay={0.9} />
        </div>
      );
    case 'analogy':
      return (
        <div className="flex flex-col items-center gap-3 max-w-sm">
          <motion.div {...pop(0)} className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Like</span>
            <Chip tone="plain">{hook.like}</Chip>
          </motion.div>
          <DownArrow delay={0.45} />
          <motion.div {...pop(2)} className="flex items-start gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest mt-1" style={{ color: AMBER_INK }}>But</span>
            <p className="text-[15px] leading-snug text-zinc-900">{hook.but}</p>
          </motion.div>
        </div>
      );
    default:
      return <Typewriter text={hook.text} />;
  }
}

/** Micro stories play out word by word, like a scene being narrated. */
function Typewriter({ text }: { text: string }) {
  const words = text.split(/\s+/);
  return (
    <p className="text-lg leading-relaxed text-center text-zinc-900 max-w-sm" style={{ fontFamily: FONT_DISPLAY }}>
      {words.map((w, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, filter: 'blur(4px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          transition={{ delay: 0.25 + i * 0.07, duration: 0.25 }}
        >
          {w}{' '}
        </motion.span>
      ))}
    </p>
  );
}

function highlight(sentence: string, word: string) {
  const re = new RegExp(`(${escapeRegex(word)}\\w*)`, 'gi');
  return sentence.split(re).map((part, i) =>
    i % 2 === 1 ? <span key={i} className="font-semibold" style={{ color: AMBER_INK }}>{part}</span> : <span key={i}>{part}</span>
  );
}

// ── Component ─────────────────────────────────────────────────────
export function MemoryTrickPhase({ currentItem, onNext }: Props) {
  const word = currentItem.word.word;
  const raw = currentItem.word.emotion_anchor ?? '';
  const newlineIdx = raw.indexOf('\n');
  const breakdown = newlineIdx !== -1 ? raw.slice(0, newlineIdx).trim() : raw.trim();
  const example = (newlineIdx !== -1 ? raw.slice(newlineIdx + 1).trim() : '').replace(/^👉\s*/, '');

  const hook = parseHook(breakdown, word);
  const label = hook.kind === 'split' ? hook.label : HOOK_LABEL[hook.kind];

  useEffect(() => {
    // Fresh keydown only — auto-repeat from a held Enter must not skip ahead.
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.repeat) onNext();
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [onNext]);

  const speak = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.lang = 'en-US';
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  };

  return (
    <motion.div
      key={`memory-trick-${currentItem.word.id}`}
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -22 }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      className="mt-4"
    >
      <div className="rounded-[2rem] overflow-hidden flex flex-col relative" style={{ ...SURFACE, ...CARD_STYLE }}>
        {/* ── Hero: badge, word, definition on the green ───────────── */}
        <div className="relative shrink-0 pb-5" style={{ background: HERO.background }}>
          <div className="px-6 pt-5 flex items-center justify-between gap-2">
            <span
              className="text-[9px] uppercase tracking-[0.25em] font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
              style={{ background: 'rgba(251,191,36,0.14)', color: AMBER }}
            >
              🪝 Memory Hook
            </span>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/10" style={{ color: HERO_MUTED }}>
              {label}
            </span>
          </div>

          <div className="px-6 pt-5 text-center">
            <div className="inline-flex items-center gap-2.5">
              <motion.h2
                initial={{ opacity: 0, scale: 0.85, filter: 'blur(8px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                transition={{ type: 'spring', stiffness: 180, damping: 18 }}
                className="font-bold leading-none text-white"
                style={{ fontSize: 'clamp(2rem, 6vw, 2.75rem)', fontFamily: FONT_DISPLAY }}
              >
                {word}
              </motion.h2>
              <button
                onClick={speak}
                aria-label={`Pronounce ${word}`}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <Volume2 className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[13px] mt-2.5 leading-snug max-w-sm mx-auto" style={{ color: HERO_MUTED }}>{currentItem.word.definition}</p>
          </div>
        </div>

        {/* ── The hook, drawn ──────────────────────────────────────── */}
        <div className="relative flex-1 min-h-0 px-6 py-4 flex items-center justify-center overflow-hidden">
          <HookVisual hook={hook} word={word} />
        </div>

        {/* ── Example in use ───────────────────────────────────────── */}
        {example && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="relative shrink-0 mx-6 mb-4 rounded-2xl px-4 py-3 text-[13px] leading-relaxed text-zinc-600 bg-white"
            style={{ border: '1px solid rgba(15,23,20,0.08)', boxShadow: '0 1px 2px rgba(15,23,20,0.05)' }}
          >
            <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-zinc-400 block mb-1">In the wild</span>
            {highlight(example, word)}
          </motion.div>
        )}

        {/* ── Continue ─────────────────────────────────────────────── */}
        <div className="relative shrink-0 px-6 pb-6">
          <motion.button
            onClick={onNext}
            whileHover={{ filter: 'brightness(1.25)' }}
            whileTap={{ scale: 0.985 }}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold"
            style={HERO_BUTTON}
          >
            Got it <ArrowRight className="h-4 w-4" />
            <kbd
              className="hidden sm:inline-flex items-center justify-center h-5 px-1 rounded-md text-[10px] bg-white/15"
            >
              ↵
            </kbd>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
