import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Brain, Loader2, PenLine, MessageSquareText, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLearnerMemory, useClearLearnerMemory, NOTES_PER_MERGE } from '@/hooks/useLearnerMemory';

// "What your coach knows": the profile the AI coach reads before every
// request, plus the latest one-line notes waiting to be merged into it.
// Relies on the page's .gls / .section-label styles (ProgressPage).

const GOLD = '#f0c96a';

const ago = (iso: string) => formatDistanceToNow(new Date(iso), { addSuffix: true });

export function CoachMemoryCard() {
  const { data, isLoading, isError } = useLearnerMemory();
  const clear = useClearLearnerMemory();
  const [confirming, setConfirming] = useState(false);

  const bullets = (data?.summary ?? '')
    .split('\n')
    .map(l => l.replace(/^\s*[-•]\s*/, '').trim())
    .filter(Boolean);
  const notes = data?.recentNotes ?? [];
  const pending = data?.pendingCount ?? 0;
  const isEmpty = !isLoading && !isError && bullets.length === 0 && notes.length === 0;

  const handleClear = async () => {
    if (!confirming) { setConfirming(true); return; }
    try {
      await clear.mutateAsync();
      toast.success('Your coach has forgotten everything');
    } catch {
      toast.error('Could not clear coach memory');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="gls gls-hover rounded-[1.5rem] p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(240,201,106,0.1)' }}>
          <Brain className="h-3.5 w-3.5" style={{ color: GOLD }} />
        </div>
        <span className="section-label">What your coach knows</span>
        {!isEmpty && !isError && !isLoading && (
          <div className="ml-auto flex items-center gap-2">
            {confirming && (
              <button type="button" onClick={() => setConfirming(false)} className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-300 px-2 py-1">
                Keep it
              </button>
            )}
            <button
              type="button"
              onClick={handleClear}
              onBlur={() => setConfirming(false)}
              disabled={clear.isPending}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
              style={confirming
                ? { background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.35)' }
                : { color: '#71717a', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {clear.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              {confirming ? 'Forget everything?' : 'Clear'}
            </button>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="space-y-2 animate-pulse">
          <div className="h-3 rounded-full bg-white/5 w-3/4" />
          <div className="h-3 rounded-full bg-white/5 w-2/3" />
          <div className="h-3 rounded-full bg-white/5 w-1/2" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-zinc-600 py-4">Coach memory isn't switched on yet — it appears once the latest update is deployed.</p>
      )}

      {isEmpty && (
        <p className="text-sm text-zinc-500 py-4 leading-relaxed">
          Nothing yet. Write sentences in the Generation Lab or a paragraph in the Writing Lab — after each one, your coach notes
          anything worth remembering about your English, and uses it to tailor feedback from then on.
        </p>
      )}

      {!isLoading && !isError && !isEmpty && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* The merged profile — what every AI request reads */}
          <div>
            <p className="text-[11px] font-bold mb-3" style={{ color: GOLD }}>
              Your profile
              {data?.summaryUpdatedAt && <span className="font-medium text-zinc-600"> · updated {ago(data.summaryUpdatedAt)}</span>}
            </p>
            {bullets.length > 0 ? (
              <ul className="space-y-2.5">
                {bullets.map((b, i) => (
                  <li key={i} className="flex gap-2.5 text-sm leading-snug text-zinc-200">
                    <span className="mt-[7px] w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: GOLD }} />
                    {b}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-500 leading-relaxed">
                Your coach writes a profile once it has {NOTES_PER_MERGE} notes about you. Until then it uses the notes on the right.
              </p>
            )}

            {/* Progress toward the next merge */}
            <div className="mt-5">
              <div className="flex justify-between text-[10px] font-semibold text-zinc-600 mb-1.5">
                <span>{bullets.length > 0 ? 'Next profile update' : 'First profile'}</span>
                <span className="tabular-nums">{Math.min(pending, NOTES_PER_MERGE)}/{NOTES_PER_MERGE} notes</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(pending / NOTES_PER_MERGE, 1) * 100}%`, background: `linear-gradient(90deg, #c8922a, ${GOLD})` }}
                />
              </div>
            </div>
          </div>

          {/* Latest one-line notes */}
          <div>
            <p className="text-[11px] font-bold mb-3 text-[#00FFC8]">Latest notes</p>
            {notes.length > 0 ? (
              <ul className="space-y-2">
                {notes.map(n => (
                  <li key={n.id} className="px-3.5 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p className="text-sm leading-snug text-zinc-300">{n.note}</p>
                    <p className="flex items-center gap-1.5 mt-1.5 text-[10px] text-zinc-600">
                      {n.source === 'writing' ? <PenLine className="h-3 w-3" /> : <MessageSquareText className="h-3 w-3" />}
                      {n.source === 'writing' ? 'Writing Lab' : 'Sentence practice'}
                      {n.word && <> · <span className="text-zinc-400 font-semibold">{n.word}</span></>}
                      <> · {ago(n.created_at)}</>
                      {n.compacted && <span style={{ color: 'rgba(240,201,106,0.6)' }}> · in profile</span>}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-500">No notes since the last profile update.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
