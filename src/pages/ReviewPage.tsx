import { useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { calculateNextReview } from '@/lib/sm2';
import { useDueWords, useUpdateWordStats, useSaveWordContext, useWords, useWordStats, useReviewSessions } from '@/hooks/useWords';
import { supabase } from '@/lib/supabase';
import { BattlePhase } from '@/components/review/BattlePhase';
import { ContextPhase } from '@/components/review/ContextPhase';
import { GenerationPhase } from '@/components/review/GenerationPhase';
import { SummaryPhase } from '@/components/review/SummaryPhase';
import type { ReviewPhase, ReviewResult, AiFeedback, WordContext } from '@/components/review/types';
import { scoreSentence } from '@/lib/llm'

export default function ReviewPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isSleepPrep = searchParams.get('mode') === 'sleep_prep';
  const sessionStartRef = useRef(new Date().toISOString());

  const { data: dueWordsData = [], isLoading } = useDueWords();
  const { data: allWords = [] } = useWords();
  const { data: allStats = [] } = useWordStats();
  const updateWordStats = useUpdateWordStats();
  const saveContext = useSaveWordContext();
  const { data: reviewSessions = [] } = useReviewSessions();

  // Compute streak
  const streak = (() => {
    if (reviewSessions.length === 0) return 0;
    const sessionDates = [...new Set(
      reviewSessions.map(s => {
        const d = new Date(s.started_at);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      })
    )].sort().reverse();
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;
    if (sessionDates[0] !== todayKey && sessionDates[0] !== yesterdayKey) return 0;
    let count = 0;
    const check = new Date(today);
    if (sessionDates[0] !== todayKey) check.setDate(check.getDate() - 1);
    for (let i = 0; i < 365; i++) {
      const key = `${check.getFullYear()}-${check.getMonth()}-${check.getDate()}`;
      if (sessionDates.includes(key)) { count++; check.setDate(check.getDate() - 1); }
      else break;
    }
    return count;
  })();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<ReviewPhase>('battle');
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<ReviewResult[]>([]);
  const [clozeAnswer, setClozeAnswer] = useState('');
  const [clozeSubmitted, setClozeSubmitted] = useState(false);
  const [generationText, setGenerationText] = useState('');
  const [generationSaved, setGenerationSaved] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<AiFeedback | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(false);
  const [contexts, setContexts] = useState<WordContext[]>([]);

  const [sessionWords, setSessionWords] = useState<typeof dueWordsData>([]);
  const [sessionReady, setSessionReady] = useState(false);

  const liveDueWords = isSleepPrep
    ? allStats
        .filter(s => s.last_reviewed_at && new Date(s.last_reviewed_at) >= new Date(Date.now() - 86400000))
        .map(stats => ({
          word: allWords.find(w => w.id === stats.word_id)!,
          stats,
        }))
        .filter(item => item.word)
    : dueWordsData;

  useEffect(() => {
    if (!sessionReady && liveDueWords.length > 0) {
      setSessionWords(liveDueWords);
      setSessionReady(true);
    }
  }, [liveDueWords, sessionReady]);

  const currentItem = sessionWords[currentIndex];
  const totalWords = sessionWords.length;

  const loadContexts = async (wordId: string) => {
    const { data } = await supabase
      .from('word_contexts')
      .select('*')
      .eq('word_id', wordId);
    setContexts(data || []);
  };

  useEffect(() => {
    if (currentItem) {
      loadContexts(currentItem.word.id);
    }
  }, [currentItem?.word.id]);

  useEffect(() => {
    setRevealed(false);
    setClozeAnswer('');
    setClozeSubmitted(false);
  }, [currentIndex]);

  if (isLoading || !sessionReady) {
    return (
      <div className="min-h-screen px-4 pt-6 max-w-lg mx-auto space-y-6">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isSleepPrep) {
    return (
      <div className="min-h-screen bg-background px-4 pt-6 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <Moon className="h-5 w-5 text-primary" />
            <h1 className="font-display text-xl font-bold">Sleep Prep</h1>
          </div>
        </div>
        {sessionWords.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Moon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-display text-lg">No recent words</p>
            <p className="text-sm mt-1">Review some words first, then come back tonight.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sessionWords.map(({ word }) => (
              <Card key={word.id} className="border-border/50">
                <CardContent className="p-5">
                  <h2 className="font-display text-xl font-bold text-primary mb-2">{word.word}</h2>
                  <p className="text-foreground mb-3">{word.definition}</p>
                  {word.emotion_anchor && (
                    <p className="text-sm text-muted-foreground italic">💭 {word.emotion_anchor}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (totalWords === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="font-display text-xl font-bold mb-2">All caught up!</p>
          <p className="text-muted-foreground mb-6">No words due for review right now.</p>
          <Button onClick={() => navigate('/')}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  const handleRate = async (quality: number) => {
    if (!currentItem) return;
    const result = calculateNextReview(
      currentItem.stats.ease_factor,
      currentItem.stats.interval_days,
      currentItem.stats.repetitions,
      quality
    );

    await updateWordStats.mutateAsync({
      wordStatsId: currentItem.stats.id,
      ease_factor: result.newEaseFactor,
      interval_days: result.newInterval,
      repetitions: result.newRepetitions,
      next_review_at: result.nextReviewAt.toISOString(),
      quality,
    });

    setResults(prev => [...prev, {
      wordId: currentItem.word.id,
      word: currentItem.word.word,
      quality,
      correct: quality >= 3,
    }]);
    setRevealed(false);
    setPhase(contexts.length > 0 ? 'context' : 'generation');
  };

  const handleClozeSubmit = () => {
    setClozeSubmitted(true);
  };

  const handleClozeNext = () => {
    setClozeAnswer('');
    setClozeSubmitted(false);
    setPhase('generation');
  };

  const handleGenerationSave = async () => {
    if (!currentItem) return;
    await saveContext.mutateAsync({
      word_id: currentItem.word.id,
      sentence: generationText.trim(),
      source_label: 'My sentence',
    });
    setGenerationSaved(true);

    setAiLoading(true);
    setAiError(false);
    try {
      const parsed = await scoreSentence(
  currentItem.word.word,
  currentItem.word.definition,
  generationText.trim()
)
setAiFeedback(parsed)
    } catch {
      setAiError(true);
    } finally {
      setAiLoading(false);
    }
  };

  const handleNextWord = () => {
    setGenerationText('');
    setGenerationSaved(false);
    setAiFeedback(null);
    setAiLoading(false);
    setAiError(false);
    if (currentIndex + 1 >= totalWords) {
      setPhase('summary');
    } else {
      setCurrentIndex(prev => prev + 1);
      setPhase('battle');
    }
  };

  const progressPercent = phase === 'summary'
    ? 100
    : (currentIndex / totalWords) * 100;

  if (phase === 'summary') {
    return <SummaryPhase results={results} sessionStartedAt={sessionStartRef.current} />;
  }

  return (
    <div className="min-h-screen px-4 pt-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <Progress value={progressPercent} className="h-2" />
        </div>
        <span className="text-xs text-muted-foreground font-display">
          Word {currentIndex + 1} of {totalWords}
        </span>
      </div>

      <AnimatePresence mode="wait">
        {phase === 'battle' && currentItem && (
          <BattlePhase
            currentItem={currentItem}
            currentIndex={currentIndex}
            revealed={revealed}
            onReveal={() => setRevealed(true)}
            onRate={handleRate}
            allWords={allWords}
            streak={streak}
          />
        )}

        {phase === 'context' && currentItem && (
          <ContextPhase
            currentItem={currentItem}
            currentIndex={currentIndex}
            contexts={contexts}
            clozeAnswer={clozeAnswer}
            clozeSubmitted={clozeSubmitted}
            onClozeAnswerChange={setClozeAnswer}
            onClozeSubmit={handleClozeSubmit}
            onClozeNext={handleClozeNext}
          />
        )}

        {phase === 'generation' && currentItem && (
          <GenerationPhase
            currentItem={currentItem}
            currentIndex={currentIndex}
            totalWords={totalWords}
            generationText={generationText}
            generationSaved={generationSaved}
            aiFeedback={aiFeedback}
            aiLoading={aiLoading}
            aiError={aiError}
            isSaving={saveContext.isPending}
            onGenerationTextChange={setGenerationText}
            onSave={handleGenerationSave}
            onNextWord={handleNextWord}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
