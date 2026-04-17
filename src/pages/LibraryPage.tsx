import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EaseBadge } from '@/components/EaseBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useWords, useWordStats, useWordContexts, useWordCollocations, useSemanticConnections, useDeleteWord } from '@/hooks/useWords';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const now = new Date();

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
        return stats && stats.repetitions >= 5;
      }
      return w.register === filter;
    });
  }, [words, wordStats, search, filter]);

  const selectedWord = selectedWordId ? words.find(w => w.id === selectedWordId) : null;
  const selectedStats = selectedWordId ? wordStats.find(s => s.word_id === selectedWordId) : null;

  const getDaysUntilReview = (wordId: string) => {
    const stats = wordStats.find(s => s.word_id === wordId);
    if (!stats) return null;
    const diff = Math.ceil((new Date(stats.next_review_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const isLoading = wordsLoading || statsLoading;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="px-4 pt-6 max-w-lg mx-auto space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-8 w-full" />
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="px-4 pt-6 max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-display text-2xl font-bold">Library</h1>
            <span className="text-sm text-muted-foreground">{words.length} words</span>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search words..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
            {filterOptions.map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border transition-all',
                  filter === f.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-secondary text-secondary-foreground border-border'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filteredWords.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-lg font-display">No words found</p>
              <p className="text-sm mt-1">Try a different search or filter</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredWords.map((word) => {
                const stats = wordStats.find(s => s.word_id === word.id);
                const daysUntil = getDaysUntilReview(word.id);
                return (
                  <motion.div key={word.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="border-border/50 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setSelectedWordId(word.id)}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-display font-semibold">{word.word}</span>
                              <Badge variant="outline" className="text-[10px]">{word.register}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{word.definition}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 ml-3">
                            {stats && <EaseBadge easeFactor={stats.ease_factor} />}
                            {daysUntil !== null && (
                              <span className={cn('text-[10px]', daysUntil <= 0 ? 'text-ease-learning' : 'text-muted-foreground')}>
                                {daysUntil <= 0 ? 'Due now' : `${daysUntil}d`}
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}

          <button
            onClick={() => navigate('/add')}
            className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-6 w-6" />
          </button>

          <Sheet open={!!selectedWordId} onOpenChange={(open) => !open && setSelectedWordId(null)}>
            <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
              {selectedWord && (
                <div className="space-y-6">
                  <SheetHeader>
                    <div className="flex items-center justify-between">
                      <SheetTitle className="font-display text-2xl">{selectedWord.word}</SheetTitle>
                      {!confirmDelete ? (
                        <button
                          onClick={() => setConfirmDelete(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-red-400 flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Sure?
                          </span>
                          <button
                            onClick={() => setConfirmDelete(false)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-secondary transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleDelete}
                            disabled={deleteWord.isPending}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-500/15 text-red-400 hover:bg-red-500/25 disabled:opacity-50 transition-colors"
                          >
                            {deleteWord.isPending ? 'Deleting…' : 'Delete'}
                          </button>
                        </div>
                      )}
                    </div>
                  </SheetHeader>
                  <div>
                    <p className="text-foreground">{selectedWord.definition}</p>
                    <div className="flex gap-2 mt-3">
                      <Badge variant="outline">{selectedWord.register}</Badge>
                      <Badge variant="outline">Freq: {selectedWord.frequency_band}/5</Badge>
                      {selectedStats && <EaseBadge easeFactor={selectedStats.ease_factor} />}
                    </div>
                  </div>
                  {selectedWord.emotion_anchor && (
                    <div>
                      <h3 className="font-display font-semibold text-sm text-muted-foreground mb-1">Emotion Anchor</h3>
                      <p className="text-sm italic">"{selectedWord.emotion_anchor}"</p>
                    </div>
                  )}
                  {selectedContexts.length > 0 && (
                    <div>
                      <h3 className="font-display font-semibold text-sm text-muted-foreground mb-2">Example Sentences</h3>
                      <div className="space-y-2">
                        {selectedContexts.map(ctx => (
                          <div key={ctx.id} className="rounded-lg bg-secondary p-3">
                            <p className="text-sm">"{ctx.sentence}"</p>
                            <p className="text-[10px] text-muted-foreground mt-1">— {ctx.source_label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedCollocations.length > 0 && (
                    <div>
                      <h3 className="font-display font-semibold text-sm text-muted-foreground mb-2">Collocations</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedCollocations.map(c => (
                          <Badge key={c.id} variant="secondary">{c.collocation}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedConnections.length > 0 && (
                    <div>
                      <h3 className="font-display font-semibold text-sm text-muted-foreground mb-2">Semantic Connections</h3>
                      <div className="space-y-1">
                        {selectedConnections.map(c => (
                          <div key={c.id} className="flex items-center gap-2 text-sm">
                            <Badge variant="outline" className="text-[10px]">{c.connection_type}</Badge>
                            <span>{c.connected_word}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedStats && (
                    <div>
                      <h3 className="font-display font-semibold text-sm text-muted-foreground mb-2">Review Stats</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg bg-secondary p-3">
                          <div className="text-xs text-muted-foreground">Ease Factor</div>
                          <div className="font-display font-bold">{selectedStats.ease_factor.toFixed(2)}</div>
                        </div>
                        <div className="rounded-lg bg-secondary p-3">
                          <div className="text-xs text-muted-foreground">Interval</div>
                          <div className="font-display font-bold">{selectedStats.interval_days}d</div>
                        </div>
                        <div className="rounded-lg bg-secondary p-3">
                          <div className="text-xs text-muted-foreground">Correct</div>
                          <div className="font-display font-bold text-ease-strong">{selectedStats.times_correct}</div>
                        </div>
                        <div className="rounded-lg bg-secondary p-3">
                          <div className="text-xs text-muted-foreground">Incorrect</div>
                          <div className="font-display font-bold text-ease-struggling">{selectedStats.times_incorrect}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </SheetContent>
          </Sheet>
        </motion.div>
      </div>
    </AppLayout>
  );
}
