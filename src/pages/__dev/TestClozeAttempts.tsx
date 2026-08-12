import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useSaveClozeAttempt } from '@/hooks/useClozeAttempts';
import { ContextPhase } from '@/components/review/ContextPhase';
import type { Word, WordStats } from '@/lib/types';
import type { DueWordItem, WordContext } from '@/components/review/types';

function stubStats(wordId: string, userId: string): WordStats {
  return {
    id: 'stub-stats',
    user_id: userId,
    word_id: wordId,
    stability: 0,
    difficulty: 0,
    state: 0,
    elapsed_days: 0,
    scheduled_days: 0,
    lapses: 0,
    repetitions: 0,
    next_review_at: new Date().toISOString(),
    last_reviewed_at: null,
    times_correct: 0,
    times_incorrect: 0,
  };
}

export default function TestClozeAttempts() {
  const { user } = useAuth();
  const saveClozeAttempt = useSaveClozeAttempt();

  const [word, setWord] = useState<Word | null>(null);
  const [wordError, setWordError] = useState<string | null>(null);
  const [wordLoading, setWordLoading] = useState(false);

  const [clozeAnswer, setClozeAnswer] = useState('');
  const [clozeSubmitted, setClozeSubmitted] = useState(false);

  async function pickRandomWord() {
    setWordLoading(true);
    setWordError(null);
    setClozeAnswer('');
    setClozeSubmitted(false);
    const { data, error } = await supabase
      .from('words')
      .select('*')
      .not('example_sentence', 'is', null)
      .limit(50);
    if (error) {
      setWordError(`${error.code ?? ''} ${error.message}`);
      setWordLoading(false);
      return;
    }
    if (!data || data.length === 0) {
      setWordError('No words with an example_sentence found — add one first.');
      setWordLoading(false);
      return;
    }
    setWord(data[Math.floor(Math.random() * data.length)] as Word);
    setWordLoading(false);
  }

  function retrySameWord() {
    setClozeAnswer('');
    setClozeSubmitted(false);
  }

  // Mirrors ReviewPage's real handleClozeSubmit — same mutation, same shape.
  function handleClozeSubmit() {
    if (!word) return;
    setClozeSubmitted(true);
    const wasCorrect = clozeAnswer.toLowerCase().trim() === word.word.toLowerCase();
    saveClozeAttempt.mutate({ wordId: word.id, userAnswer: clozeAnswer, wasCorrect });
  }

  const currentItem: DueWordItem | null = word
    ? { word, stats: stubStats(word.id, user?.id ?? '') }
    : null;

  const clozeContext: WordContext | null = word
    ? {
        id: 'test-context',
        sentence: word.example_sentence ?? `This situation could be described as ${word.word}.`,
        source_label: 'test',
      }
    : null;

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-zinc-200">
      <div className="max-w-2xl mx-auto space-y-5">
        <header>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Cloze Goalpost Test Harness
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Dev-only. Renders the real <code>&lt;ContextPhase /&gt;</code> component (goalpost bar included)
            against any word, without waiting on the due-word queue.
          </p>
          <p className="text-xs text-zinc-600 mt-1">
            Signed in as: {user ? user.email : '(no user — not authenticated)'}
          </p>
        </header>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={pickRandomWord}
              disabled={wordLoading}
              className="rounded-xl px-3 py-1.5 text-xs font-bold bg-zinc-800 text-zinc-200 disabled:opacity-50"
            >
              {wordLoading ? 'Loading…' : word ? 'Pick a different word' : 'Fetch a random word'}
            </button>
            {word && (
              <button
                onClick={retrySameWord}
                className="rounded-xl px-3 py-1.5 text-xs font-bold bg-zinc-800 text-zinc-200"
              >
                Retry same word again
              </button>
            )}
          </div>
          {word && (
            <p className="text-sm">
              Current word: <span className="font-bold text-sky-400">{word.word}</span>{' '}
              <span className="text-zinc-600 text-xs">({word.id})</span>
            </p>
          )}
          {wordError && (
            <pre className="rounded-lg border border-red-900 bg-red-950/30 p-3 text-xs text-red-300 whitespace-pre-wrap">
              {wordError}
            </pre>
          )}
          <p className="text-[11px] text-zinc-600">
            Tip: use "Retry same word again" and type a wrong answer 2+ times to trigger the
            "Recurring Miss" panel for that word.
          </p>
        </section>

        {currentItem && clozeContext && (
          <ContextPhase
            currentItem={currentItem}
            currentIndex={0}
            clozeContext={clozeContext}
            clozeLoading={false}
            clozeAnswer={clozeAnswer}
            clozeSubmitted={clozeSubmitted}
            onClozeAnswerChange={setClozeAnswer}
            onClozeSubmit={handleClozeSubmit}
            onClozeNext={pickRandomWord}
            onClozeRetry={retrySameWord}
          />
        )}
      </div>
    </div>
  );
}
