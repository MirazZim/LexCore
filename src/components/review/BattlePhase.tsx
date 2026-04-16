import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Flame, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DueWordItem } from './types';
import type { Word } from '@/lib/types';

const qualityButtons = [
  { quality: 0, label: 'Again', className: 'bg-quality-again hover:bg-quality-again/80 text-white' },
  { quality: 2, label: 'Hard', className: 'bg-quality-hard hover:bg-quality-hard/80 text-white' },
  { quality: 4, label: 'Good', className: 'bg-quality-good hover:bg-quality-good/80 text-white' },
  { quality: 5, label: 'Easy', className: 'bg-quality-easy hover:bg-quality-easy/80 text-white' },
];

interface BattlePhaseProps {
  currentItem: DueWordItem;
  currentIndex: number;
  revealed: boolean;
  onReveal: () => void;
  onRate: (quality: number) => void;
  allWords: Word[];
  streak: number;
}

type BattleStep = 'quiz' | 'quiz-result' | 'recall' | 'progress';

export function BattlePhase({ currentItem, currentIndex, revealed, onReveal, onRate, allWords, streak }: BattlePhaseProps) {
  const [step, setStep] = useState<BattleStep>('quiz');
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const isCorrect = selectedAnswer === currentItem.word.definition;

  const choices = useMemo(() => {
    const correctDef = currentItem.word.definition;
    const otherDefs = allWords
      .filter(w => w.id !== currentItem.word.id && w.definition !== correctDef)
      .map(w => w.definition);
    const shuffled = otherDefs.sort(() => Math.random() - 0.5);
    const wrong = shuffled.slice(0, 3);
    while (wrong.length < 3) wrong.push(`Definition ${wrong.length + 2}`);
    return [correctDef, ...wrong].sort(() => Math.random() - 0.5);
  }, [currentItem.word.id]);

  const handleSelect = (answer: string) => {
    setSelectedAnswer(answer);
    setStep('quiz-result');
  };

  const handleContinueToRecall = () => {
    setStep('recall');
    // If quiz was correct, auto-reveal the definition
    if (isCorrect) {
      onReveal();
    }
  };

  const handleRate = (quality: number) => {
    setStep('progress');
    // Small delay to show progress before moving on
    setTimeout(() => onRate(quality), 0);
  };

  return (
    <motion.div
      key={`battle-${currentIndex}`}
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.3 }}
    >
      <AnimatePresence mode="wait">
        {/* Step 1: Multiple choice quiz */}
        {step === 'quiz' && (
          <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card className="border-border/50 mt-8">
              <CardContent className="p-8 text-center">
                <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Pick the correct meaning</p>
                <h2 className="font-display text-4xl font-bold text-primary mb-8">{currentItem.word.word}</h2>
                <div className="grid gap-3">
                  {choices.map((choice, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelect(choice)}
                      className="w-full text-left px-5 py-4 rounded-2xl border border-border/50 bg-secondary/50 hover:bg-secondary hover:border-primary/30 transition-all text-sm text-foreground active:scale-[0.98]"
                    >
                      <span className="text-muted-foreground font-semibold mr-3">{String.fromCharCode(65 + i)}.</span>
                      {choice}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 2: Show correct/wrong result */}
        {step === 'quiz-result' && (
          <motion.div key="quiz-result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <Card className={cn(
              'mt-8 border-2',
              isCorrect ? 'border-[hsl(var(--quality-easy))]/50' : 'border-[hsl(var(--quality-again))]/50'
            )}>
              <CardContent className="p-8 text-center">
                <div className="mb-4">
                  {isCorrect ? (
                    <CheckCircle2 className="h-16 w-16 mx-auto text-[hsl(var(--quality-easy))]" />
                  ) : (
                    <XCircle className="h-16 w-16 mx-auto text-[hsl(var(--quality-again))]" />
                  )}
                </div>
                <h3 className={cn(
                  'font-display text-2xl font-bold mb-2',
                  isCorrect ? 'text-[hsl(var(--quality-easy))]' : 'text-[hsl(var(--quality-again))]'
                )}>
                  {isCorrect ? 'Correct!' : 'Not quite'}
                </h3>
                {!isCorrect && (
                  <div className="my-4 text-left bg-secondary/50 rounded-xl p-4">
                    <p className="text-xs text-muted-foreground mb-1">Your answer:</p>
                    <p className="text-sm text-[hsl(var(--quality-again))] line-through mb-3">{selectedAnswer}</p>
                    <p className="text-xs text-muted-foreground mb-1">Correct answer:</p>
                    <p className="text-sm text-[hsl(var(--quality-easy))]">{currentItem.word.definition}</p>
                  </div>
                )}
                <Button onClick={handleContinueToRecall} className="w-full h-12 rounded-2xl mt-4">
                  Continue to Recall
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 3: Original recall flow — reveal definition + rate */}
        {step === 'recall' && (
          <motion.div key="recall" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card className="border-border/50 mt-8">
              <CardContent className="p-8 text-center">
                <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Battle Mode</p>
                <h2 className="font-display text-4xl font-bold text-primary mb-8">{currentItem.word.word}</h2>
                {!revealed ? (
                  <Button variant="secondary" className="w-full h-12 rounded-2xl" onClick={onReveal}>
                    Reveal Definition
                  </Button>
                ) : (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <p className="text-foreground text-lg mb-4">{currentItem.word.definition}</p>
                    {currentItem.word.example_sentence && (
                      <p className="text-sm text-muted-foreground italic mb-6">"{currentItem.word.example_sentence}"</p>
                    )}

                    {/* Streak / progress bar */}
                    <div className="flex items-center justify-center gap-6 mb-6 py-3 bg-secondary/30 rounded-xl">
                      <div className="flex items-center gap-1.5">
                        <Flame className="h-4 w-4 text-[hsl(var(--quality-hard))]" />
                        <span className="font-display text-sm font-bold">{streak}</span>
                        <span className="text-xs text-muted-foreground">streak</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <span className="font-display text-sm font-bold">{(currentItem.stats.ease_factor * 100 / 2.5).toFixed(0)}%</span>
                        <span className="text-xs text-muted-foreground">ease</span>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground mb-3">How well did you recall this?</p>
                    <div className="grid grid-cols-4 gap-2">
                      {qualityButtons.map(btn => (
                        <button
                          key={btn.quality}
                          onClick={() => handleRate(btn.quality)}
                          className={cn('rounded-xl py-3 text-sm font-semibold transition-all active:scale-95', btn.className)}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
