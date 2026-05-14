import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { dateKey } from '@/lib/streak';
import type { CREIFeedback, CREIQuestionType, CREIDomain } from '@/lib/llm';

// NOTE: numeric(3,1) bands come back as strings from PostgREST to
// preserve precision. Any hook that reads band columns must
// parseFloat() before display. useTodaysAttemptCount is unaffected
// since it only counts rows.

export function useRecentPromptTexts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['writing_attempts_recent_prompts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('writing_attempts')
        .select('prompt')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data ?? []).map(r => r.prompt as string);
    },
    enabled: !!user,
  });
}

export function useTodaysAttemptCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['writing_attempts_today_count', user?.id, dateKey(new Date())],
    queryFn: async () => {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const { count, error } = await supabase
        .from('writing_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .gte('created_at', startOfToday.toISOString());
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user,
  });
}

export interface SaveWritingAttemptPayload {
  prompt: string;
  prompt_meta: { questionType: CREIQuestionType; domain: CREIDomain };
  user_text: string;
  word_count: number;
  band_task_response: number;
  band_coherence: number;
  band_lexical: number;
  band_grammar: number;
  band_overall: number;
  feedback: CREIFeedback;
  flagged_issues: string[];
}

export function useSaveWritingAttempt() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SaveWritingAttemptPayload) => {
      const { error } = await supabase.from('writing_attempts').insert({
        user_id: user!.id,
        drill_type: 'crei',
        prompt: payload.prompt,
        prompt_meta: payload.prompt_meta,
        user_text: payload.user_text,
        word_count: payload.word_count,
        band_task_response: payload.band_task_response,
        band_coherence: payload.band_coherence,
        band_lexical: payload.band_lexical,
        band_grammar: payload.band_grammar,
        band_overall: payload.band_overall,
        feedback: payload.feedback,
        flagged_issues: payload.flagged_issues,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['writing_attempts_recent_prompts'] });
      queryClient.invalidateQueries({ queryKey: ['writing_attempts_today_count'] });
    },
  });
}
