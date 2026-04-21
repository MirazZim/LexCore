import { useState, useMemo, useEffect, type ReactNode } from 'react';
import { motion, type Variants } from 'framer-motion';
import { Search, Plus, Trash2, AlertTriangle, BookOpen, Clock, Sparkles, Quote } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { EaseBadge } from '@/components/EaseBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useWords, useWordStats, useWordContexts, useWordCollocations, useSemanticConnections, useDeleteWord } from '@/hooks/useWords';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { currentRetrievability, dbStateToCard } from '@/lib/fsrs';

/* ─── Animation variants ─────────────────────────────────────────── */
const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
};

/* ─── Helpers ────────────────────────────────────────────────────── */

// Highlight the target word (and simple inflections) inside a sentence.
function highlightWord(text: string, word: string): ReactNode {
  if (!text || !word) return text;
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped}\\w*)`, 'gi');
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIndex) parts.push(text.slice(lastIndex, m.index));
    parts.push(
      <span key={m.index} className="text-[#00FFC8] font-semibold">{m[0]}</span>
    );
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length > 0 ? <>{parts}</> : text;
}

type MemoryStatus = { label: string; color: string; description: string };

function getMemoryStatus(stats: { repetitions: number; difficulty: number; times_correct: number; times_incorrect: number } | null | undefined): MemoryStatus {
  if (!stats) return {
    label: 'New word',
    color: '#71717a',
    description: 'Just added to your arsenal — first encounter coming soon.',
  };
  const total = stats.times_correct + stats.times_incorrect;
  const accuracy = total > 0 ? stats.times_correct / total : 0;

  if (stats.stability >= 21 && stats.state === 2 && accuracy >= 0.8) return {
    label: 'Strong memory',
    color: '#00FFC8',
    description: "This word has settled in. You'll likely reach for it without thinking.",
  };
  if (stats.repetitions >= 3 && accuracy >= 0.7) return {
    label: 'Almost mastered',
    color: '#84cc16',
    description: 'Close — a few more solid recalls and it becomes yours.',
  };
  if (accuracy < 0.5 && total >= 2) return {
    label: 'Needs a quick revisit',
    color: '#f97316',
    description: 'The trace is fragile. Meet it again to lock it in.',
  };
  if (stats.repetitions >= 1) return {
    label: 'Getting familiar',
    color: '#eab308',
    description: 'The connection is forming. Keep meeting it in different contexts.',
  };
  return {
    label: 'Just met',
    color: '#a1a1aa',
    description: 'Early days. First impressions matter — take a moment with it.',
  };
}

function formatTimeUntil(nextReviewAt: string, now: Date): string {
  const diffMs = new Date(nextReviewAt).getTime() - now.getTime();
  if (diffMs <= 0) return 'Ready now';
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''}`;
  const hours = Math.round(diffMs / 3600000);
  if (hours < 24) return `${hours} hr${hours !== 1 ? 's' : ''}`;
  const days = Math.round(diffMs / 86400000);
  if (days < 14) return `${days} day${days !== 1 ? 's' : ''}`;
  const weeks = Math.round(days / 7);
  if (weeks < 8) return `${weeks} week${weeks !== 1 ? 's' : ''}`;
  const months = Math.round(days / 30);
  return `${months} month${months !== 1 ? 's' : ''}`;
}

const filterOptions: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'due', label: 'Due' },
  { value: 'mastered', label: 'Mastered' },
  { value: 'formal', label: 'Formal' },
  { value: 'casual', label: 'Casual' },
  { value: 'literary', label: 'Literary' },
  { value: 'slang', label: 'Slang' },
];

export default function LibraryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const now = useMemo(() => new Date(), []);

  useEffect(() => {
    const wordParam = searchParams.get('word');
    if (wordParam) setSelectedWordId(wordParam);
  }, [searchParams]);

  const { data: words = [], isLoading: wordsLoading } = useWords();
  const { data: wordStats = [], isLoading: statsLoading } = useWordStats();
  const { data: selectedContexts = [] } = useWordContexts(selectedWordId ?? undefined);
  const { data: selectedCollocations = [] } = useWordCollocations(selectedWordId ?? undefined);
  const { data: selectedConnections = [] } = useSemanticConnections(selectedWordId ?? undefined);
  const deleteWord = useDeleteWord();

  const handleDelete = async () => {
    if (!selectedWordId) return;
    try {
      await deleteWord.mutateAsync(selectedWordId);
      toast.success('Word deleted');
      setSelectedWordId(null);
      setConfirmDelete(false);
    } catch {
      toast.error('Failed to delete word');
    }
  };

  const filteredWords = useMemo(() => {
    return words.filter((w) => {
      if (search && !w.word.toLowerCase().includes(search.toLowerCase()) && !w.definition.toLowerCase().includes(search.toLowerCase())) return false;
      if (filter === 'all') return true;
      if (filter === 'due') {
        const stats = wordStats.find(s => s.word_id === w.id);
        return stats && new Date(stats.next_review_at) <= now;
      }
      if (filter === 'mastered') {
        const stats = wordStats.find(s => s.word_id === w.id);
        return stats && stats.state === 2 && stats.stability >= 21;
      }
      return w.register === filter;
    });
  }, [words, wordStats, search, filter, now]);

  const selectedWord = selectedWordId ? words.find(w => w.id === selectedWordId) : null;
  const selectedStats = selectedWordId ? wordStats.find(s => s.word_id === selectedWordId) : null;

  const getNextReviewLabel = (wordId: string) => {
    const stats = wordStats.find(s => s.word_id === wordId);
    if (!stats) return null;
    return formatTimeUntil(stats.next_review_at, now);
  };

  /* ── Derived stats ──────────────────────────────────────────────── */
  const totalWords = words.length;
  const dueCount = wordStats.filter(s => new Date(s.next_review_at) <= now).length;
  const masteredCount = wordStats.filter(s => s.state === 2 && s.stability >= 21).length;

  const isLoading = wordsLoading || statsLoading;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="px-6 pt-8 pb-24 max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-72 w-full rounded-[2rem] bg-zinc-800/60" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-[1.5rem] bg-zinc-800/60" />)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40 rounded-2xl bg-zinc-800/60" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Theme styles (match Index.tsx) */}
      <style>{`
        .glass-panel {
          background: rgba(24, 24, 27, 0.55);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.05);
        }
        .glow-mint { box-shadow: 0 0 28px rgba(0,255,200,0.25); }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { scrollbar-width: none; }
      `}</style>

      <div className="px-6 pt-8 pb-28 max-w-5xl mx-auto">
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">

          {/* ── Top row ─────────────────────────────────────────── */}
          <motion.div variants={item} className="flex items-center justify-between">
            <span
              className="inline-flex items-center gap-2 px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.3em]"
              style={{ background: 'rgba(0,255,200,0.1)', color: '#00FFC8' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#00FFC8] animate-pulse" />
              Library · {totalWords} word{totalWords !== 1 ? 's' : ''}
            </span>

            <button
              onClick={() => navigate('/add')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm text-zinc-900 transition-all hover:scale-105 glow-mint"
              style={{ background: 'linear-gradient(135deg, #2cffca 0%, #00FFC8 100%)' }}
            >
              <Plus className="h-4 w-4" />
              Add Word
            </button>
          </motion.div>

          {/* ── Search ─────────────────────────────────────────── */}
          <motion.div variants={item} className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              placeholder="Search your arsenal..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-12 pl-12 pr-4 rounded-full bg-zinc-900/60 border border-white/5 text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#00FFC8]/40 transition-colors backdrop-blur-xl"
            />
          </motion.div>

          {/* ── Filters ────────────────────────────────────────── */}
          <motion.div variants={item} className="flex gap-2 overflow-x-auto scrollbar-hide -mt-4">
            {filterOptions.map(f => {
              const isActive = filter === f.value;
              return (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={cn(
                    'shrink-0 rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all border',
                    isActive
                      ? 'border-transparent text-zinc-900 glow-mint'
                      : 'border-white/5 text-zinc-400 bg-zinc-900/40 hover:text-white hover:border-white/20'
                  )}
                  style={isActive ? { background: 'linear-gradient(135deg, #2cffca 0%, #00FFC8 100%)' } : undefined}
                >
                  {f.label}
                </button>
              );
            })}
          </motion.div>

          {/* ── Stats bento ────────────────────────────────────────── */}
          <motion.div variants={item} className="grid grid-cols-3 gap-4">
            <div className="glass-panel p-5 rounded-[1.5rem] flex flex-col justify-between h-32 hover:border-[#00FFC8]/20 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">Total</span>
                <BookOpen className="h-4 w-4 text-zinc-600" />
              </div>
              <span className="text-4xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{totalWords}</span>
            </div>

            <div className="glass-panel p-5 rounded-[1.5rem] flex flex-col justify-between h-32 hover:border-[#00FFC8]/20 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">Due</span>
                <Clock className="h-4 w-4 text-zinc-600" />
              </div>
              <span
                className="text-4xl font-bold"
                style={{ fontFamily: "'Space Grotesk', sans-serif", color: dueCount > 0 ? '#00FFC8' : 'white' }}
              >
                {dueCount}
              </span>
            </div>

            <div className="glass-panel p-5 rounded-[1.5rem] flex flex-col justify-between h-32 hover:border-[#00FFC8]/20 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">Mastered</span>
                <Sparkles className="h-4 w-4 text-zinc-600" />
              </div>
              <span className="text-4xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{masteredCount}</span>
            </div>
          </motion.div>

          {/* ── Word grid ──────────────────────────────────────────── */}
          {filteredWords.length === 0 ? (
            <motion.div variants={item} className="glass-panel rounded-[2rem] p-16 text-center">
              <p className="text-xl font-bold text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                No words found
              </p>
              <p className="text-sm text-zinc-500">Try a different search or filter</p>
            </motion.div>
          ) : (
            <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredWords.map(word => {
                const stats = wordStats.find(s => s.word_id === word.id);
                const nextLabel = getNextReviewLabel(word.id);
                const mastery = stats ? Math.min(Math.round((stats.stability / 30) * 100), 100) : 0;
                const isStar = stats && stats.state === 2 && stats.stability >= 21;
                const isDue = nextLabel === 'Ready now';

                return (
                  <motion.div
                    key={word.id}
                    layout
                    whileHover={{ y: -2 }}
                    onClick={() => setSelectedWordId(word.id)}
                    className="glass-panel rounded-2xl p-5 cursor-pointer transition-colors hover:border-[#00FFC8]/25"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0 flex-1">
                        <h4
                          className="text-xl font-bold text-white leading-tight truncate"
                          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                          {word.word}
                        </h4>
                        <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-white/5 text-zinc-400">
                          {word.register}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        {stats && <EaseBadge difficulty={stats.difficulty} />}
                        <span style={{ color: isStar ? '#00FFC8' : '#3f3f46', fontSize: 16 }}>★</span>
                      </div>
                    </div>

                    <p className="text-zinc-500 text-xs leading-relaxed mb-4 line-clamp-2">
                      {word.definition}
                    </p>

                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-[3px] rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${mastery}%`, background: '#00FFC8' }}
                        />
                      </div>
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider"
                        style={{ color: isDue ? '#00FFC8' : '#52525b' }}
                      >
                        {isDue ? 'Due' : nextLabel ?? '—'}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

        </motion.div>

        {/* ── Detail modal ────────────────────────────────────────── */}
        <Dialog
          open={!!selectedWordId}
          onOpenChange={(open) => { if (!open) { setSelectedWordId(null); setConfirmDelete(false); } }}
        >
          <DialogContent
            className="max-w-2xl w-[calc(100%-2rem)] p-0 gap-0 bg-zinc-950 border-white/5 rounded-[1.5rem] overflow-hidden flex flex-col max-h-[85vh]"
          >
            {selectedWord && (() => {
              const memory = getMemoryStatus(selectedStats);
              const totalAttempts = selectedStats ? selectedStats.times_correct + selectedStats.times_incorrect : 0;
              const accuracyPct = totalAttempts > 0 ? Math.round((selectedStats!.times_correct / totalAttempts) * 100) : 0;
              const nextReview = selectedStats ? formatTimeUntil(selectedStats.next_review_at, now) : null;
              const recallPct = selectedStats ? Math.round(currentRetrievability(dbStateToCard(selectedStats)) * 100) : 0;
              const stabilityLabel = selectedStats
                ? selectedStats.stability < 1 ? 'Hours'
                  : selectedStats.stability < 7 ? `${Math.round(selectedStats.stability)}d`
                  : selectedStats.stability < 30 ? `${Math.round(selectedStats.stability / 7)}w`
                  : `${Math.round(selectedStats.stability / 30)}mo`
                : '—';
              const stageLabel = selectedStats ? (['New', 'Learning', 'Review', 'Relearning'][selectedStats.state] ?? '—') : '—';

              return (
              <>
                {/* ── Hero header ─────────────────────────────────── */}
                <DialogHeader className="shrink-0 px-8 pt-8 pb-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <DialogTitle
                      className="text-5xl font-bold text-white text-left leading-none tracking-tight"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {selectedWord.word}
                    </DialogTitle>
                    <span
                      className="shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap"
                      style={{ background: `${memory.color}14`, color: memory.color, boxShadow: `inset 0 0 0 1px ${memory.color}30` }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: memory.color, boxShadow: `0 0 8px ${memory.color}` }} />
                      {memory.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/5 text-zinc-400">
                      {selectedWord.register}
                    </span>
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/5 text-zinc-400">
                      Frequency {selectedWord.frequency_band}/5
                    </span>
                  </div>
                </DialogHeader>

                {/* ── Scrollable body ─────────────────────────────── */}
                <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-8">

                  {/* Meaning — accent border for prominence */}
                  <div className="pl-5 border-l-2 border-[#00FFC8]/60">
                    <p className="text-lg leading-relaxed text-white/90" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 400 }}>
                      {selectedWord.definition}
                    </p>
                  </div>

                  {/* Emotion anchor — evocative pull quote */}
                  {selectedWord.emotion_anchor && (
                    <figure className="relative rounded-2xl bg-gradient-to-br from-[#00FFC8]/[0.06] via-transparent to-transparent border border-white/5 p-6">
                      <Quote className="absolute top-5 left-5 h-4 w-4 text-[#00FFC8]/40" />
                      <blockquote className="text-base italic text-zinc-100 leading-relaxed pl-8">
                        {selectedWord.emotion_anchor}
                      </blockquote>
                      <figcaption className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#00FFC8]/70 mt-3 pl-8">
                        The feeling
                      </figcaption>
                    </figure>
                  )}

                  {/* In the wild — examples as scenes with the word highlighted */}
                  {selectedContexts.length > 0 && (
                    <section>
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500 mb-3">In the wild</h3>
                      <div className="space-y-3">
                        {selectedContexts.map(ctx => (
                          <div key={ctx.id} className="relative rounded-2xl bg-white/[0.03] border border-white/5 p-5 pl-6 overflow-hidden">
                            <span className="absolute left-0 top-4 bottom-4 w-[2px] bg-[#00FFC8]/40 rounded-full" />
                            <p className="text-[15px] text-zinc-200 leading-relaxed">
                              {highlightWord(ctx.sentence, selectedWord.word)}
                            </p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mt-2.5">
                              {ctx.source_label}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Natural pairings — collocations as usage phrases */}
                  {selectedCollocations.length > 0 && (
                    <section>
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500 mb-3">Natural pairings</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedCollocations.map(c => (
                          <div
                            key={c.id}
                            className="rounded-xl bg-white/[0.03] border border-white/5 px-4 py-3 text-[15px] text-zinc-200 hover:border-[#00FFC8]/20 transition-colors"
                          >
                            {highlightWord(c.collocation, selectedWord.word)}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Webs of meaning — semantic connections */}
                  {selectedConnections.length > 0 && (
                    <section>
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500 mb-3">Webs of meaning</h3>
                      <div className="space-y-1.5">
                        {selectedConnections.map(c => (
                          <div
                            key={c.id}
                            className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/5 px-4 py-2.5"
                          >
                            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500 w-20 shrink-0">
                              {c.connection_type}
                            </span>
                            <span className="text-[15px] text-zinc-100">{c.connected_word}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Memory — human-language status */}
                  <section>
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500 mb-3">Memory</h3>
                    <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6 space-y-5">
                      {/* Status */}
                      <div>
                        <div className="flex items-center gap-3 mb-1.5">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: memory.color, boxShadow: `0 0 14px ${memory.color}` }} />
                          <span className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                            {memory.label}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-400 leading-relaxed pl-5">{memory.description}</p>
                      </div>

                      {selectedStats && (
                        <>
                          {/* Recall chance + Memory lasts */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-xl bg-white/[0.03] border border-white/5 px-4 py-3">
                              <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-500 block mb-1">Recall chance</span>
                              <span className="text-2xl font-bold text-white leading-none" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                                {recallPct}%
                              </span>
                              <div className="h-1 rounded-full bg-zinc-800 mt-2 overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${recallPct}%`, background: memory.color }} />
                              </div>
                            </div>
                            <div className="rounded-xl bg-white/[0.03] border border-white/5 px-4 py-3">
                              <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-500 block mb-1">Memory lasts</span>
                              <span className="text-2xl font-bold text-white leading-none" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                                {stabilityLabel}
                              </span>
                              <span className="text-[10px] text-zinc-500 block mt-1">{stageLabel}</span>
                            </div>
                          </div>

                          {/* Recalled / Missed / Accuracy inline */}
                          <div className="flex items-center gap-4">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{selectedStats.times_correct}</span>
                              <span className="text-[11px] text-zinc-500">recalled</span>
                            </div>
                            <div className="h-3 w-px bg-zinc-800" />
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{selectedStats.times_incorrect}</span>
                              <span className="text-[11px] text-zinc-500">missed</span>
                            </div>
                            {totalAttempts > 0 && (
                              <>
                                <div className="h-3 w-px bg-zinc-800" />
                                <span className="text-[11px] text-zinc-400">{accuracyPct}% accuracy</span>
                              </>
                            )}
                          </div>
                        </>
                      )}

                      {selectedStats && (
                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">Next encounter</span>
                          <span className="text-sm font-bold" style={{ color: nextReview === 'Ready now' ? '#00FFC8' : 'white', fontFamily: "'Space Grotesk', sans-serif" }}>
                            {nextReview}
                          </span>
                        </div>
                      )}
                    </div>
                  </section>
                </div>

                {/* Footer: Delete action */}
                <div className="shrink-0 px-7 py-4 border-t border-white/5 bg-zinc-950/80 backdrop-blur-xl flex items-center justify-end gap-2">
                  {!confirmDelete ? (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider text-red-400 border border-red-500/20 hover:bg-red-500/10 hover:border-red-500/40 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete Word
                    </button>
                  ) : (
                    <>
                      <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-red-400 mr-auto">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Are you sure?
                      </span>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={deleteWord.isPending}
                        className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30 disabled:opacity-50 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {deleteWord.isPending ? 'Deleting…' : 'Confirm Delete'}
                      </button>
                    </>
                  )}
                </div>
              </>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
