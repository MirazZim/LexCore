import { supabase } from './supabase';

const SEED_WORDS = [
  {
    word: 'ephemeral',
    definition: 'Lasting for a very short time',
    example_sentence: 'The ephemeral beauty of cherry blossoms draws millions of visitors each spring.',
    emotion_anchor: 'Morning dew disappearing in sunlight',
    source: 'user' as const,
    register: 'literary' as const,
    frequency_band: 3,
    contexts: [
      { sentence: 'Social media trends are ephemeral — here today, forgotten tomorrow.', source_label: 'NY Times' },
      { sentence: 'The ephemeral nature of youth makes it all the more precious.', source_label: 'Reddit' },
    ],
    collocations: ['ephemeral beauty', 'ephemeral nature'],
    connections: [
      { connected_word: 'transient', connection_type: 'synonym' as const },
      { connected_word: 'permanent', connection_type: 'antonym' as const },
    ],
  },
  {
    word: 'meticulous',
    definition: 'Showing great attention to detail; very careful and precise',
    example_sentence: 'She was meticulous in her research, checking every source twice.',
    emotion_anchor: 'A watchmaker adjusting tiny gears',
    source: 'user' as const,
    register: 'formal' as const,
    frequency_band: 4,
    contexts: [
      { sentence: 'The architect was meticulous about every measurement in the blueprint.', source_label: 'Podcast' },
      { sentence: 'Her meticulous note-taking paid off during the final exam.', source_label: 'Reddit' },
    ],
    collocations: ['meticulous attention', 'meticulous planning'],
    connections: [
      { connected_word: 'thorough', connection_type: 'synonym' as const },
      { connected_word: 'careless', connection_type: 'antonym' as const },
    ],
  },
  {
    word: 'pernicious',
    definition: 'Having a harmful effect, especially in a gradual or subtle way',
    example_sentence: 'The pernicious influence of misinformation erodes public trust.',
    emotion_anchor: 'Rust slowly eating through metal',
    source: 'user' as const,
    register: 'formal' as const,
    frequency_band: 2,
    contexts: [
      { sentence: 'The pernicious effects of sleep deprivation accumulate over weeks.', source_label: 'NY Times' },
      { sentence: 'Gossip can be pernicious, destroying reputations without evidence.', source_label: 'Podcast' },
    ],
    collocations: ['pernicious influence', 'pernicious effects'],
    connections: [],
  },
  {
    word: 'sanguine',
    definition: 'Optimistic or positive, especially in a difficult situation',
    example_sentence: "Despite the setbacks, he remained sanguine about the project's success.",
    emotion_anchor: 'A warm sunrise after a storm',
    source: 'user' as const,
    register: 'formal' as const,
    frequency_band: 2,
    contexts: [
      { sentence: 'Investors remain sanguine despite the market downturn.', source_label: 'NY Times' },
      { sentence: 'Her sanguine personality lifted the mood of the entire team.', source_label: 'Reddit' },
    ],
    collocations: ['sanguine outlook', 'remain sanguine'],
    connections: [],
  },
  {
    word: 'obfuscate',
    definition: 'To render obscure, unclear, or unintelligible',
    example_sentence: 'Politicians often obfuscate their true intentions with vague language.',
    emotion_anchor: 'Fog rolling over a road sign',
    source: 'user' as const,
    register: 'formal' as const,
    frequency_band: 2,
    contexts: [
      { sentence: 'Complex jargon can obfuscate rather than clarify important issues.', source_label: 'Podcast' },
      { sentence: 'The company tried to obfuscate the data breach from the public.', source_label: 'NY Times' },
    ],
    collocations: ['obfuscate the truth', 'deliberately obfuscate'],
    connections: [],
  },
  {
    word: 'ruminate',
    definition: 'To think deeply about something',
    example_sentence: 'She would ruminate on the problem for hours before finding a solution.',
    emotion_anchor: 'A person staring out a rainy window',
    source: 'user' as const,
    register: 'formal' as const,
    frequency_band: 3,
    contexts: [
      { sentence: "Don't just ruminate on your mistakes — learn from them and move on.", source_label: 'Reddit' },
      { sentence: 'Scientists ruminate over their findings before publishing results.', source_label: 'Podcast' },
    ],
    collocations: ['ruminate on', 'ruminate over'],
    connections: [{ connected_word: 'ponder', connection_type: 'synonym' as const }],
  },
  {
    word: 'pragmatic',
    definition: 'Dealing with things sensibly and realistically',
    example_sentence: 'We need a pragmatic approach to solve this budget crisis.',
    emotion_anchor: 'A toolbox — the right tool for each job',
    source: 'user' as const,
    register: 'formal' as const,
    frequency_band: 4,
    contexts: [
      { sentence: 'A pragmatic leader focuses on solutions rather than ideology.', source_label: 'NY Times' },
      { sentence: "Being pragmatic doesn't mean giving up your values.", source_label: 'Reddit' },
    ],
    collocations: ['pragmatic approach', 'pragmatic solution'],
    connections: [
      { connected_word: 'practical', connection_type: 'synonym' as const },
      { connected_word: 'idealistic', connection_type: 'antonym' as const },
    ],
  },
  {
    word: 'equanimity',
    definition: 'Mental calmness, composure, and evenness of temper, especially in a difficult situation',
    example_sentence: 'She handled the crisis with remarkable equanimity.',
    emotion_anchor: 'A still lake reflecting mountains',
    source: 'user' as const,
    register: 'formal' as const,
    frequency_band: 2,
    contexts: [
      { sentence: 'Meditation helps cultivate a sense of equanimity in daily life.', source_label: 'Podcast' },
      { sentence: 'His equanimity in the face of criticism earned him respect.', source_label: 'NY Times' },
    ],
    collocations: ['maintain equanimity', 'sense of equanimity'],
    connections: [{ connected_word: 'composure', connection_type: 'synonym' as const }],
  },
];

export async function seedWordsIfEmpty(userId: string) {
  // Check if user has any words
  const { count } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (count && count > 0) return;

  // Insert seed words
  for (const seed of SEED_WORDS) {
    const { data: wordData, error: wordError } = await supabase
      .from('words')
      .insert({
        user_id: userId,
        word: seed.word,
        definition: seed.definition,
        example_sentence: seed.example_sentence,
        emotion_anchor: seed.emotion_anchor,
        source: seed.source,
        register: seed.register,
        frequency_band: seed.frequency_band,
      })
      .select('id')
      .single();

    if (wordError || !wordData) continue;

    const wordId = wordData.id;

    // Insert contexts
    if (seed.contexts.length > 0) {
      await supabase.from('word_contexts').insert(
        seed.contexts.map(c => ({ word_id: wordId, sentence: c.sentence, source_label: c.source_label }))
      );
    }

    // Insert collocations
    if (seed.collocations.length > 0) {
      await supabase.from('word_collocations').insert(
        seed.collocations.map(c => ({ word_id: wordId, collocation: c }))
      );
    }

    // Insert semantic connections
    if (seed.connections.length > 0) {
      await supabase.from('semantic_connections').insert(
        seed.connections.map(c => ({ word_id: wordId, connected_word: c.connected_word, connection_type: c.connection_type }))
      );
    }
  }
}
