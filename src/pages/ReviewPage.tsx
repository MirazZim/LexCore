import { useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Moon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { calculateNextReview } from '@/lib/sm2';
import { useDueWords, useUpdateWordStats, useSaveWordContext, useWords, useWordStats, useReviewSessions } from '@/hooks/useWords';
import { supabase } from '@/lib/supabase';
import { BattlePhase } from '@/components/review/BattlePhase';
import { ContextPhase } from '@/components/review/ContextPhase';
import { CollocationPhase } from '@/components/review/CollocationPhase';
import { GenerationPhase } from '@/components/review/GenerationPhase';
import { SummaryPhase } from '@/components/review/SummaryPhase';
import { SynonymsPhase } from '@/components/review/SynonymsPhase';
import type { ReviewPhase, ReviewResult, AiFeedback, WordContext, WordCollocation } from '@/components/review/types';
import { scoreSentence } from '@/lib/llm';

export const RV_STYLES = `
  .rv-glass {
    background: rgba(24,24,27,0.55);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(255,255,255,0.05);
  }
  .rv-input {
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
  .rv-input::placeholder { color: #52525b; }
  .rv-input:focus { border-color: rgba(0,255,200,0.45); }
  .rv-textarea {
    width: 100%;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 0.875rem;
    padding: 0.75rem 1rem;
    color: #fff;
    font-size: 0.9rem;
    outline: none;
    resize: none;
    min-height: 100px;
    transition: border-color 0.2s;
  }
  .rv-textarea::placeholder { color: #52525b; }
  .rv-textarea:focus { border-color: rgba(0,255,200,0.45); }
  .rv-btn-mint {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 14px;
    border-radius: 1rem;
    font-weight: 700;
    font-size: 0.9rem;
    color: #18181b;
    background: linear-gradient(135deg, #2cffca 0%, #00FFC8 100%);
    box-shadow: 0 0 20px rgba(0,255,200,0.25);
    transition: opacity 0.15s, transform 0.15s;
    cursor: pointer;
  }
  .rv-btn-mint:hover { opacity: 0.88; transform: scale(1.015); }
  .rv-btn-mint:disabled { opacity: 0.35; transform: none; cursor: not-allowed; box-shadow: none; }
  .rv-btn-secondary {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 14px;
    border-radius: 1rem;
    font-weight: 600;
    font-size: 0.9rem;
    color: #a1a1aa;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    transition: all 0.15s;
    cursor: pointer;
  }
  .rv-btn-secondary:hover { background: rgba(255,255,255,0.09); color: #fff; border-color: rgba(255,255,255,0.15); }
`;

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
  const [collocations, setCollocations] = useState<WordCollocation[]>([]);
  const [synonyms, setSynonyms] = useState<string[]>([]);
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

  const loadWordData = async (wordId: string) => {
    const [ctxRes, colRes, synRes] = await Promise.all([
      supabase.from('word_contexts').select('*').eq('word_id', wordId),
      supabase.from('word_collocations').select('*').eq('word_id', wordId),
      supabase.from('semantic_connections').select('connected_word').eq('word_id', wordId).eq('connection_type', 'synonym'),
    ]);
    setContexts(ctxRes.data || []);
    setCollocations(colRes.data || []);
    setSynonyms((synRes.data || []).map((r: { connected_word: string }) => r.connected_word));
  };

  useEffect(() => {
    if (currentItem) loadWordData(currentItem.word.id);
  }, [currentItem?.word.id]);

  useEffect(() => {
    setRevealed(false);
    setClozeAnswer('');
    setClozeSubmitted(false);
  }, [currentIndex]);

  if (isLoading || !sessionReady) {
    return (
      <div className="min-h-screen px-4 pt-8 pb-24 max-w-lg mx-auto space-y-4">
        <Skeleton className="h-8 w-full rounded-2xl bg-zinc-800/60" />
        <Skeleton className="h-[420px] w-full rounded-[2rem] bg-zinc-800/60" />
      </div>
    );
  }

  if (isSleepPrep) {
    return (
      <div className="min-h-screen px-4 pt-8 pb-24 max-w-lg mx-auto">
        <style>{RV_STYLES}</style>
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center w-10 h-10 rounded-full"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#a1a1aa' }}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <Moon className="h-5 w-5" style={{ color: '#00FFC8' }} />
            <h1 className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Sleep Prep
            </h1>
          </div>
        </div>
        {sessionWords.length === 0 ? (
          <div className="text-center py-20">
            <Moon className="h-12 w-12 mx-auto mb-4 text-zinc-700" />
            <p className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              No recent words
            </p>
            <p className="text-sm text-zinc-500">Review some words first, then come back tonight.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sessionWords.map(({ word }) => (
              <div key={word.id} className="rv-glass p-5 rounded-2xl">
                <h2 className="text-xl font-bold mb-2" style={{ color: '#00FFC8', fontFamily: "'Space Grotesk', sans-serif" }}>
                  {word.word}
                </h2>
                <p className="text-zinc-300 text-sm mb-3">{word.definition}</p>
                {word.emotion_anchor && (
                  <p className="text-xs text-zinc-500 italic">💭 {word.emotion_anchor}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (totalWords === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <style>{RV_STYLES}</style>
        <div className="text-center">
          <p className="text-3xl font-bold text-white mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            All caught up!
          </p>
          <p className="text-zinc-500 mb-8">No words due for review right now.</p>
          <button onClick={() => navigate('/')} className="rv-btn-mint" style={{ width: 'auto', padding: '14px 40px' }}>
            Back to Dashboard
          </button>
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
      quality,
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
    if (contexts.length > 0) {
      setPhase('context');
    } else if (collocations.length > 0) {
      setPhase('collocation');
    } else {
      setPhase('generation');
    }
  };

  const handleClozeSubmit = () => setClozeSubmitted(true);

  const handleClozeNext = () => {
    setClozeAnswer('');
    setClozeSubmitted(false);
    setPhase(collocations.length > 0 ? 'collocation' : 'generation');
  };

  const handleCollocationNext = () => setPhase('generation');

  const handleSynonymsNext = () => {
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
        generationText.trim(),
      );
      setAiFeedback(parsed);
    } catch {
      setAiError(true);
    } finally {
      setAiLoading(false);
    }
  };

  const handleNextWord = () => {
    if (synonyms.length > 0) {
      setPhase('synonyms');
    } else {
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
    }
  };

  const progressPercent = phase === 'summary' ? 100 : (currentIndex / totalWords) * 100;

  if (phase === 'summary') {
    return <SummaryPhase results={results} sessionStartedAt={sessionStartRef.current} />;
  }

  return (
    <div className="min-h-screen px-4 pt-8 pb-24 max-w-lg mx-auto">
      <style>{RV_STYLES}</style>

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center justify-center w-10 h-10 rounded-full shrink-0"
          style={{ background: 'rgba(255,255,255,0.05)', color: '#a1a1aa' }}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%`, background: 'linear-gradient(90deg, #2cffca, #00FFC8)' }}
          />
        </div>

        <span className="text-xs font-bold text-zinc-500 shrink-0">
          {currentIndex + 1} / {totalWords}
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

        {phase === 'collocation' && currentItem && (
          <CollocationPhase
            currentItem={currentItem}
            currentIndex={currentIndex}
            collocations={collocations}
            onNext={handleCollocationNext}
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

        {phase === 'synonyms' && currentItem && (
          <SynonymsPhase
            currentItem={currentItem}
            currentIndex={currentIndex}
            totalWords={totalWords}
            synonyms={synonyms}
            onNext={handleSynonymsNext}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
