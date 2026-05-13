import { useState } from 'react';
import { scoreCREI, type CREIFeedback } from '@/lib/llm';

const TOPIC = `Some people think technology has made our lives easier, while others believe it has made us more lonely. Discuss both views.`;

const QUESTION_TYPE = 'discussion';

const PARAGRAPH = `In my opinion, technology has made people more isolated than before. Modern communication tools allow us to stay in touch with others without meeting face-to-face. For that, many young people now prefer texting over real conversations. For example, recent study by Bangladesh University showed that university students spend 6 hours a day on social media but only 30 minutes talking with family. This is a serious problem because human connections are good for mental health. Furthermore, technology have created an illusion of friendship — people have hundreds of online friends but few they can call when in need. The constant scrolling also reduces our ability to enjoy quiet moments. Therefore, while technology offers many conveniences, it has weakened the deep bonds that make us human.`;

export default function TestCREI() {
  const [result, setResult] = useState<CREIFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setResult(null);
    setElapsedMs(null);
    const t0 = performance.now();
    try {
      const r = await scoreCREI(TOPIC, QUESTION_TYPE, PARAGRAPH);
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? `${e.name}: ${e.message}` : String(e));
    } finally {
      setElapsedMs(Math.round(performance.now() - t0));
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-zinc-200">
      <div className="max-w-3xl mx-auto space-y-5">
        <header>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            CREI Test Harness
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Dev-only · gated behind <code>import.meta.env.DEV</code>. Calls{' '}
            <code>scoreCREI</code> with a fixed paragraph seeded with: a "for that" calque,
            a missing article ("recent study"), an S-V agreement slip ("technology have"),
            and "good" used as a vague filler.
          </p>
        </header>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">Topic</p>
            <p className="text-sm mt-1">{TOPIC}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">Question type</p>
            <p className="text-sm mt-1">{QUESTION_TYPE}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">Paragraph</p>
            <p className="text-sm mt-1 whitespace-pre-wrap leading-relaxed">{PARAGRAPH}</p>
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button
            onClick={run}
            disabled={loading}
            className="rounded-xl px-4 py-2 text-sm font-bold bg-zinc-100 text-zinc-900 disabled:opacity-50 transition-opacity"
          >
            {loading ? 'Scoring…' : 'Score CREI'}
          </button>
          {elapsedMs !== null && (
            <span className="text-xs text-zinc-500">{elapsedMs} ms</span>
          )}
        </div>

        {error && (
          <pre className="rounded-xl border border-red-900 bg-red-950/30 p-4 text-xs text-red-300 whitespace-pre-wrap">
            {error}
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
