// Daily topic rotation for the Generation Lab.
// A study session that threads every word through one IELTS-grade theme
// turns vocabulary practice into an accidental Task 2 essay draft.

export interface DailyTopic {
  id: string;
  title: string;
  prompt: string;
}

const TOPICS: DailyTopic[] = [
  { id: 'climate',          title: 'Climate & environment',       prompt: 'climate change, sustainability, or environmental policy' },
  { id: 'urbanisation',     title: 'Urbanisation & cities',       prompt: 'cities, urban planning, housing, or transport' },
  { id: 'education',        title: 'Education',                   prompt: 'schools, universities, learning, or literacy' },
  { id: 'technology',       title: 'Technology & society',        prompt: 'technology, automation, or its effect on daily life' },
  { id: 'ai',               title: 'AI & the workforce',          prompt: 'artificial intelligence and the future of work' },
  { id: 'health',           title: 'Public health',               prompt: 'public health, healthcare access, or lifestyle disease' },
  { id: 'mental-health',    title: 'Mental health & wellbeing',   prompt: 'mental health, stress, or work–life balance' },
  { id: 'media',            title: 'Media & information',         prompt: 'social media, news, or how information spreads' },
  { id: 'government',       title: 'Government & policy',         prompt: 'government policy, regulation, or public services' },
  { id: 'economy',          title: 'Economy & inequality',        prompt: 'economic growth, inequality, or living standards' },
  { id: 'globalisation',    title: 'Globalisation',               prompt: 'globalisation, trade, or cross-border culture' },
  { id: 'work',             title: 'The future of work',          prompt: 'remote work, careers, or workplace culture' },
  { id: 'youth',            title: 'Young people',                prompt: 'young people, generational change, or childhood' },
  { id: 'family',           title: 'Family & society',            prompt: 'family structure, parenting, or modern relationships' },
  { id: 'aging',            title: 'Ageing populations',          prompt: 'ageing populations, retirement, or care for the elderly' },
  { id: 'arts',             title: 'Arts & culture',              prompt: 'art, music, literature, or cultural heritage' },
  { id: 'sport',            title: 'Sport & society',             prompt: 'sport, fitness culture, or athletic competition' },
  { id: 'travel',           title: 'Travel & tourism',            prompt: 'tourism, travel, or its impact on local communities' },
  { id: 'food',             title: 'Food & agriculture',          prompt: 'food production, diet, or agriculture' },
  { id: 'consumption',      title: 'Consumer culture',            prompt: 'consumerism, advertising, or shopping habits' },
  { id: 'energy',           title: 'Energy & resources',          prompt: 'energy use, renewable power, or natural resources' },
  { id: 'cities-vs-rural',  title: 'City vs. countryside',        prompt: 'differences between urban and rural life' },
  { id: 'crime',            title: 'Crime & justice',             prompt: 'crime, policing, or the justice system' },
  { id: 'science',          title: 'Science & research',          prompt: 'scientific research, funding, or its public role' },
  { id: 'language',         title: 'Language & identity',         prompt: 'language, communication, or cultural identity' },
  { id: 'history',          title: 'History & memory',            prompt: 'history, monuments, or how the past shapes the present' },
  { id: 'tradition',        title: 'Tradition vs. modernity',     prompt: 'tradition, modernisation, or how societies change' },
  { id: 'gender',           title: 'Gender & equality',           prompt: 'gender roles, equality, or representation' },
  { id: 'migration',        title: 'Migration',                   prompt: 'migration, immigration, or diaspora communities' },
  { id: 'happiness',        title: 'What makes a good life',      prompt: 'happiness, success, or the meaning of a good life' },
];

// Days since 1970-01-01 in local time. Stable across reloads on the same day.
function localDayIndex(d: Date = new Date()): number {
  const ms = d.getTime() - d.getTimezoneOffset() * 60_000;
  return Math.floor(ms / 86_400_000);
}

export function getTopicOfDay(d: Date = new Date()): DailyTopic {
  const idx = ((localDayIndex(d) % TOPICS.length) + TOPICS.length) % TOPICS.length;
  return TOPICS[idx];
}
