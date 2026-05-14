import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { generateCREIPrompt, scoreCREI } from '@/lib/llm';
import type { CREIPrompt, CREIFeedback } from '@/lib/llm';
import { useRecentPromptTexts, useTodaysAttemptCount, useSaveWritingAttempt } from '@/hooks/useWritingAttempts';
import { RV_STYLES } from '@/lib/rv-styles';
import PromptCard from '@/components/writing/PromptCard';
import WritingComposer from '@/components/writing/WritingComposer';
import WritingFeedback from '@/components/writing/WritingFeedback';

export default function WritingLabPage() {
  const navigate = useNavigate();

  // ── Server state ────────────────────────────────────────────────
  const recentPrompts = useRecentPromptTexts();
  const todayCount = useTodaysAttemptCount();
  const saveAttempt = useSaveWritingAttempt();

  // ── UI state ─────────────────────────────────────────────────────
  const [currentPrompt, setCurrentPrompt] = useState<CREIPrompt | null>(null);
  const [userText, setUserText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState<CREIFeedback | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState(false);
  const [gradeLoading, setGradeLoading] = useState(false);
  const [gradeError, setGradeError] = useState(false);

  // ── Generate prompt ──────────────────────────────────────────────
  // Raw async — matches scoreSentence pattern in ReviewPage.
  // recentPrompts.data may still be loading on mount; exclude is best-effort.
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

  useEffect(() => {
    generate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // fires once on mount

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
      // TODO: saveAttempt.isError currently has no UI surface. If a user
      // reports "I wrote a paragraph but it's not in my history," wire a
      // toast or banner here.
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
  // Keeps current prompt; new attempt row on next submit.
  function handleTryAgain() {
    setUserText('');
    setFeedback(null);
    setSubmitted(false);
    setGradeError(false);
  }

  // Fetches a fresh prompt, passing current history as exclude array.
  function handleNewPrompt() {
    setCurrentPrompt(null);
    setUserText('');
    setFeedback(null);
    setSubmitted(false);
    setGradeError(false);
    generate();
  }

  const count = todayCount.data ?? 0;

  return (
    <div className="min-h-screen pt-8 pb-24 px-4 max-w-lg mx-auto">
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

        <h1
          className="text-xl font-bold text-white flex-1"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Writing Lab
        </h1>

        {/* Today's attempt counter */}
        {count > 0 && (
          <span
            className="text-[11px] font-bold px-3 py-1 rounded-full shrink-0"
            style={{ background: 'rgba(0,255,200,0.1)', color: '#00FFC8' }}
          >
            {count} paragraph{count !== 1 ? 's' : ''} today
          </span>
        )}
      </div>

      <div className="space-y-4">
        {/* Prompt area */}
        {genLoading && !currentPrompt ? (
          <Skeleton className="h-40 w-full rounded-2xl bg-zinc-800/60" />
        ) : genError && !currentPrompt ? (
          <div
            className="rounded-2xl p-6 text-center space-y-3"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <p className="text-sm text-zinc-400">Couldn't generate a prompt. Check your connection and try again.</p>
            <button
              onClick={generate}
              className="rv-btn-secondary"
              style={{ width: 'auto', padding: '10px 20px' }}
            >
              Retry
            </button>
          </div>
        ) : currentPrompt ? (
          <PromptCard prompt={currentPrompt} />
        ) : null}

        {/* Composer — visible once a prompt is loaded and feedback not yet shown */}
        {currentPrompt && !feedback && (
          <WritingComposer
            value={userText}
            onChange={setUserText}
            onSubmit={handleSubmit}
            submitting={gradeLoading}
            disabled={gradeLoading || !userText.trim()}
          />
        )}

        {/* Grade error — shown below composer when grading fails */}
        {gradeError && !feedback && currentPrompt && (
          <div
            className="rounded-2xl p-4 flex items-center justify-between gap-4"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <p className="text-sm text-red-400">Grading failed. Your text is still here — try again.</p>
            <button
              onClick={handleSubmit}
              disabled={gradeLoading}
              className="text-xs font-bold text-red-400 underline shrink-0 disabled:opacity-50"
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
      </div>
    </div>
  );
}
