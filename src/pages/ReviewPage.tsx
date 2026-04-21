import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Moon, CheckCircle2, Flame, X, Brain, Zap, Clock3 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Rating } from 'ts-fsrs';
import { dbStateToCard } from '@/lib/fsrs';
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
  const { data: reviewSessions = [], isLoading: sessionsLoading } = useReviewSessions();

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
  const [showScienceModal, setShowScienceModal] = useState(false);
  const [sleepCountdown, setSleepCountdown] = useState('');
  const [isSleepPrepActive, setIsSleepPrepActive] = useState(false);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const h = now.getHours();
      const active = h >= 20 || h < 3;
      setIsSleepPrepActive(active);
      const target = new Date(now);
      if (active) {
        if (h >= 20) target.setDate(target.getDate() + 1);
        target.setHours(3, 0, 0, 0);
      } else {
        target.setHours(20, 0, 0, 0);
      }
      const diff = target.getTime() - now.getTime();
      const hh = Math.floor(diff / 3600000);
      const mm = Math.floor((diff % 3600000) / 60000);
      const ss = Math.floor((diff % 60000) / 1000);
      setSleepCountdown(
        `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

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
    if (!isLoading && !sessionReady) {
      setSessionWords(liveDueWords);
      setSessionReady(true);
    }
  }, [isLoading, liveDueWords, sessionReady]);

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

  if (isLoading || sessionsLoading || !sessionReady) {
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
      <div className="min-h-screen px-4 pt-8 pb-24 max-w-lg mx-auto flex flex-col justify-center">
        <style>{RV_STYLES}</style>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-6"
        >
          {/* Badge */}
          <div className="flex justify-center">
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.3em]"
              style={{ background: 'rgba(0,255,200,0.1)', color: '#00FFC8' }}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Today's mission complete
            </span>
          </div>

          {/* Headline */}
          <div className="text-center">
            <h1
              className="text-4xl font-bold text-white leading-tight mb-3"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              You've done<br />
              <span style={{ color: '#00FFC8' }}>today's part.</span>
            </h1>
            <p className="text-zinc-400 text-base leading-relaxed mb-4">
              Your brain is consolidating right now.<br />
              Don't skip tonight — sleep prep locks it in.
            </p>
            <button
              onClick={() => setShowScienceModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#a1a1aa', border: '1px solid rgba(255,255,255,0.09)' }}
            >
              <Brain className="w-4 h-4" />
              Why is Sleep Prep important?
            </button>
          </div>

          {/* Sleep Prep card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="rv-glass rounded-[1.75rem] p-6"
            style={isSleepPrepActive ? { border: '1px solid rgba(0,255,200,0.18)' } : undefined}
          >
            <div className="flex items-start gap-4 mb-4">
              <div
                className="flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(0,255,200,0.1)' }}
              >
                <Moon className="w-5 h-5" style={{ color: '#00FFC8' }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-white font-bold text-base" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Sleep Prep Mode
                  </p>
                  {isSleepPrepActive && (
                    <span
                      className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(0,255,200,0.12)', color: '#00FFC8' }}
                    >
                      Live
                    </span>
                  )}
                </div>
                <p className="text-zinc-500 text-sm mt-1">
                  {isSleepPrepActive
                    ? 'Active now — revisit today\'s words before bed.'
                    : 'Available 8 PM – 3 AM. Locks in what you learned.'}
                </p>
              </div>
            </div>

            {/* Countdown */}
            <div
              className="rounded-xl px-4 py-3 flex items-center justify-between"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <span className="text-xs text-zinc-500 font-medium">
                {isSleepPrepActive ? 'Ends in' : 'Starts in'}
              </span>
              <span
                className="text-lg font-bold tabular-nums tracking-widest"
                style={{ color: isSleepPrepActive ? '#00FFC8' : '#52525b', fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {sleepCountdown}
              </span>
            </div>

            {isSleepPrepActive && (
              <button
                onClick={() => navigate('/review?mode=sleep_prep')}
                className="rv-btn-mint mt-3"
              >
                <Moon className="w-4 h-4" />
                Start Sleep Prep
              </button>
            )}
          </motion.div>

          {/* Streak card */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="rv-glass rounded-[1.75rem] p-5 flex items-center gap-5"
          >
            <div
              className="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(249,115,22,0.12)' }}
            >
              <Flame className="w-7 h-7" style={{ color: '#f97316' }} />
            </div>
            <div className="flex-1">
              <p
                className="text-3xl font-bold text-white leading-none"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {streak} day{streak !== 1 ? 's' : ''}
              </p>
              <p className="text-zinc-500 text-xs mt-1">
                {streak > 0
                  ? "Don't review tomorrow and your streak resets."
                  : 'Start your streak — come back tomorrow.'}
              </p>
            </div>
          </motion.div>

          {/* Dashboard link */}
          <button
            onClick={() => navigate('/')}
            className="rv-btn-secondary"
          >
            Back to Dashboard
          </button>
        </motion.div>

        {/* Science modal */}
        <AnimatePresence>
          {showScienceModal && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowScienceModal(false)}
                className="fixed inset-0 z-40"
                style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
              />

              {/* Sheet */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto rounded-t-[2rem] px-6 pt-6 pb-10"
                style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                {/* Handle */}
                <div className="w-10 h-1 rounded-full bg-zinc-700 mx-auto mb-6" />

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    The Science of Sleep Prep
                  </h2>
                  <button
                    onClick={() => setShowScienceModal(false)}
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.07)', color: '#71717a' }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Cards */}
                <div className="space-y-3">
                  <div className="rounded-2xl p-4 flex gap-4" style={{ background: 'rgba(0,255,200,0.07)', border: '1px solid rgba(0,255,200,0.12)' }}>
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,255,200,0.12)' }}>
                      <Brain className="w-5 h-5" style={{ color: '#00FFC8' }} />
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm mb-1">Memory Consolidation</p>
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        During sleep, your hippocampus replays what you learned and transfers it to long-term memory. Reviewing words right before sleep feeds this process directly.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl p-4 flex gap-4" style={{ background: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.12)' }}>
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.12)' }}>
                      <Zap className="w-5 h-5" style={{ color: '#f97316' }} />
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm mb-1">The Spacing Effect</p>
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        Two exposures to a word in one day — once during review, once before sleep — is dramatically more effective than one. Your retention can jump by up to 40%.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl p-4 flex gap-4" style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.12)' }}>
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.12)' }}>
                      <Clock3 className="w-5 h-5" style={{ color: '#8b5cf6' }} />
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm mb-1">The Last 5 Minutes Rule</p>
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        What you think about in the final minutes before sleep gets prioritised for consolidation. Sleep prep is timed exactly for this window.
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-center text-zinc-600 text-xs mt-5">
                  Based on research by Walker (2017), Stickgold (2005), and Ebbinghaus forgetting curve studies.
                </p>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  const handleRate = async (rating: Rating) => {
    if (!currentItem) return;

    const cardBefore = dbStateToCard(currentItem.stats);

    await updateWordStats.mutateAsync({
      wordStatsId: currentItem.stats.id,
      wordId: currentItem.word.id,
      rating,
      cardBefore,
    });

    setResults(prev => [...prev, {
      wordId: currentItem.word.id,
      word: currentItem.word.word,
      quality: rating,
      correct: rating !== Rating.Again, // FSRS: anything above Again counts as successful
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

  const handleGenerationRetry = () => {
    setGenerationText('');
    setGenerationSaved(false);
    setAiFeedback(null);
    setAiLoading(false);
    setAiError(false);
  };

  const handleGenerationSave = async () => {
    if (!currentItem) return;
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

  const handleNextWord = async () => {
    if (!currentItem) return;
    await saveContext.mutateAsync({
      word_id: currentItem.word.id,
      sentence: generationText.trim(),
      source_label: 'My sentence',
    });
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
            onRetry={handleGenerationRetry}
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
