import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Plus, Check } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { informalWords, formalWords, collocations } from '@/lib/native-pulse-data';
import type { NativePulseWord, NativePulseCollocation } from '@/lib/native-pulse-data';
import { cn } from '@/lib/utils';
import { useAddNativePulseWord } from '@/hooks/useWords';

function WordCard({ item, onAdd }: { item: NativePulseWord; onAdd: () => void }) {
  const [added, setAdded] = useState(false);
  const handleAdd = () => { setAdded(true); onAdd(); };

  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <span className="font-display font-bold text-lg">{item.word}</span>
            <div className="flex gap-2 mt-1">
              <Badge variant="outline" className="text-[10px]">{item.register}</Badge>
              <Badge variant="outline" className="text-[10px]">Freq: {item.frequency_band}/5</Badge>
            </div>
          </div>
          <button onClick={handleAdd} disabled={added} className={cn('flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-all', added ? 'bg-ease-strong/20 text-ease-strong' : 'bg-primary/20 text-primary hover:bg-primary/30')}>
            {added ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
            {added ? 'Added' : 'Add'}
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-3">{item.definition}</p>
        <div className="space-y-1.5">
          {item.examples.map((ex, i) => (
            <div key={i} className="rounded-lg bg-secondary p-2.5">
              <p className="text-xs">"{ex.sentence}"</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">— {ex.source}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CollocationCard({ item, onAdd }: { item: NativePulseCollocation; onAdd: () => void }) {
  const [added, setAdded] = useState(false);
  const handleAdd = () => { setAdded(true); onAdd(); };

  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <span className="font-display font-bold">{item.phrase}</span>
          <button onClick={handleAdd} disabled={added} className={cn('flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-all', added ? 'bg-ease-strong/20 text-ease-strong' : 'bg-primary/20 text-primary hover:bg-primary/30')}>
            {added ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
            {added ? 'Added' : 'Add'}
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-3">{item.definition}</p>
        <div className="space-y-1.5">
          {item.examples.map((ex, i) => (
            <div key={i} className="rounded-lg bg-secondary p-2.5">
              <p className="text-xs">"{ex.sentence}"</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">— {ex.source}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function NativePulsePage() {
  const addNativePulseWord = useAddNativePulseWord();

  const handleAddWord = async (item: NativePulseWord) => {
    try {
      await addNativePulseWord.mutateAsync({
        word: item.word,
        definition: item.definition,
        register: item.register,
        frequency_band: item.frequency_band,
        contexts: item.examples.map(ex => ({ sentence: ex.sentence, source_label: ex.source })),
      });
      toast.success(`"${item.word}" added to your library!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add word');
    }
  };

  const handleAddCollocation = async (item: NativePulseCollocation) => {
    try {
      await addNativePulseWord.mutateAsync({
        word: item.phrase,
        definition: item.definition,
        register: 'formal',
        frequency_band: 4,
        contexts: item.examples.map(ex => ({ sentence: ex.sentence, source_label: ex.source })),
      });
      toast.success(`"${item.phrase}" added to your library!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add');
    }
  };

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

  return (
    <AppLayout>
      <div className="px-4 pt-6 max-w-lg mx-auto">
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.div variants={item} className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-5 w-5 text-primary" />
              <h1 className="font-display text-2xl font-bold">Native Pulse</h1>
            </div>
            <p className="text-sm text-muted-foreground">Words native speakers actually use</p>
          </motion.div>

          <motion.div variants={item} className="mb-8">
            <h2 className="font-display text-lg font-semibold mb-3 text-ease-learning">🔥 Trending Informal</h2>
            <div className="space-y-3">
              {informalWords.map(w => (
                <motion.div key={w.word} variants={item}>
                  <WordCard item={w} onAdd={() => handleAddWord(w)} />
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div variants={item} className="mb-8">
            <h2 className="font-display text-lg font-semibold mb-3 text-primary">📚 Formal & Professional</h2>
            <div className="space-y-3">
              {formalWords.map(w => (
                <motion.div key={w.word} variants={item}>
                  <WordCard item={w} onAdd={() => handleAddWord(w)} />
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div variants={item} className="mb-8">
            <h2 className="font-display text-lg font-semibold mb-3 text-ease-strong">🔗 Collocations You're Missing</h2>
            <div className="space-y-3">
              {collocations.map(c => (
                <motion.div key={c.phrase} variants={item}>
                  <CollocationCard item={c} onAdd={() => handleAddCollocation(c)} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
