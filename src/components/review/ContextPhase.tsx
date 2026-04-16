import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { DueWordItem, WordContext } from './types';

interface ContextPhaseProps {
  currentItem: DueWordItem;
  currentIndex: number;
  contexts: WordContext[];
  clozeAnswer: string;
  clozeSubmitted: boolean;
  onClozeAnswerChange: (value: string) => void;
  onClozeSubmit: () => void;
  onClozeNext: () => void;
}

export function ContextPhase({
  currentItem, currentIndex, contexts, clozeAnswer, clozeSubmitted,
  onClozeAnswerChange, onClozeSubmit, onClozeNext,
}: ContextPhaseProps) {
  const clozeContext = contexts[0];
  const clozeSentence = clozeContext?.sentence.replace(
    new RegExp(currentItem.word.word, 'gi'),
    '______'
  );
  const isClozeCorrect = clozeAnswer.toLowerCase().trim() === currentItem.word.word.toLowerCase();

  return (
    <motion.div key={`context-${currentIndex}`} initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ duration: 0.3 }}>
      <Card className="border-border/50 mt-8">
        <CardContent className="p-6">
          <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Context Theater</p>
          <p className="font-display text-lg mb-6">Fill in the blank:</p>
          {clozeSentence ? (
            <>
              <p className="text-foreground text-base mb-6 leading-relaxed">"{clozeSentence}"</p>
              {!clozeSubmitted ? (
                <div className="space-y-3">
                  <Input placeholder="Type the missing word..." value={clozeAnswer} onChange={(e) => onClozeAnswerChange(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && clozeAnswer.trim() && onClozeSubmit()} />
                  <Button className="w-full rounded-2xl" onClick={onClozeSubmit} disabled={!clozeAnswer.trim()}>Check</Button>
                </div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className={cn('rounded-xl p-4 mb-4', isClozeCorrect ? 'bg-ease-strong/20' : 'bg-ease-struggling/20')}>
                    <p className={cn('font-display font-bold', isClozeCorrect ? 'text-ease-strong' : 'text-ease-struggling')}>
                      {isClozeCorrect ? '✓ Correct!' : `✗ The answer was "${currentItem.word.word}"`}
                    </p>
                    {!isClozeCorrect && <p className="text-sm text-muted-foreground mt-1">{currentItem.word.definition}</p>}
                  </div>
                  <Button className="w-full rounded-2xl" onClick={onClozeNext}>Continue</Button>
                </motion.div>
              )}
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-3">No context sentence available</p>
              <Button onClick={onClozeNext}>Skip to next phase</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
