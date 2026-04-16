import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { DueWordItem, AiFeedback } from './types';

interface GenerationPhaseProps {
  currentItem: DueWordItem;
  currentIndex: number;
  totalWords: number;
  generationText: string;
  generationSaved: boolean;
  aiFeedback: AiFeedback | null;
  aiLoading: boolean;
  aiError: boolean;
  isSaving: boolean;
  onGenerationTextChange: (value: string) => void;
  onSave: () => void;
  onNextWord: () => void;
}

export function GenerationPhase({
  currentItem, currentIndex, totalWords, generationText, generationSaved,
  aiFeedback, aiLoading, aiError, isSaving,
  onGenerationTextChange, onSave, onNextWord,
}: GenerationPhaseProps) {
  return (
    <motion.div key={`gen-${currentIndex}`} initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ duration: 0.3 }}>
      <Card className="border-border/50 mt-8">
        <CardContent className="p-6">
          <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Generation Lab</p>
          <h2 className="font-display text-2xl font-bold text-primary mb-1">{currentItem.word.word}</h2>
          <p className="text-sm text-muted-foreground mb-6">{currentItem.word.definition}</p>
          <p className="text-foreground font-display mb-3">Write your own sentence using this word:</p>
          {!generationSaved ? (
            <div className="space-y-3">
              <Textarea placeholder="Type your sentence..." value={generationText} onChange={(e) => onGenerationTextChange(e.target.value)} className="min-h-[100px]" />
              <Button className="w-full rounded-2xl" onClick={onSave} disabled={!generationText.trim() || isSaving || aiLoading}>
                {isSaving || aiLoading ? (
                  <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Checking...</span>
                ) : 'Submit'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-secondary p-3">
                <p className="text-sm">"{generationText}"</p>
                <p className="text-[10px] text-muted-foreground mt-1">— My sentence</p>
              </div>

              {aiLoading && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking your sentence...
                </div>
              )}

              {aiFeedback && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="rounded-xl border border-border/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      'rounded-full px-3 py-1 text-xs font-bold',
                      aiFeedback.verdict === 'natural' && 'bg-ease-strong/20 text-ease-strong',
                      aiFeedback.verdict === 'close' && 'bg-quality-hard/20 text-quality-hard',
                      aiFeedback.verdict === 'unnatural' && 'bg-quality-again/20 text-quality-again',
                    )}>
                      {aiFeedback.verdict === 'natural' ? '✓ Natural' : aiFeedback.verdict === 'close' ? '⚡ Almost there' : '✗ Try again'}
                    </span>
                    <span className="font-display font-bold text-lg">{aiFeedback.score}/10</span>
                  </div>
                  <p className="text-sm"><span className="text-ease-strong font-semibold">What worked:</span> {aiFeedback.what_worked}</p>
                  {aiFeedback.fix && (
                    <p className="text-sm"><span className="text-quality-hard font-semibold">Fix:</span> {aiFeedback.fix}</p>
                  )}
                  {aiFeedback.better_example && (
                    <blockquote className="border-l-2 border-muted-foreground/30 pl-3 text-sm text-muted-foreground italic">
                      {aiFeedback.better_example}
                    </blockquote>
                  )}
                </motion.div>
              )}

              {aiError && (
                <p className="text-sm text-muted-foreground">AI feedback unavailable — your sentence was saved.</p>
              )}

              {(!aiLoading) && (
                <Button className="w-full rounded-2xl" onClick={onNextWord}>
                  {currentIndex + 1 >= totalWords ? 'View Summary' : 'Next Word'}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
