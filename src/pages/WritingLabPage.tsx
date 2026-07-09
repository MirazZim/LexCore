import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, PenLine, Timer, CheckCheck, Zap, Clock, Pause, Play, Square } from 'lucide-react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { generateCREIPrompt, scoreCREI } from '@/lib/llm';
import type { CREIPrompt, CREIFeedback } from '@/lib/llm';
import { useRecentPromptTexts, useTodaysAttemptCount, useSaveWritingAttempt } from '@/hooks/useWritingAttempts';
import { RV_STYLES } from '@/lib/rv-styles';
import PromptCard from '@/components/writing/PromptCard';
import WritingComposer from '@/components/writing/WritingComposer';
import WritingFeedback from '@/components/writing/WritingFeedback';

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function WritingLabPage() {
  const navigate = useNavigate();

  // ── Server state ────────────────────────────────────────────────
  const recentPrompts = useRecentPromptTexts();
  const todayCount = useTodaysAttemptCount();
  const saveAttempt = useSaveWritingAttempt();

  // ── UI state ─────────────────────────────────────────────────────
  const [started, setStarted] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState<CREIPrompt | null>(null);
  const [userText, setUserText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState<CREIFeedback | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState(false);
  const [gradeLoading, setGradeLoading] = useState(false);
  const [gradeError, setGradeError] = useState(false);

  // ── Timer state ──────────────────────────────────────────────────
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [timerPaused, setTimerPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  function runInterval() {
    timerRef.current = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function startTimer() {
    if (timerSeconds !== null) return;
    setTimerSeconds(40 * 60);
    setTimerPaused(false);
    runInterval();
  }

  function pauseTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setTimerPaused(true);
  }

  function resumeTimer() {
    setTimerPaused(false);
    runInterval();
  }

  function stopTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setTimerSeconds(null);
    setTimerPaused(false);
  }

  // ── Generate prompt ──────────────────────────────────────────────
  async function generate() {
    setGenLoading(true);
    setGenError(false);
    try {
      const result = await generateCREIPrompt({
        exclude: recentPrompts.data ?? [],
      });
      setCurrentPrompt(result);
    } catch {
      setGenError(true);
    } finally {
      setGenLoading(false);
    }
  }

  function handleStart() {
    setStarted(true);
    generate();
  }

  // ── Submit + grade ───────────────────────────────────────────────
  async function handleSubmit() {
    if (!currentPrompt) return;
    setGradeLoading(true);
    setGradeError(false);
    try {
      const result = await scoreCREI(
        currentPrompt.prompt,
        currentPrompt.questionType,
        userText,
      );
      setFeedback(result);
      setSubmitted(true);
      saveAttempt.mutate({
        prompt: currentPrompt.prompt,
        prompt_meta: {
          questionType: currentPrompt.questionType,
          domain: currentPrompt.domain,
        },
        user_text: userText,
        word_count: userText.trim().split(/\s+/).filter(Boolean).length,
        band_task_response: result.bands.task_response,
        band_coherence: result.bands.coherence,
        band_lexical: result.bands.lexical,
        band_grammar: result.bands.grammar,
        band_overall: result.bands.overall,
        feedback: result,
        flagged_issues: result.flagged_issues.map(i => i.code),
      });
    } catch {
      setGradeError(true);
    } finally {
      setGradeLoading(false);
    }
  }

  // ── Post-feedback actions ────────────────────────────────────────
  function handleTryAgain() {
    setUserText('');
    setFeedback(null);
    setSubmitted(false);
    setGradeError(false);
  }

  function handleNewPrompt() {
    setCurrentPrompt(null);
    setUserText('');
    setFeedback(null);
    setSubmitted(false);
    setGradeError(false);
    generate();
  }

  const count = todayCount.data ?? 0;

  const timerColor =
    timerSeconds === null ? '#00FFC8'
      : timerSeconds === 0 ? '#ef4444'
        : timerSeconds < 5 * 60 ? '#ef4444'
          : timerSeconds < 10 * 60 ? '#fbbf24'
            : '#00FFC8';

  const showTimerButton = started && !feedback && userText.trim().length > 0 && timerSeconds === null;

  // ── Prompt panel content ─────────────────────────────────────────
  const promptPanel = genLoading && !currentPrompt ? (
    <div className="space-y-4">
      <Skeleton className="h-5 w-2/5 rounded-full bg-zinc-800/70" />
      <Skeleton className="h-40 w-full rounded-3xl bg-zinc-800/60" />
      <Skeleton className="h-16 w-full rounded-2xl bg-zinc-800/50" />
    </div>
  ) : genError && !currentPrompt ? (
    <div
      className="rounded-3xl p-8 text-center space-y-4 flex flex-col items-center justify-center"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
      >
        <span className="text-red-400 text-lg font-bold">!</span>
      </div>
      <div>
        <p className="text-sm font-semibold text-white mb-1">Couldn't load a prompt</p>
        <p className="text-xs text-zinc-500">Check your connection and try again.</p>
      </div>
      <button
        onClick={generate}
        className="rv-btn-secondary"
        style={{ width: 'auto', padding: '10px 24px' }}
      >
        Retry
      </button>
    </div>
  ) : currentPrompt ? (
    <PromptCard prompt={currentPrompt} />
  ) : null;

  // ── Landing screen ───────────────────────────────────────────────
  if (!started) {
    return (
      <div
        className="flex flex-col"
        style={{ height: '100dvh', minHeight: '100vh', background: '#09090b' }}
      >
        <style>{RV_STYLES}</style>

        {/* Header */}
        <header
          className="shrink-0 flex items-center gap-3 px-5 md:px-8"
          style={{
            height: '56px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(9,9,11,0.85)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 transition-all duration-150 hover:scale-105"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#71717a' }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div
              className="flex items-center justify-center w-7 h-7 rounded-lg"
              style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.18)' }}
            >
              <PenLine className="h-3.5 w-3.5" style={{ color: '#fbbf24' }} />
            </div>
            <h1
              className="text-[15px] font-bold text-white"
              style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.01em' }}
            >
              Writing Lab
            </h1>
          </div>
        </header>

        {/* Landing content */}
        <main className="flex-1 flex items-center justify-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md text-center"
          >
            {/* Icon */}
            <div
              className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-6"
              style={{
                background: 'rgba(251,191,36,0.08)',
                border: '1px solid rgba(251,191,36,0.2)',
                boxShadow: '0 0 40px rgba(251,191,36,0.06)',
              }}
            >
              <PenLine className="h-7 w-7" style={{ color: '#fbbf24' }} />
            </div>

            <h2
              className="text-2xl font-bold text-white mb-2"
              style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}
            >
              Writing Lab
            </h2>
            <p className="text-sm text-zinc-500 mb-8">
              IELTS Task 2 · Body Paragraph Practice
            </p>

            {/* Feature list */}
            <div
              className="rounded-2xl p-5 mb-8 text-left space-y-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              {[
                { icon: Zap, label: 'Fresh IELTS prompt every session', color: '#fbbf24' },
                { icon: CheckCheck, label: 'Instant band score with examiner feedback', color: '#00FFC8' },
                { icon: Clock, label: '40-minute timed practice mode', color: '#38bdf8' },
              ].map(({ icon: Icon, label, color }) => (
                <div key={label} className="flex items-center gap-3">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${color}12`, border: `1px solid ${color}25` }}
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color }} />
                  </div>
                  <span className="text-sm text-zinc-300">{label}</span>
                </div>
              ))}
            </div>

            {/* Start button */}
            <button onClick={handleStart} className="rv-btn-mint" style={{ borderRadius: '0.875rem' }}>
              Start Practice
            </button>

            {count > 0 && (
              <p className="text-xs text-zinc-600 mt-4">
                {count} paragraph{count !== 1 ? 's' : ''} written today
              </p>
            )}
          </motion.div>
        </main>
      </div>
    );
  }

  // ── Main layout ──────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col"
      style={{ height: '100dvh', minHeight: '100vh', background: '#09090b' }}
    >
      <style>{RV_STYLES}</style>

      {/* Ambient glow */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          top: 0,
          left: '30%',
          width: '500px',
          height: '250px',
          background: 'radial-gradient(ellipse at center, rgba(0,255,200,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* ── Header ──────────────────────────────────────────────── */}
      <header
        className="shrink-0 flex items-center gap-3 px-5 md:px-8"
        style={{
          height: '56px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(9,9,11,0.85)',
          backdropFilter: 'blur(20px)',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <button
          onClick={() => navigate('/')}
          className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 transition-all duration-150 hover:scale-105"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#71717a' }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>

        <div className="flex items-center gap-2 flex-1">
          <div
            className="flex items-center justify-center w-7 h-7 rounded-lg"
            style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.18)' }}
          >
            <PenLine className="h-3.5 w-3.5" style={{ color: '#fbbf24' }} />
          </div>
          <h1
            className="text-[15px] font-bold text-white"
            style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.01em' }}
          >
            Writing Lab
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Timer button — appears once user starts typing */}
          {showTimerButton && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={startTimer}
              className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-2 rounded-full transition-all hover:scale-105"
              style={{
                background: 'rgba(56,189,248,0.08)',
                color: '#38bdf8',
                border: '1px solid rgba(56,189,248,0.2)',
              }}
            >
              <Timer className="h-3 w-3" />
              Start Timer
            </motion.button>
          )}

          {/* Timer display — once started */}
          {timerSeconds !== null && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1 rounded-full"
              style={{
                background: `${timerColor}0d`,
                border: `1px solid ${timerColor}25`,
                padding: '4px 4px 4px 10px',
                transition: 'background 0.4s, border-color 0.4s',
              }}
            >
              {/* Time display */}
              <span
                className="flex items-center gap-3.5 text-[24px] font-bold tabular-nums mr-1"
                style={{
                  color: timerColor,
                  fontFamily: "'Space Grotesk', sans-serif",
                  letterSpacing: '0.04em',
                  transition: 'color 0.4s',
                }}
              >
                <Timer className="h-3 w-3" />
                {timerSeconds === 0 ? "Time's up" : formatTime(timerSeconds)}
              </span>

              {/* Pause / Resume */}
              {timerSeconds > 0 && (
                <button
                  onClick={timerPaused ? resumeTimer : pauseTimer}
                  className="flex items-center justify-center w-10 h-10 rounded-full transition-all hover:scale-110"
                  style={{ background: 'rgba(255,255,255,0.07)', color: '#a1a1aa' }}
                  title={timerPaused ? 'Resume' : 'Pause'}
                >
                  {timerPaused
                    ? <Play className="h-2.5 w-2.5" style={{ marginLeft: '1px' }} />
                    : <Pause className="h-2.5 w-2.5" />}
                </button>
              )}

              {/* Stop */}
              <button
                onClick={stopTimer}
                className="flex items-center justify-center w-10 h-10 rounded-full transition-all hover:scale-110"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}
                title="Stop timer"
              >
                <Square className="h-2.5 w-2.5" />
              </button>
            </motion.div>
          )}

          {/* Today's count */}
          {count > 0 && (
            <span
              className="text-[10px] font-bold px-2.5 py-1 rounded-full tabular-nums"
              style={{ background: 'rgba(0,255,200,0.08)', color: '#00FFC8', border: '1px solid rgba(0,255,200,0.16)', letterSpacing: '0.04em' }}
            >
              {count} today
            </span>
          )}
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────── */}
      <main
        className="flex-1 flex flex-col md:flex-row"
        style={{ overflow: 'hidden', position: 'relative', zIndex: 1 }}
      >
        {/* Left panel — Prompt */}
        <aside
          className="hidden md:block"
          style={{
            width: '50%',
            flexShrink: 0,
            height: 'calc(100dvh - 56px)',
            overflowY: 'auto',
            borderRight: '1px solid rgba(255,255,255,0.05)',
            padding: '32px 32px',
          }}
        >
          {promptPanel}
        </aside>

        {/* Right panel — Composer / Feedback */}
        <section
          className="flex-1 flex flex-col"
          style={{ height: 'calc(100dvh - 56px)', overflowY: 'auto', padding: 'clamp(16px, 3vw, 32px) clamp(16px, 3vw, 32px) 48px', gap: '12px' }}
        >
          {/* Prompt shown inline on mobile only */}
          <div className="md:hidden">
            {promptPanel}
          </div>

          {/* Composer — flex-1 so it stretches to the bottom of the panel */}
          {currentPrompt && !feedback && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <WritingComposer
                value={userText}
                onChange={setUserText}
                onSubmit={handleSubmit}
                submitting={gradeLoading}
                disabled={gradeLoading || !userText.trim()}
              />
            </div>
          )}

          {/* Grade error */}
          {gradeError && !feedback && currentPrompt && (
            <div
              className="rounded-2xl px-5 py-4 flex items-center justify-between gap-4"
              style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.16)' }}
            >
              <div>
                <p className="text-sm font-semibold text-red-400">Grading failed</p>
                <p className="text-xs text-zinc-500 mt-0.5">Your text is still here — try again.</p>
              </div>
              <button
                onClick={handleSubmit}
                disabled={gradeLoading}
                className="text-xs font-bold px-3 py-1.5 rounded-lg shrink-0 disabled:opacity-50 transition-all"
                style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Feedback */}
          {feedback && (
            <WritingFeedback
              feedback={feedback}
              submitted={submitted}
              onTryAgain={handleTryAgain}
              onNewPrompt={handleNewPrompt}
              generating={genLoading}
            />
          )}
        </section>
      </main>
    </div>
  );
}
