import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Word, WordStats, WordContext, WordCollocation, SemanticConnection, ReviewSession } from '@/lib/types';
import { schedule, dbStateToCard, Rating, type Card } from '@/lib/fsrs';

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
  return useQuery({
    queryKey: ['due_words', user?.id],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data: stats, error: statsError } = await supabase
        .from('word_stats')
        .select('*')
        .eq('user_id', user!.id)
        .lte('next_review_at', now)
        .order('next_review_at', { ascending: true })
        .limit(20);
      if (statsError) throw statsError;
      if (!stats || stats.length === 0) return [];

      const wordIds = stats.map(s => s.word_id);
      const { data: words, error: wordsError } = await supabase
        .from('words')
        .select('*')
        .in('id', wordIds);
      if (wordsError) throw wordsError;

      return stats
        .map(s => ({
          word: words!.find(w => w.id === s.word_id) as Word,
          stats: s as WordStats,
        }))
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
          source: 'user',
          register: wordData.register,
          frequency_band: 3,
        })
        .select()
        .single();
      if (error) throw error;

      if (wordData.collocations && wordData.collocations.length > 0) {
        await supabase.from('word_collocations').insert(
          wordData.collocations.map(c => ({ word_id: data.id, collocation: c }))
        );
      }

      if (wordData.synonyms && wordData.synonyms.length > 0) {
        await supabase.from('semantic_connections').insert(
          wordData.synonyms.map(s => ({ word_id: data.id, connected_word: s, connection_type: 'synonym' }))
        );
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['words'] });
      queryClient.invalidateQueries({ queryKey: ['word_stats'] });
      queryClient.invalidateQueries({ queryKey: ['due_words'] });
      queryClient.invalidateQueries({ queryKey: ['due-words'] });
      queryClient.invalidateQueries({ queryKey: ['word-stats'] });
    },
  });
}

export function useUpdateWordStats() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (update: {
      wordStatsId: string;
      wordId: string;
      rating: Rating;      // 1..4
      cardBefore: Card;    // snapshot from current DB state
    }) => {
      const now = new Date();
      const { card: cardAfter } = schedule(update.cardBefore, update.rating, now);
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
        });
      if (logError) throw logError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['word_stats'] });
      queryClient.invalidateQueries({ queryKey: ['due_words'] });
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
      await supabase.from('word_stats').delete().eq('word_id', wordId);
      await supabase.from('word_contexts').delete().eq('word_id', wordId);
      await supabase.from('word_collocations').delete().eq('word_id', wordId);
      await supabase.from('semantic_connections').delete().eq('word_id', wordId);
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
