import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { DailyClear } from '@/lib/daily-clears';

/** Every day the user cleared all due words, newest first. */
export function useDailyClears() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['daily_clears', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_clears')
        .select('*')
        .eq('user_id', user!.id)
        .order('day', { ascending: false });
      if (error) throw error;
      return (data ?? []) as DailyClear[];
    },
  });
}

export function useRecordDailyClear() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (clear: Omit<DailyClear, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('daily_clears')
        .insert({ user_id: user!.id, ...clear })
        .select()
        .single();
      if (error) throw error;
      return data as DailyClear;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily_clears'] });
    },
  });
}
