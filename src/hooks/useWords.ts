import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Word, WordStats, WordContext, WordCollocation, SemanticConnection, ReviewSession, UserPreferences } from '@/lib/types';
import { createScheduler, schedule, Rating, type Card } from '@/lib/fsrs';

const PREF_DEFAULTS = {
  request_retention: 0.90,
  maximum_interval: 365,
  new_cards_per_day: 10,
  streak_recovery_date: null,
};

export function useUserPreferences() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['user_preferences', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as UserPreferences) ?? {
        ...PREF_DEFAULTS,
        user_id: user!.id,
        updated_at: new Date().toISOString(),
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateUserPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (prefs: Partial<Pick<UserPreferences, 'request_retention' | 'maximum_interval' | 'new_cards_per_day'>>) => {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({ user_id: user!.id, ...prefs, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_preferences'] });
      queryClient.invalidateQueries({ queryKey: ['due_words'] });
    },
  });
}

export function useApplyStreakRecovery() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (missedDate: string) => {
      const { error } = await supabase
        .from('user_preferences')
        .upsert(
          { user_id: user!.id, streak_recovery_date: missedDate, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_preferences'] });
    },
  });
}

export function useWords() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['words', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('words')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Word[];
    },
    enabled: !!user,
  });
}

export function useWordStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['word_stats', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('word_stats')
        .select('*')
        .eq('user_id', user!.id);
      if (error) throw error;
      return data as WordStats[];
    },
    enabled: !!user,
  });
}

export function useWordContexts(wordId?: string) {
  return useQuery({
    queryKey: ['word_contexts', wordId],
    queryFn: async () => {
      let query = supabase.from('word_contexts').select('*');
      if (wordId) query = query.eq('word_id', wordId);
      const { data, error } = await query;
      if (error) throw error;
      return data as WordContext[];
    },
    enabled: wordId !== undefined,
  });
}

export function useAllWordContexts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['all_word_contexts', user?.id],
    queryFn: async () => {
      // Get all word IDs for the user first
      const { data: words } = await supabase
        .from('words')
        .select('id')
        .eq('user_id', user!.id);
      if (!words || words.length === 0) return [];
      const wordIds = words.map(w => w.id);
      const { data, error } = await supabase
        .from('word_contexts')
        .select('*')
        .in('word_id', wordIds);
      if (error) throw error;
      return data as WordContext[];
    },
    enabled: !!user,
  });
}

export function useWordCollocations(wordId?: string) {
  return useQuery({
    queryKey: ['word_collocations', wordId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('word_collocations')
        .select('*')
        .eq('word_id', wordId!);
      if (error) throw error;
      return data as WordCollocation[];
    },
    enabled: !!wordId,
  });
}

export function useSemanticConnections(wordId?: string) {
  return useQuery({
    queryKey: ['semantic_connections', wordId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('semantic_connections')
        .select('*')
        .eq('word_id', wordId!);
      if (error) throw error;
      return data as SemanticConnection[];
    },
    enabled: !!wordId,
  });
}

export function useReviewSessions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['review_sessions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('review_sessions')
        .select('*')
        .eq('user_id', user!.id)
        .order('started_at', { ascending: false });
      if (error) throw error;
      return data as ReviewSession[];
    },
    enabled: !!user,
  });
}

export function useDueWords() {
  const { user } = useAuth();
  const { data: prefs } = useUserPreferences();
  const newCardsPerDay = prefs?.new_cards_per_day ?? PREF_DEFAULTS.new_cards_per_day;

  return useQuery({
    queryKey: ['due_words', user?.id, newCardsPerDay],
    queryFn: async () => {
      const now = new Date();
      const nowIso = now.toISOString();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);

      // A card's first-ever review is logged with state_before=0, so this
      // counts new cards already introduced today — making the cap truly
      // per-day instead of per-session.
      const [reviewRes, introducedRes] = await Promise.all([
        supabase.from('word_stats').select('*').eq('user_id', user!.id).neq('state', 0).lte('next_review_at', nowIso).order('next_review_at', { ascending: true }),
        supabase.from('review_events').select('*', { count: 'exact', head: true }).eq('user_id', user!.id).eq('state_before', 0).gte('reviewed_at', startOfToday.toISOString()),
      ]);
      if (reviewRes.error) throw reviewRes.error;
      if (introducedRes.error) throw introducedRes.error;

      const newBudget = Math.max(0, newCardsPerDay - (introducedRes.count ?? 0));
      let newStats: WordStats[] = [];
      if (newBudget > 0) {
        const newRes = await supabase.from('word_stats').select('*').eq('user_id', user!.id).eq('state', 0).lte('next_review_at', nowIso).order('next_review_at', { ascending: true }).limit(newBudget);
        if (newRes.error) throw newRes.error;
        newStats = (newRes.data ?? []) as WordStats[];
      }

      const stats = [...(reviewRes.data ?? []), ...newStats];
      if (stats.length === 0) return [];

      const wordIds = stats.map(s => s.word_id);
      const { data: words, error: wordsError } = await supabase.from('words').select('*').in('id', wordIds);
      if (wordsError) throw wordsError;

      return stats
        .map(s => ({ word: words!.find(w => w.id === s.word_id) as Word, stats: s as WordStats }))
        .filter(item => item.word);
    },
    enabled: !!user,
  });
}

export function useAddWord() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (wordData: {
      word: string;
      definition: string;
      example_sentence?: string;
      emotion_anchor?: string;
      register: string;
      collocations?: string[];
      synonyms?: string[];
    }) => {
      const { data, error } = await supabase
        .from('words')
        .insert({
          user_id: user!.id,
          word: wordData.word,
          definition: wordData.definition,
          example_sentence: wordData.example_sentence || null,
          emotion_anchor: wordData.emotion_anchor || null,
          source: 'user',
          register: wordData.register,
          frequency_band: 3,
        })
        .select()
        .single();
      if (error) throw error;

      if (wordData.collocations && wordData.collocations.length > 0) {
        const { error: colError } = await supabase.from('word_collocations').insert(
          wordData.collocations.map(c => ({ word_id: data.id, collocation: c }))
        );
        if (colError) throw colError;
      }

      if (wordData.synonyms && wordData.synonyms.length > 0) {
        const { error: synError } = await supabase.from('semantic_connections').insert(
          wordData.synonyms.map(s => ({ word_id: data.id, connected_word: s, connection_type: 'synonym' }))
        );
        if (synError) throw synError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['words'] });
      queryClient.invalidateQueries({ queryKey: ['word_stats'] });
      queryClient.invalidateQueries({ queryKey: ['due_words'] });
    },
  });
}

export function useUpdateWordStats() {
  const { user } = useAuth();
  const { data: prefs } = useUserPreferences();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (update: {
      wordStatsId: string;
      wordId: string;
      rating: Rating;
      cardBefore: Card;
      confidence?: 'sure' | 'unsure' | null;
    }) => {
      const now = new Date();
      const scheduler = createScheduler({
        request_retention: prefs?.request_retention ?? PREF_DEFAULTS.request_retention,
        maximum_interval: prefs?.maximum_interval ?? PREF_DEFAULTS.maximum_interval,
      });
      const { card: cardAfter } = schedule(update.cardBefore, update.rating, now, scheduler);
      const isCorrect = update.rating !== Rating.Again;

      const { data: current } = await supabase
        .from('word_stats')
        .select('times_correct, times_incorrect')
        .eq('id', update.wordStatsId)
        .single();

      const { error: updateError } = await supabase
        .from('word_stats')
        .update({
          stability: cardAfter.stability,
          difficulty: cardAfter.difficulty,
          state: cardAfter.state,
          elapsed_days: cardAfter.elapsed_days,
          scheduled_days: cardAfter.scheduled_days,
          repetitions: cardAfter.reps,
          lapses: cardAfter.lapses,
          next_review_at: cardAfter.due.toISOString(),
          last_reviewed_at: now.toISOString(),
          times_correct: isCorrect ? ((current?.times_correct || 0) + 1) : (current?.times_correct || 0),
          times_incorrect: !isCorrect ? ((current?.times_incorrect || 0) + 1) : (current?.times_incorrect || 0),
        })
        .eq('id', update.wordStatsId);
      if (updateError) throw updateError;

      const { error: logError } = await supabase
        .from('review_events')
        .insert({
          user_id: user!.id,
          word_id: update.wordId,
          reviewed_at: now.toISOString(),
          rating: update.rating,
          state_before: update.cardBefore.state,
          stability_before: update.cardBefore.stability,
          difficulty_before: update.cardBefore.difficulty,
          elapsed_days_before: update.cardBefore.elapsed_days,
          scheduled_days_before: update.cardBefore.scheduled_days,
          state_after: cardAfter.state,
          stability_after: cardAfter.stability,
          difficulty_after: cardAfter.difficulty,
          scheduled_days_after: cardAfter.scheduled_days,
          confidence: update.confidence ?? null,
        });
      if (logError) throw logError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['word_stats'] });
      queryClient.invalidateQueries({ queryKey: ['due_words'] });
      queryClient.invalidateQueries({ queryKey: ['review_events'] });
      queryClient.invalidateQueries({ queryKey: ['calibration'] });
    },
  });
}

export function useSaveReviewSession() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (session: {
      started_at: string;
      words_reviewed: number;
      words_correct: number;
      session_type: string;
    }) => {
      const { error } = await supabase
        .from('review_sessions')
        .insert({
          user_id: user!.id,
          started_at: session.started_at,
          ended_at: new Date().toISOString(),
          words_reviewed: session.words_reviewed,
          words_correct: session.words_correct,
          session_type: session.session_type,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review_sessions'] });
    },
  });
}

export function useReviewEvents() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['review_events', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('review_events')
        .select('word_id, reviewed_at, rating, state_after, stability_after')
        .eq('user_id', user!.id)
        .order('reviewed_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as {
        word_id: string;
        reviewed_at: string;
        rating: number;
        state_after: number;
        stability_after: number;
      }[];
    },
  });
}

export function useCalibration() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['calibration', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('review_events')
        .select('confidence, rating')
        .eq('user_id', user!.id)
        .not('confidence', 'is', null);
      if (error) throw error;
      let sureTotal = 0, sureCorrect = 0, guessTotal = 0, guessCorrect = 0;
      for (const e of data ?? []) {
        const correct = e.rating !== 1;
        if (e.confidence === 'sure') { sureTotal++; if (correct) sureCorrect++; }
        else { guessTotal++; if (correct) guessCorrect++; }
      }
      return { sureTotal, sureCorrect, guessTotal, guessCorrect };
    },
  });
}

export function useSaveWordContext() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (context: { word_id: string; sentence: string; source_label: string }) => {
      const { error } = await supabase
        .from('word_contexts')
        .insert(context);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['word_contexts'] });
      queryClient.invalidateQueries({ queryKey: ['all_word_contexts'] });
    },
  });
}

export function useDeleteWord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (wordId: string) => {
      const childDeletes = await Promise.all([
        supabase.from('word_stats').delete().eq('word_id', wordId),
        supabase.from('word_contexts').delete().eq('word_id', wordId),
        supabase.from('word_collocations').delete().eq('word_id', wordId),
        supabase.from('semantic_connections').delete().eq('word_id', wordId),
      ]);
      for (const res of childDeletes) if (res.error) throw res.error;
      const { error } = await supabase.from('words').delete().eq('id', wordId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['words'] });
      queryClient.invalidateQueries({ queryKey: ['word_stats'] });
      queryClient.invalidateQueries({ queryKey: ['due_words'] });
      queryClient.invalidateQueries({ queryKey: ['word_contexts'] });
      queryClient.invalidateQueries({ queryKey: ['word_collocations'] });
    },
  });
}

export function useUpdateWord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (wordData: {
      id: string;
      word: string;
      definition: string;
      register: string;
      collocations: string[];
      synonyms: string[];
      emotion_anchor?: string | null;
    }) => {
      const { error } = await supabase
        .from('words')
        .update({
          word: wordData.word,
          definition: wordData.definition,
          register: wordData.register,
          emotion_anchor: wordData.emotion_anchor ?? null,
        })
        .eq('id', wordData.id);
      if (error) throw error;

      const { error: colDelError } = await supabase.from('word_collocations').delete().eq('word_id', wordData.id);
      if (colDelError) throw colDelError;
      if (wordData.collocations.length > 0) {
        const { error: colInsError } = await supabase.from('word_collocations').insert(
          wordData.collocations.map(c => ({ word_id: wordData.id, collocation: c }))
        );
        if (colInsError) throw colInsError;
      }

      const { error: synDelError } = await supabase.from('semantic_connections').delete().eq('word_id', wordData.id).eq('connection_type', 'synonym');
      if (synDelError) throw synDelError;
      if (wordData.synonyms.length > 0) {
        const { error: synInsError } = await supabase.from('semantic_connections').insert(
          wordData.synonyms.map(s => ({ word_id: wordData.id, connected_word: s, connection_type: 'synonym' }))
        );
        if (synInsError) throw synInsError;
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['words'] });
      queryClient.invalidateQueries({ queryKey: ['word_collocations', vars.id] });
      queryClient.invalidateQueries({ queryKey: ['semantic_connections', vars.id] });
    },
  });
}

export function useAddNativePulseWord() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (wordData: {
      word: string;
      definition: string;
      register: string;
      frequency_band: number;
      contexts: { sentence: string; source_label: string }[];
    }) => {
      const { data, error } = await supabase
        .from('words')
        .insert({
          user_id: user!.id,
          word: wordData.word,
          definition: wordData.definition,
          source: 'native_pulse',
          register: wordData.register,
          frequency_band: wordData.frequency_band,
        })
        .select('id')
        .single();
      if (error) throw error;

      if (wordData.contexts.length > 0) {
        await supabase.from('word_contexts').insert(
          wordData.contexts.map(c => ({ word_id: data.id, sentence: c.sentence, source_label: c.source_label }))
        );
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['words'] });
      queryClient.invalidateQueries({ queryKey: ['word_stats'] });
      queryClient.invalidateQueries({ queryKey: ['due_words'] });
    },
  });
}
