import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface SaveClozeAttemptPayload {
  wordId: string;
  userAnswer: string;
  wasCorrect: boolean;
}

export interface ClozeAttemptHistoryItem {
  id: string;
  word: string;
  userAnswer: string;
  wasCorrect: boolean;
  timestamp: number;
}

/** Last N attempts for one specific word (used to seed the Context Theater goalpost bar). */
export function useClozeAttemptHistoryForWord(wordId: string | undefined, limit = 5) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['cloze_attempts', 'word', wordId],
    queryFn: async (): Promise<ClozeAttemptHistoryItem[]> => {
      const { data, error } = await supabase
        .from('cloze_attempts')
        .select('id, user_answer, was_correct, created_at')
        .eq('user_id', user!.id)
        .eq('word_id', wordId!)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map(a => ({
        id: a.id,
        word: '', // caller already knows the word — this hook is scoped to one word_id
        userAnswer: a.user_answer,
        wasCorrect: a.was_correct,
        timestamp: new Date(a.created_at).getTime(),
      }));
    },
    enabled: !!user && !!wordId,
  });
}

export function useSaveClozeAttempt() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SaveClozeAttemptPayload) => {
      const { error } = await supabase.from('cloze_attempts').insert({
        user_id: user!.id,
        word_id: payload.wordId,
        user_answer: payload.userAnswer,
        was_correct: payload.wasCorrect,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cloze_attempts'] });
    },
  });
}
