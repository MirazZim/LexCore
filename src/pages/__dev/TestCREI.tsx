import { useState } from 'react';
import {
  scoreCREI,
  generateCREIPrompt,
  type CREIFeedback,
  type CREIPrompt,
  type CREIQuestionType,
} from '@/lib/llm';

const FALLBACK_TOPIC = `Some people think technology has made our lives easier, while others believe it has made us more lonely. Discuss both views.`;

const FALLBACK_QUESTION_TYPE: CREIQuestionType = 'discussion';

const PARAGRAPH = `In my opinion, technology has made people more isolated than before. Modern communication tools allow us to stay in touch with others without meeting face-to-face. For that, many young people now prefer texting over real conversations. For example, recent study by Bangladesh University showed that university students spend 6 hours a day on social media but only 30 minutes talking with family. This is a serious problem because human connections are good for mental health. Furthermore, technology have created an illusion of friendship — people have hundreds of online friends but few they can call when in need. The constant scrolling also reduces our ability to enjoy quiet moments. Therefore, while technology offers many conveniences, it has weakened the deep bonds that make us human.`;

export default function TestCREI() {
  // ── Grader state ────────────────────────────────────────────────
  const [result, setResult] = useState<CREIFeedback | null>(null);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [scoreLoading, setScoreLoading] = useState(false);
  const [scoreElapsedMs, setScoreElapsedMs] = useState<number | null>(null);

  // ── Prompt generator state ──────────────────────────────────────
  const [generated, setGenerated] = useState<CREIPrompt | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [genElapsedMs, setGenElapsedMs] = useState<number | null>(null);

  // Active prompt = AI-generated when present, else hardcoded fixture.
  const activePrompt = generated?.prompt ?? FALLBACK_TOPIC;
  const activeQuestionType = generated?.questionType ?? FALLBACK_QUESTION_TYPE;

  async function regenerate() {
    setGenLoading(true);
    setGenError(null);
    setGenElapsedMs(null);
    const t0 = performance.now();
    try {
      const r = await generateCREIPrompt();
      setGenerated(r);
    } catch (e) {
      setGenError(e instanceof Error ? `${e.name}: ${e.message}` : String(e));
    } finally {
      setGenElapsedMs(Math.round(performance.now() - t0));
      setGenLoading(false);
    }
  }

  async function run() {
    setScoreLoading(true);
    setScoreError(null);
    setResult(null);
    setScoreElapsedMs(null);
    const t0 = performance.now();
    try {
      const r = await scoreCREI(activePrompt, activeQuestionType, PARAGRAPH);
      setResult(r);
    } catch (e) {
      setScoreError(e instanceof Error ? `${e.name}: ${e.message}` : String(e));
    } finally {
      setScoreElapsedMs(Math.round(performance.now() - t0));
      setScoreLoading(false);
    }
  }

  const busy = scoreLoading || genLoading;

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-zinc-200">
      <div className="max-w-3xl mx-auto space-y-5">
        <header>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            CREI Test Harness
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Dev-only · gated behind <code>import.meta.env.DEV</code>. Tests{' '}
            <code>generateCREIPrompt</code> (variety + tip quality) and{' '}
            <code>scoreCREI</code> (band calibration) against a fixed paragraph.
          </p>
        </header>

        {/* ── Prompt section ────────────────────────────────────────── */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">Prompt source</p>
            <span className="text-[10px] text-zinc-600">
              {generated ? 'AI-generated' : 'hardcoded fallback'}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 text-[10px]">
            {generated && (
              <span className="rounded-full px-2.5 py-1 bg-zinc-800 text-zinc-300">
                domain: {generated.domain}
              </span>
            )}
            <span className="rounded-full px-2.5 py-1 bg-zinc-800 text-zinc-300">
              type: {activeQuestionType}
            </span>
          </div>

          <p className="text-sm leading-relaxed whitespace-pre-wrap">{activePrompt}</p>

          {generated?.tip && (
            <div className="rounded-lg border border-amber-900/50 bg-amber-950/20 p-3">
              <p className="text-[10px] uppercase tracking-widest text-amber-400 mb-1">Tip</p>
              <p className="text-sm text-amber-100 leading-relaxed">{generated.tip}</p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={regenerate}
              disabled={busy}
              className="rounded-xl px-3 py-1.5 text-xs font-bold bg-zinc-800 text-zinc-200 disabled:opacity-50 transition-opacity"
            >
              {genLoading ? 'Generating…' : 'Generate New Prompt'}
            </button>
            {genElapsedMs !== null && (
              <span className="text-xs text-zinc-500">{genElapsedMs} ms</span>
            )}
          </div>

          {genError && (
            <pre className="rounded-lg border border-red-900 bg-red-950/30 p-3 text-xs text-red-300 whitespace-pre-wrap">
              {genError}
            </pre>
          )}
        </section>

        {/* ── Calibration paragraph (never changes) ─────────────────── */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">
            Calibration paragraph · fixed
          </p>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{PARAGRAPH}</p>
          <p className="text-[10px] text-zinc-600 italic">
            Seeded with: "For that" calque · "recent study" (missing article) ·
            "technology have" (S-V slip) · "good for mental health" (Band-5 phrasing) ·
            "quiet moments" drift.
          </p>
        </section>

        {/* ── Score button + result ─────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <button
            onClick={run}
            disabled={busy}
            className="rounded-xl px-4 py-2 text-sm font-bold bg-zinc-100 text-zinc-900 disabled:opacity-50 transition-opacity"
          >
            {scoreLoading ? 'Scoring…' : 'Score CREI'}
          </button>
          {scoreElapsedMs !== null && (
            <span className="text-xs text-zinc-500">{scoreElapsedMs} ms</span>
          )}
        </div>

        {scoreError && (
          <pre className="rounded-xl border border-red-900 bg-red-950/30 p-4 text-xs text-red-300 whitespace-pre-wrap">
            {scoreError}
          </pre>
        )}

        {result && (
          <pre className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-xs whitespace-pre-wrap overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
