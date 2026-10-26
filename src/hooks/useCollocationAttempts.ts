import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface SaveCollocationAttemptPayload {
  wordId: string;
  collocationId: string;
  wasCorrect: boolean;
  wrongPick: string | null;
}

/** Per-phrase summary of past Collocation Forge attempts for one word. */
export interface CollocationRecord {
  /** Most recent attempt was missed on the first pick → resurface it first. */
  struggling: boolean;
  misses: number;
  attempts: number;
  lastAt: number;
}

export type CollocationHistory = Record<string, CollocationRecord>;

/** Attempt history for one word, folded into a map keyed by collocation_id. */
export function useCollocationHistoryForWord(wordId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['collocation_attempts', 'word', wordId],
    queryFn: async (): Promise<CollocationHistory> => {
      const { data, error } = await supabase
        .from('collocation_attempts')
        .select('collocation_id, was_correct, created_at')
        .eq('user_id', user!.id)
        .eq('word_id', wordId!)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;

      const history: CollocationHistory = {};
      // Rows are newest first, so the first row seen per phrase is its latest attempt
      for (const row of data ?? []) {
        const rec = history[row.collocation_id];
        if (!rec) {
          history[row.collocation_id] = {
            struggling: !row.was_correct,
            misses: row.was_correct ? 0 : 1,
            attempts: 1,
            lastAt: new Date(row.created_at).getTime(),
          };
        } else {
          rec.attempts += 1;
          if (!row.was_correct) rec.misses += 1;
        }
      }
      return history;
    },
    enabled: !!user && !!wordId,
  });
}

export function useSaveCollocationAttempt() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SaveCollocationAttemptPayload) => {
      const { error } = await supabase.from('collocation_attempts').insert({
        user_id: user!.id,
        word_id: payload.wordId,
        collocation_id: payload.collocationId,
        was_correct: payload.wasCorrect,
        wrong_pick: payload.wrongPick,
      });
      if (error) throw error;
    },
    onSuccess: (_data, payload) => {
      queryClient.invalidateQueries({ queryKey: ['collocation_attempts', 'word', payload.wordId] });
    },
  });
}
