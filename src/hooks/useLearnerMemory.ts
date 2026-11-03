import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// Notes are merged into the profile every this-many notes; must match
// COMPACT_EVERY in supabase/functions/llm-proxy/memory.ts.
export const NOTES_PER_MERGE = 10;

export interface LearnerNote {
  id: string;
  source: 'sentence' | 'writing';
  word: string | null;
  note: string;
  compacted: boolean;
  created_at: string;
}

export interface LearnerMemory {
  summary: string | null;
  summaryUpdatedAt: string | null;
  recentNotes: LearnerNote[];
  // Notes waiting to be merged into the summary
  pendingCount: number;
}

/** What the AI coach has written down about the learner (see llm-proxy/db.ts). */
export function useLearnerMemory() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['learner_memory', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<LearnerMemory> => {
      const [profile, notes, pending] = await Promise.all([
        supabase.from('learner_profiles').select('summary, updated_at').eq('user_id', user!.id).maybeSingle(),
        supabase.from('learner_notes').select('id, source, word, note, compacted, created_at')
          .eq('user_id', user!.id).order('created_at', { ascending: false }).limit(6),
        supabase.from('learner_notes').select('id', { count: 'exact', head: true })
          .eq('user_id', user!.id).eq('compacted', false),
      ]);
      if (profile.error) throw profile.error;
      if (notes.error) throw notes.error;
      if (pending.error) throw pending.error;
      return {
        summary: profile.data?.summary ?? null,
        summaryUpdatedAt: profile.data?.updated_at ?? null,
        recentNotes: (notes.data ?? []) as LearnerNote[],
        pendingCount: pending.count ?? 0,
      };
    },
  });
}

/** Forgets everything the coach knows: every note and the merged profile. */
export function useClearLearnerMemory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const [notes, profile] = await Promise.all([
        supabase.from('learner_notes').delete().eq('user_id', user!.id),
        supabase.from('learner_profiles').delete().eq('user_id', user!.id),
      ]);
      if (notes.error) throw notes.error;
      if (profile.error) throw profile.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learner_memory'] });
    },
  });
}
