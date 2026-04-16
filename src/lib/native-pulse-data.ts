export interface NativePulseWord {
  word: string;
  definition: string;
  register: 'formal' | 'casual' | 'literary' | 'slang';
  frequency_band: number;
  examples: { sentence: string; source: string }[];
}

export interface NativePulseCollocation {
  phrase: string;
  definition: string;
  examples: { sentence: string; source: string }[];
}

export const informalWords: NativePulseWord[] = [
  {
    word: 'lowkey',
    definition: 'Slightly, secretly, or in a restrained way; used to downplay something',
    register: 'slang',
    frequency_band: 5,
    examples: [
      { sentence: 'I lowkey want to skip the party and just stay home.', source: 'Reddit' },
      { sentence: 'That movie was lowkey the best thing I\'ve seen all year.', source: 'Twitter' },
    ],
  },
  {
    word: 'slay',
    definition: 'To do something exceptionally well; to look amazing or dominate',
    register: 'slang',
    frequency_band: 5,
    examples: [
      { sentence: 'She walked into the room and absolutely slayed in that outfit.', source: 'TikTok' },
      { sentence: 'You slayed that presentation — everyone was impressed.', source: 'Reddit' },
    ],
  },
  {
    word: 'situationship',
    definition: 'A romantic relationship that is undefined or lacks clear commitment',
    register: 'slang',
    frequency_band: 4,
    examples: [
      { sentence: 'We\'ve been in a situationship for three months and I still don\'t know what we are.', source: 'Twitter' },
      { sentence: 'Situationships are emotionally exhausting because there are no clear boundaries.', source: 'Podcast' },
    ],
  },
  {
    word: 'rent-free',
    definition: 'Living in someone\'s thoughts constantly; being unable to stop thinking about something',
    register: 'slang',
    frequency_band: 4,
    examples: [
      { sentence: 'That embarrassing moment from high school lives rent-free in my head.', source: 'Reddit' },
      { sentence: 'This song has been living rent-free in my mind all week.', source: 'Twitter' },
    ],
  },
  {
    word: 'understood the assignment',
    definition: 'Did exactly what was needed, often exceeding expectations in style or execution',
    register: 'slang',
    frequency_band: 4,
    examples: [
      { sentence: 'The costume designer understood the assignment — every outfit was perfect.', source: 'Twitter' },
      { sentence: 'When someone shows up to a theme party and clearly understood the assignment.', source: 'TikTok' },
    ],
  },
  {
    word: 'spill the tea',
    definition: 'To share gossip or reveal the truth about a situation',
    register: 'slang',
    frequency_band: 5,
    examples: [
      { sentence: 'Okay, spill the tea — what happened at the meeting?', source: 'Reddit' },
      { sentence: 'She spilled the tea about why the project was really cancelled.', source: 'Podcast' },
    ],
  },
  {
    word: 'no cap',
    definition: 'No lie; for real; telling the truth. "Cap" means a lie.',
    register: 'slang',
    frequency_band: 5,
    examples: [
      { sentence: 'That was the best burger I\'ve ever had, no cap.', source: 'TikTok' },
      { sentence: 'No cap, this is the hardest exam I\'ve ever taken.', source: 'Reddit' },
    ],
  },
  {
    word: 'main character',
    definition: 'Acting as if you are the protagonist of a story; living life with confidence and main-character energy',
    register: 'slang',
    frequency_band: 4,
    examples: [
      { sentence: 'She put on her headphones and walked through the city with main character energy.', source: 'TikTok' },
      { sentence: 'Today I\'m the main character — nothing can ruin my mood.', source: 'Twitter' },
    ],
  },
];

export const formalWords: NativePulseWord[] = [
  {
    word: 'meticulous',
    definition: 'Showing great attention to detail; very careful and precise',
    register: 'formal',
    frequency_band: 4,
    examples: [
      { sentence: 'The surgeon\'s meticulous technique reduced complications significantly.', source: 'NY Times' },
      { sentence: 'A meticulous review of the contract revealed several hidden clauses.', source: 'Podcast' },
    ],
  },
  {
    word: 'pragmatic',
    definition: 'Dealing with things sensibly and realistically rather than ideologically',
    register: 'formal',
    frequency_band: 4,
    examples: [
      { sentence: 'The committee adopted a pragmatic stance on budget allocation.', source: 'NY Times' },
      { sentence: 'Being pragmatic sometimes means accepting imperfect solutions.', source: 'Podcast' },
    ],
  },
  {
    word: 'equanimity',
    definition: 'Mental calmness, composure, and evenness of temper, especially in difficulty',
    register: 'formal',
    frequency_band: 2,
    examples: [
      { sentence: 'She accepted the verdict with equanimity, showing no outward emotion.', source: 'NY Times' },
      { sentence: 'Stoic philosophers valued equanimity above all other virtues.', source: 'Podcast' },
    ],
  },
  {
    word: 'sanguine',
    definition: 'Optimistic or positive, especially in a difficult situation',
    register: 'formal',
    frequency_band: 2,
    examples: [
      { sentence: 'Analysts are less sanguine about the economy\'s recovery prospects.', source: 'NY Times' },
      { sentence: 'His sanguine temperament made him a natural leader in crisis.', source: 'Podcast' },
    ],
  },
  {
    word: 'pernicious',
    definition: 'Having a harmful effect, especially in a gradual or subtle way',
    register: 'formal',
    frequency_band: 2,
    examples: [
      { sentence: 'The pernicious spread of misinformation undermines democratic institutions.', source: 'NY Times' },
      { sentence: 'Pernicious habits formed in childhood are difficult to break.', source: 'Podcast' },
    ],
  },
  {
    word: 'obfuscate',
    definition: 'To render obscure, unclear, or unintelligible',
    register: 'formal',
    frequency_band: 2,
    examples: [
      { sentence: 'The spokesperson seemed to obfuscate rather than answer the question.', source: 'NY Times' },
      { sentence: 'Technical jargon can obfuscate simple concepts unnecessarily.', source: 'Podcast' },
    ],
  },
  {
    word: 'ruminate',
    definition: 'To think deeply about something; to ponder at length',
    register: 'formal',
    frequency_band: 3,
    examples: [
      { sentence: 'Artists often ruminate on the meaning behind their own work.', source: 'Podcast' },
      { sentence: 'It\'s unhealthy to ruminate on past failures without seeking growth.', source: 'NY Times' },
    ],
  },
  {
    word: 'ephemeral',
    definition: 'Lasting for a very short time; transitory',
    register: 'literary',
    frequency_band: 3,
    examples: [
      { sentence: 'The ephemeral glow of fireflies illuminated the summer evening.', source: 'NY Times' },
      { sentence: 'Social media fame is often ephemeral, fading as quickly as it arrives.', source: 'Podcast' },
    ],
  },
  {
    word: 'eloquent',
    definition: 'Fluent or persuasive in speaking or writing; clearly expressing ideas',
    register: 'formal',
    frequency_band: 3,
    examples: [
      { sentence: 'Her eloquent speech moved the entire audience to tears.', source: 'NY Times' },
      { sentence: 'An eloquent writer can make even mundane topics fascinating.', source: 'Podcast' },
    ],
  },
  {
    word: 'tenacious',
    definition: 'Tending to keep a firm hold of something; persistent and determined',
    register: 'formal',
    frequency_band: 3,
    examples: [
      { sentence: 'The tenacious reporter pursued the story for over two years.', source: 'NY Times' },
      { sentence: 'Success often comes to the most tenacious, not the most talented.', source: 'Podcast' },
    ],
  },
];

export const collocations: NativePulseCollocation[] = [
  {
    phrase: 'make an effort',
    definition: 'To try hard to do something',
    examples: [
      { sentence: 'You need to make an effort to arrive on time.', source: 'General' },
      { sentence: 'She made a real effort to learn everyone\'s name.', source: 'Podcast' },
    ],
  },
  {
    phrase: 'reach a conclusion',
    definition: 'To arrive at a final decision or judgment after thinking',
    examples: [
      { sentence: 'After weeks of deliberation, the jury reached a conclusion.', source: 'NY Times' },
      { sentence: 'We need more data before we can reach a conclusion.', source: 'General' },
    ],
  },
  {
    phrase: 'raise awareness',
    definition: 'To make people conscious of an issue or cause',
    examples: [
      { sentence: 'The campaign aims to raise awareness about mental health.', source: 'NY Times' },
      { sentence: 'Social media has made it easier to raise awareness globally.', source: 'Reddit' },
    ],
  },
  {
    phrase: 'draw attention',
    definition: 'To cause people to notice something',
    examples: [
      { sentence: 'The report drew attention to the growing inequality gap.', source: 'NY Times' },
      { sentence: 'She didn\'t want to draw attention to herself during the ceremony.', source: 'General' },
    ],
  },
  {
    phrase: 'take into account',
    definition: 'To consider something when making a decision or judgment',
    examples: [
      { sentence: 'You should take into account the long-term consequences.', source: 'General' },
      { sentence: 'The judge took into account the defendant\'s clean record.', source: 'NY Times' },
    ],
  },
  {
    phrase: 'come to terms with',
    definition: 'To accept a difficult or unpleasant situation',
    examples: [
      { sentence: 'It took her years to come to terms with the loss.', source: 'Podcast' },
      { sentence: 'Society is still coming to terms with the impact of AI.', source: 'NY Times' },
    ],
  },
  {
    phrase: 'bear in mind',
    definition: 'To remember or consider something important',
    examples: [
      { sentence: 'Bear in mind that the deadline is next Friday.', source: 'General' },
      { sentence: 'Investors should bear in mind the risks involved.', source: 'NY Times' },
    ],
  },
  {
    phrase: 'pay attention',
    definition: 'To focus carefully on something',
    examples: [
      { sentence: 'Students who pay attention in class perform better on exams.', source: 'General' },
      { sentence: 'Pay attention to the details — they matter more than you think.', source: 'Podcast' },
    ],
  },
  {
    phrase: 'make progress',
    definition: 'To advance or improve in a task or goal',
    examples: [
      { sentence: 'The team has made significant progress on the new feature.', source: 'General' },
      { sentence: 'Recovery is slow, but she\'s making progress every day.', source: 'Podcast' },
    ],
  },
  {
    phrase: 'run the risk',
    definition: 'To do something that might have a negative result',
    examples: [
      { sentence: 'If we delay, we run the risk of losing the contract.', source: 'General' },
      { sentence: 'You run the risk of burnout if you don\'t take breaks.', source: 'Podcast' },
    ],
  },
];
