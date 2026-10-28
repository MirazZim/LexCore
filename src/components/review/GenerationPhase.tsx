import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, ArrowUp, Check, Command, CornerDownLeft, Flame, History, Lightbulb, Link2, Loader2,
  RotateCcw, Search, Shuffle, Sparkles, Trophy, Wand2, Wrench, X, Zap,
} from 'lucide-react';
import type { DueWordItem, AiFeedback, WordCollocation } from './types';
import { HERO, HERO_GREEN, ink } from './twoTone';
import type { ReviewTier } from '@/lib/fsrs';
import type { DailyTopic } from '@/lib/topic-of-day';
import { mintTrophy } from '@/lib/trophies';
import { getWordPos } from '@/lib/word-pos';

interface GenerationPhaseProps {
  currentItem: DueWordItem;
  currentIndex: number;
  totalWords: number;
  generationText: string;
  generationSaved: boolean;
  aiFeedback: AiFeedback | null;
  aiLoading: boolean;
  aiError: string | null;
  isSaving: boolean;
  activeConnector: string | null;
  onConnectorChange: (id: string | null) => void;
  onGenerationTextChange: (value: string) => void;
  onSave: () => void;
  onSaveQuick: () => void;        // mature path: save sentence, skip AI roundtrip
  onNextWord: () => void;
  onRetry: () => void;
  // New context for tiered + topic-aware production
  tier: ReviewTier;
  topic: DailyTopic;
  priorSentence: string | null;
  roastMode: boolean;
  onToggleRoast: () => void;
  collocations: WordCollocation[];
}

// Shared shape for connector chips and power-phrase chips.
// Both arrays satisfy this type so they can reuse the same lookup + sheet UI.
export type ChipCategory = {
  readonly id: string;
  readonly label: string;
  readonly hint: string;
  readonly color: string;
  readonly description: string;
  readonly tip: string;
  readonly items: readonly { readonly connector: string; readonly example: string }[];
};

export const CONNECTORS = [
  {
    id: 'cause',
    hint: 'X → Y',
    label: 'Cause & Effect',
    color: '#f97316',
    description: 'Use when one thing causes another',
    tip: 'Avoid "because of that" — it is a direct Bengali translation. Use "as a result" or "consequently" instead.',
    items: [
      { connector: 'As a result,', example: 'Traffic increased. As a result, air quality worsened.' },
      { connector: 'Consequently,', example: 'Roads were neglected. Consequently, accidents rose.' },
      { connector: 'Therefore,', example: 'Funding was cut. Therefore, services declined.' },
      { connector: 'This means that', example: 'Buses are unreliable. This means that workers arrive late.' },
      { connector: '…, which leads to', example: 'Poor roads cause accidents, which leads to economic loss.' },
      { connector: 'Due to', example: 'Due to heavy rainfall, several rural roads became impassable last week.' },
      { connector: 'Owing to', example: 'Owing to limited funding, the metro extension was delayed by two years.' },
      { connector: 'Because of', example: 'Because of poor planning, the new highway already requires major repairs.' },
    ],
  },
  {
    id: 'contrast',
    hint: 'X but Y',
    label: 'Contrast',
    color: '#8b5cf6',
    description: 'Use when two ideas disagree or surprise',
    tip: 'Never start a sentence with "But" in IELTS writing. Replace it with "However," every time.',
    items: [
      { connector: 'However,', example: 'Roads are important. However, public transport saves more lives.' },
      { connector: 'On the other hand,', example: 'Cities need metro systems. On the other hand, rural areas need roads.' },
      { connector: 'While', example: 'While transport is affordable, roads are still unsafe.' },
      { connector: 'Despite this,', example: 'Funding was low. Despite this, the system improved.' },
      { connector: 'Nevertheless,', example: 'Critics disagreed. Nevertheless, the policy was passed.' },
      { connector: 'Conversely,', example: 'Urban areas are well-connected. Conversely, rural villages remain isolated.' },
    ],
  },
  {
    id: 'adding',
    hint: 'X and Y',
    label: 'Adding Ideas',
    color: '#00FFC8',
    description: 'Use when building on the previous idea',
    tip: '"Also" alone is weak in academic writing. Upgrade it to "furthermore" or "moreover" for Band 6+.',
    items: [
      { connector: 'Furthermore,', example: 'Roads reduce accidents. Furthermore, they connect rural communities.' },
      { connector: 'Moreover,', example: 'Transport is cheap. Moreover, it reduces carbon emissions.' },
      { connector: 'In addition,', example: 'The system is fast. In addition, it is reliable.' },
      { connector: 'Not only… but also', example: 'It not only saves time but also reduces pollution.' },
      { connector: 'Along with', example: 'Along with better roads, the city introduced new bus routes.' },
      { connector: 'As well as', example: 'As well as cutting emissions, electric buses reduce noise pollution.' },
    ],
  },
  {
    id: 'examples',
    hint: 'like…',
    label: 'Examples',
    color: '#60a5fa',
    description: 'Use to introduce real evidence',
    tip: 'After your example, always add one sentence explaining WHY it proves your point. Never let examples stand alone.',
    items: [
      { connector: 'For instance,', example: 'Many cities lack transport. For instance, rural Bangladesh has no bus routes.' },
      { connector: 'For example,', example: 'Poor roads cause harm. For example, villages in Sylhet report weekly accidents.' },
      { connector: 'This is evident in', example: 'This is evident in Japan, where metro usage reduced road deaths by 40%.' },
      { connector: 'A clear example of this is', example: "A clear example of this is Singapore's investment in rail infrastructure." },
      { connector: 'Such as', example: 'Several countries, such as Germany and Japan, have invested heavily in rail.' },
    ],
  },
  {
    id: 'concluding',
    hint: 'wrap up',
    label: 'Concluding',
    color: '#f43f5e',
    description: 'Use in your conclusion only',
    tip: 'Never introduce a new idea in the conclusion. Restate your position in different words and end with an insight.',
    items: [
      { connector: 'In conclusion,', example: 'In conclusion, road infrastructure must precede transport investment.' },
      { connector: 'To summarise,', example: 'To summarise, both systems are needed, but roads come first.' },
      { connector: 'To sum up,', example: 'To sum up, sustainable transport requires both political will and steady funding.' },
      { connector: 'Overall,', example: 'Overall, the evidence suggests that public transport investment yields the greatest returns.' },
      { connector: 'Ultimately,', example: 'Ultimately, no transport system functions without stable roads.' },
      { connector: 'It is clear that', example: 'It is clear that governments must prioritise infrastructure.' },
    ],
  },
  {
    id: 'concession',
    hint: 'yes, but…',
    label: 'Concession',
    color: '#a78bfa',
    description: 'Admit the opposing view before countering it',
    tip: 'Don\'t just concede and leave it there — always follow with "however" or "yet" to bring the argument back to your side.',
    items: [
      { connector: 'Admittedly,', example: 'Admittedly, cars are convenient. However, their environmental cost is too high to ignore.' },
      { connector: 'It is true that', example: 'It is true that technology creates jobs. However, it also displaces traditional workers.' },
      { connector: 'Although', example: 'Although public transport is slow, it remains the most sustainable option.' },
      { connector: 'Even though', example: 'Even though the cost is high, investment in infrastructure is essential.' },
      { connector: 'Granted,', example: 'Granted, the policy has flaws. Yet it represents the first step toward meaningful change.' },
      { connector: 'In spite of', example: 'In spite of the rising costs, demand for public transport continues to grow.' },
      { connector: 'Despite', example: 'Despite the criticism, the metro project moved forward as planned.' },
      { connector: 'Regardless of', example: 'Regardless of political pressure, the safety regulations remained in place.' },
    ],
  },
  {
    id: 'condition',
    hint: 'if X then Y',
    label: 'Condition',
    color: '#fbbf24',
    description: 'Use for if/unless scenarios',
    tip: 'In academic writing, prefer "provided that" and "as long as" over the casual "if" for more formal impact.',
    items: [
      { connector: 'If', example: 'If governments invest in roads, rural economies will improve significantly.' },
      { connector: 'Unless', example: 'Unless emissions are reduced, climate targets will remain unmet.' },
      { connector: 'Provided that', example: 'Provided that funding is secured, the project will be completed on time.' },
      { connector: 'As long as', example: 'As long as safety standards are maintained, the benefits outweigh the risks.' },
      { connector: 'On the condition that', example: 'The agreement will hold on the condition that both parties comply.' },
    ],
  },
  {
    id: 'purpose',
    hint: 'in order to',
    label: 'Purpose',
    color: '#34d399',
    description: 'Use to explain the goal behind an action',
    tip: '"In order to" is more formal than bare "to" — use it in body paragraphs for added academic weight.',
    items: [
      { connector: 'In order to', example: 'In order to reduce congestion, cities must expand public transport.' },
      { connector: 'So that', example: 'Governments invest in education so that future generations can compete globally.' },
      { connector: 'With the aim of', example: 'The policy was introduced with the aim of cutting carbon emissions by 2030.' },
      { connector: 'To ensure that', example: 'Strict regulations exist to ensure that public safety is never compromised.' },
    ],
  },
  {
    id: 'comparison',
    hint: 'X like Y',
    label: 'Comparison',
    color: '#f472b6',
    description: 'Use to show two things are similar',
    tip: 'Never use "same as" in formal writing. Replace it with "similarly" or "likewise" for a higher band score.',
    items: [
      { connector: 'Similarly,', example: 'Japan invested in rail early. Similarly, Singapore built a world-class metro system.' },
      { connector: 'Likewise,', example: 'Roads reduce accidents. Likewise, street lighting improves pedestrian safety.' },
      { connector: 'In the same way,', example: 'Exercise improves mental health. In the same way, green spaces reduce urban stress.' },
      { connector: 'Just as', example: 'Just as physical health requires exercise, economic health requires investment.' },
      { connector: 'Compared to', example: 'Compared to road transport, rail travel emits far less carbon per journey.' },
    ],
  },
  {
    id: 'sequence',
    hint: 'first, then…',
    label: 'Sequence/Time',
    color: '#38bdf8',
    description: 'Use to order events or steps in an argument',
    tip: 'Avoid relying only on "firstly, secondly, thirdly" — vary with "initially", "subsequently", and "finally" for a richer sequence.',
    items: [
      { connector: 'Firstly,', example: 'Firstly, the government must assess existing infrastructure before spending begins.' },
      { connector: 'To begin with,', example: 'To begin with, any meaningful reform requires a clear and measurable goal.' },
      { connector: 'Subsequently,', example: 'Roads were built. Subsequently, trade between regions increased dramatically.' },
      { connector: 'Meanwhile,', example: 'Construction continued in the north. Meanwhile, southern areas faced neglect.' },
      { connector: 'At the same time,', example: 'New roads were paved. At the same time, public transport routes were expanded.' },
      { connector: 'As soon as', example: 'As soon as the policy was announced, fuel demand began to drop sharply.' },
      { connector: 'Immediately after,', example: 'The metro opened in 2010. Immediately after, traffic in central districts fell by 18%.' },
      { connector: 'Eventually,', example: 'Funding was delayed for years. Eventually, the project was abandoned altogether.' },
      { connector: 'Finally,', example: 'Finally, once the network is complete, maintenance must be prioritised.' },
    ],
  },
  {
    id: 'emphasis',
    hint: 'stress this',
    label: 'Emphasis',
    color: '#fb923c',
    description: 'Use to stress the importance of a point',
    tip: 'Use emphasis connectors only once per paragraph — overuse drains them of their power.',
    items: [
      { connector: 'Above all,', example: 'Above all, governments must ensure that basic services reach rural communities.' },
      { connector: 'In particular,', example: 'The report highlights one concern in particular: the lack of rural road access.' },
      { connector: 'Notably,', example: 'Notably, countries with strong infrastructure tend to report higher GDP growth.' },
      { connector: 'It is worth noting that', example: 'It is worth noting that investment in roads also benefits healthcare delivery.' },
      { connector: 'Crucially,', example: 'Crucially, no economic plan will succeed without addressing transport links first.' },
      { connector: 'There is no doubt that', example: 'There is no doubt that climate change is reshaping global migration patterns.' },
      { connector: 'It is undeniable that', example: 'It is undeniable that early education shapes a child\'s long-term opportunities.' },
      { connector: 'Certainly,', example: 'Certainly, no nation has succeeded economically without first investing in literacy.' },
      { connector: 'It is obvious that', example: 'It is obvious that overcrowded classrooms hurt learning outcomes.' },
      { connector: 'Clearly,', example: 'Clearly, the current waste management system cannot handle urban growth.' },
      { connector: 'Evidently,', example: 'Evidently, remote work has changed how cities plan their downtown areas.' },
      { connector: 'It is essential to', example: 'It is essential to maintain road quality if rural trade is to grow.' },
      { connector: 'It is necessary to', example: 'It is necessary to retrain workers as automation reshapes the job market.' },
      { connector: 'It is important to', example: 'It is important to balance economic growth with environmental protection.' },
    ],
  },
  {
    id: 'clarification',
    hint: 'I mean…',
    label: 'Clarification',
    color: '#4ade80',
    description: 'Use to explain or restate what you mean',
    tip: 'Use clarification connectors when your statement is complex — they show the examiner you can self-monitor your writing.',
    items: [
      { connector: 'In other words,', example: 'Investment declined. In other words, the roads were simply left to decay.' },
      { connector: 'That is to say,', example: 'The system is underfunded, that is to say, it cannot serve growing demand.' },
      { connector: 'To put it another way,', example: 'The policy failed. To put it another way, it never addressed the root cause.' },
      { connector: 'More specifically,', example: 'Poor infrastructure affects communities. More specifically, it limits access to hospitals.' },
      { connector: 'Put simply,', example: 'Put simply, there is not enough money and too little planning.' },
    ],
  },
  {
    id: 'generalisation',
    hint: 'usually…',
    label: 'Generalisation',
    color: '#c084fc',
    description: 'Use to make broad or universal claims',
    tip: 'Always soften generalisations with "tend to", "often", or "in many cases" — absolute claims are easy to disprove.',
    items: [
      { connector: 'In general,', example: 'In general, wealthier nations invest more heavily in public infrastructure.' },
      { connector: 'On the whole,', example: 'On the whole, countries with better roads report higher levels of economic growth.' },
      { connector: 'As a rule,', example: 'As a rule, urban areas receive more transport funding than rural ones.' },
      { connector: 'In most cases,', example: 'In most cases, road improvements lead to lower accident rates within two years.' },
      { connector: 'Broadly speaking,', example: 'Broadly speaking, infrastructure investment yields long-term economic dividends.' },
    ],
  },
  {
    id: 'opinion',
    hint: 'I think…',
    label: 'Opinion/Stance',
    color: '#facc15',
    description: 'Use to express your personal position',
    tip: 'Weak starters like "I think" score lower — use "It is argued that" or "I would contend that" for formal IELTS impact.',
    items: [
      { connector: 'It is argued that', example: 'It is argued that public transport is more beneficial than private vehicle use.' },
      { connector: 'In my view,', example: 'In my view, governments should prioritise rail over road construction.' },
      { connector: 'It is widely believed that', example: 'It is widely believed that education is the key driver of economic growth.' },
      { connector: 'From my perspective,', example: 'From my perspective, short-term costs should not deter long-term infrastructure planning.' },
      { connector: 'I would contend that', example: 'I would contend that without proper funding, no transport reform will succeed.' },
      { connector: 'I believe', example: 'I believe that early intervention is the most effective way to reduce dropout rates.' },
      { connector: 'Personally,', example: 'Personally, I find that sustained reform matters more than dramatic announcements.' },
    ],
  },
  {
    id: 'unexpected',
    hint: 'surprise!',
    label: 'Unexpected Result',
    color: '#e879f9',
    description: 'Use when the outcome is surprising or contrary to expectation',
    tip: '"Surprisingly" alone is not enough — always explain why the result was unexpected to demonstrate critical thinking.',
    items: [
      { connector: 'Surprisingly,', example: 'Roads were built in the region. Surprisingly, air pollution actually decreased.' },
      { connector: 'Unexpectedly,', example: 'The budget was cut. Unexpectedly, efficiency improved as a result.' },
      { connector: 'Against all expectations,', example: 'Against all expectations, ridership increased during the economic downturn.' },
      { connector: 'It is remarkable that', example: 'It is remarkable that a city of this size manages with so few private vehicles.' },
      { connector: 'Paradoxically,', example: 'Paradoxically, building more roads often leads to greater traffic congestion over time.' },
    ],
  },
  // ─── NEW CATEGORIES ──────────────────────────────────────────────
  {
    id: 'attribution',
    hint: 'they said…',
    label: 'Attribution',
    color: '#14b8a6',
    description: 'Use to cite data, studies, or sources',
    tip: 'When citing in IELTS, vary your attribution phrases. Relying on "according to" every time is a Band 5 habit.',
    items: [
      { connector: 'According to', example: 'According to recent studies, urban traffic has nearly doubled in the past decade.' },
      { connector: 'Based on', example: 'Based on government data, road accidents fell by 12% after the new policy.' },
      { connector: 'As stated by', example: 'As stated by the Ministry of Transport, road safety remains the top priority.' },
      { connector: 'It is believed that', example: 'It is believed that public transport significantly reduces commuter stress.' },
    ],
  },
  {
    id: 'time-markers',
    hint: 'now / later',
    label: 'Time Markers',
    color: '#ec4899',
    description: 'Use to anchor a claim in the present or future',
    tip: 'Avoid "Nowadays" as the opener of every paragraph — alternate with "At present" or "Currently" for variety.',
    items: [
      { connector: 'Nowadays,', example: 'Nowadays, most students rely on smartphones for daily research and study.' },
      { connector: 'At present,', example: 'At present, only 30% of rural villages have stable internet access.' },
      { connector: 'Currently,', example: 'Currently, the government is reviewing its long-term transport policy.' },
      { connector: 'In the future,', example: 'In the future, electric vehicles will likely replace petrol cars in urban areas.' },
      { connector: 'In upcoming years,', example: 'In upcoming years, AI tools will reshape education across developing countries.' },
      { connector: 'Later on,', example: 'The plan begins in 2027. Later on, additional cities will join the network.' },
    ],
  },
  {
    id: 'past',
    hint: 'back then…',
    label: 'Past Events',
    color: '#a3e635',
    description: 'Use to describe what happened before or how things used to be',
    tip: 'Pair these with past tenses: "In the past, people travelled…". Use "used to" for habits that have stopped, and "Since then," to link the past to today.',
    items: [
      { connector: 'In the past,', example: 'In the past, most families in my village travelled to the city by boat.' },
      { connector: 'Back then,', example: 'I started school in 2010. Back then, very few classrooms had computers.' },
      { connector: 'Previously,', example: 'Previously, the town relied on a single hospital for all emergencies.' },
      { connector: 'At that time,', example: 'At that time, mobile phones were a luxury that few students could afford.' },
      { connector: 'Years ago,', example: 'Years ago, this street was lined with small family-run shops.' },
      { connector: 'Historically,', example: 'Historically, river trade was the main source of income for the region.' },
      { connector: 'used to', example: 'People used to write letters, but now they send instant messages.' },
      { connector: 'By the time', example: 'By the time the bridge opened, the old ferry service had already closed.' },
      { connector: 'Before that,', example: 'I moved to Dhaka in 2018. Before that, I had never lived in a big city.' },
      { connector: 'Since then,', example: 'The metro opened in 2022. Since then, commuting times have fallen sharply.' },
    ],
  },
  {
    id: 'future',
    hint: 'will / soon',
    label: 'Future Events',
    color: '#818cf8',
    description: 'Use to predict, plan or describe what is going to happen',
    tip: 'Predictions sound more academic when softened: prefer "is likely to" or "is expected to" over a flat "will" unless you are certain.',
    items: [
      { connector: 'In the coming years,', example: 'In the coming years, more students will study online from home.' },
      { connector: 'In the near future,', example: 'In the near future, the city plans to open three new metro lines.' },
      { connector: 'In the long run,', example: 'In the long run, investing in education will strengthen the economy.' },
      { connector: 'Over the next decade,', example: 'Over the next decade, electric buses are expected to replace diesel ones.' },
      { connector: 'By 2030,', example: 'By 2030, most households will probably rely on solar power.' },
      { connector: 'Before long,', example: 'Before long, paper tickets will disappear from public transport entirely.' },
      { connector: 'Sooner or later,', example: 'Sooner or later, cities will have to limit private car use in their centres.' },
      { connector: 'is likely to', example: 'Remote work is likely to change how offices are designed.' },
      { connector: 'is expected to', example: 'The population of the capital is expected to double by 2050.' },
      { connector: 'From now on,', example: 'From now on, all new buildings must include rainwater storage.' },
    ],
  },
  {
    id: 'solutions',
    hint: 'fix it by…',
    label: 'Solutions',
    color: '#22d3ee',
    description: 'Use to propose a fix or remedy',
    tip: 'After proposing a solution, always explain WHY it works. Examiners reward depth, not the suggestion alone.',
    items: [
      { connector: 'One possible solution', example: 'One possible solution is to build dedicated bus lanes across major cities.' },
      { connector: 'One remedy', example: 'One remedy for traffic congestion is investing in underground metro systems.' },
      { connector: 'One approach', example: 'One approach to reducing emissions is to subsidise electric vehicles for low-income families.' },
    ],
  },
] as const satisfies readonly ChipCategory[];

// Power Phrases — vocab upgrades and collocations.
// NOT sentence connectors. Use these to strengthen the words *inside* your sentences.
export const POWER_PHRASES = [
  {
    id: 'pp-quantity',
    hint: 'how many',
    label: 'Quantity & Scale',
    color: '#f59e0b',
    description: 'Replace weak quantifiers like "a lot of"',
    tip: '"A lot of" is informal. Use "numerous" or "a significant proportion" for academic register.',
    items: [
      { connector: 'A large number of', example: 'A large number of students drop out of university due to financial pressure.' },
      { connector: 'The majority of', example: 'The majority of citizens support stricter traffic laws in residential areas.' },
      { connector: 'Numerous', example: 'Numerous studies have linked long-term air pollution to heart disease.' },
      { connector: 'Various', example: 'Various countries have adopted similar climate policies in the past decade.' },
      { connector: 'A wide range of', example: 'Universities now offer a wide range of online courses for working adults.' },
      { connector: 'A significant proportion', example: 'A significant proportion of urban residents now commute by metro rather than car.' },
      { connector: 'Most', example: 'Most households in the region rely on a single source of income.' },
    ],
  },
  {
    id: 'pp-trends',
    hint: 'going up / down',
    label: 'Trends',
    color: '#6366f1',
    description: 'Describe how something changes over time',
    tip: '"More and more" is acceptable but "increasingly" scores higher. Use trend phrases in introductions and conclusions.',
    items: [
      { connector: 'More and more', example: 'More and more people now work remotely after the pandemic reshaped office culture.' },
      { connector: 'Increasingly,', example: 'Urban areas are increasingly turning to renewable energy sources to meet demand.' },
      { connector: 'Less and less', example: 'Less and less cash is used in daily transactions as digital wallets spread.' },
      { connector: 'Gradually,', example: 'The government is gradually phasing out single-use plastics across the country.' },
    ],
  },
  {
    id: 'pp-hedging',
    hint: 'kind of / sort of',
    label: 'Hedging',
    color: '#94a3b8',
    description: 'Soften absolute claims to sound more academic',
    tip: 'Hedging shows critical thinking. Absolute claims ("always", "never") invite the examiner to disprove you.',
    items: [
      { connector: 'To a certain extent,', example: 'To a certain extent, technology has improved the quality of public education.' },
      { connector: 'Partially', example: 'The policy was partially successful in reducing emissions in the first year.' },
      { connector: 'To some degree,', example: 'To some degree, social media has weakened face-to-face communication skills.' },
    ],
  },
  {
    id: 'pp-collocations',
    hint: 'IELTS power',
    label: 'Collocations',
    color: '#d946ef',
    description: 'Verb + noun combos examiners reward',
    tip: 'Use 2–3 per essay — not more — or your writing sounds memorised rather than authentic.',
    items: [
      { connector: 'plays an important role', example: 'Education plays an important role in long-term economic development.' },
      { connector: 'has negative effects', example: 'Excessive screen time has negative effects on children\'s eyesight and sleep.' },
      { connector: 'has positive effects', example: 'Regular exercise has positive effects on both mental and physical health.' },
      { connector: 'take responsibility', example: 'Governments must take responsibility for maintaining public infrastructure.' },
      { connector: 'improve quality of life', example: 'Better healthcare can dramatically improve quality of life in rural communities.' },
      { connector: 'can be seen as', example: 'Free education can be seen as a long-term investment in a country\'s future.' },
      { connector: 'A key factor', example: 'A key factor in urban migration is the search for better employment opportunities.' },
    ],
  },
] as const satisfies readonly ChipCategory[];

export type ConnectorCategory = typeof CONNECTORS[number];
export type PowerPhraseCategory = typeof POWER_PHRASES[number];

/** Bolds the connector inside its example; with `marker` (a 6-digit hex), it's
 *  swept in like a highlighter pen in that colour instead. */
function highlightConnector(example: string, connector: string, marker?: string) {
  const clean = connector.replace('…, ', '').replace('… ', '');
  const idx = example.toLowerCase().indexOf(clean.toLowerCase());
  if (idx === -1) return <>{example}</>;
  const hit = example.slice(idx, idx + clean.length);
  return (
    <>
      {example.slice(0, idx)}
      {marker ? (
        <motion.mark
          initial={{ backgroundSize: '0% 100%' }}
          animate={{ backgroundSize: '100% 100%' }}
          transition={{ duration: 0.45, delay: 0.1, ease: 'easeOut' }}
          className="rounded-sm px-0.5 font-bold text-zinc-900"
          style={{
            backgroundColor: 'transparent',
            backgroundImage: `linear-gradient(transparent 50%, ${marker}40 50%)`,
            backgroundRepeat: 'no-repeat',
          }}
        >
          {hit}
        </motion.mark>
      ) : (
        <span className="font-bold text-zinc-900">{hit}</span>
      )}
      {example.slice(idx + clean.length)}
    </>
  );
}

export function ConnectorContent({ data }: { data: ChipCategory }) {
  return (
    <div className="space-y-2">
      {data.items.map((item: { connector: string; example: string }) => (
        <div
          key={item.connector}
          className="rounded-2xl px-4 py-3 grid"
          style={{
            background: `${data.color}0c`,
            border: `1px solid ${data.color}28`,
            gridTemplateColumns: 'auto 1fr',
            columnGap: '14px',
          }}
        >
          <span
            className="text-sm font-bold shrink-0 pt-0.5"
            style={{ color: data.color, fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {item.connector}
          </span>
          <span className="text-sm text-zinc-400 leading-relaxed">
            {highlightConnector(item.example, item.connector)}
          </span>
        </div>
      ))}
      <div
        className="rounded-2xl px-4 py-3 flex gap-2.5"
        style={{ background: 'rgba(255,200,0,0.06)', border: '1px solid rgba(255,200,0,0.18)' }}
      >
        <span className="text-sm shrink-0">⚠️</span>
        <p className="text-xs text-yellow-300/70 leading-relaxed">{data.tip}</p>
      </div>
    </div>
  );
}

const verdictConfig = {
  natural: { color: '#059669', label: 'Natural' },
  close: { color: '#ea580c', label: 'Almost there' },
  unnatural: { color: '#dc2626', label: 'Not quite' },
} as const;

const FONT_DISPLAY = "'Space Grotesk', sans-serif";
const LAB = '#fbbf24';
// Amber deep enough to read on the light surface
const LAB_INK = ink(LAB);
// Viewport minus the page chrome: header, top margin, the skip pill and bottom padding
const CARD_STYLE = { height: 'min(calc(100dvh - 12rem), 880px)' };
// Shared by the textarea and its highlight mirror — must stay identical
const EDITOR_TEXT = 'text-[19px] lg:text-[22px] leading-[1.55] tracking-[-0.01em] px-1 py-1';

// ── Word / phrase detection (local, no LLM) ───────────────────────
function stemsFor(word: string) {
  const w = word.toLowerCase().trim();
  const stems = [w];
  if (w.endsWith('e')) stems.push(w.slice(0, -1));
  if (w.endsWith('y')) stems.push(w.slice(0, -1) + 'i');
  return stems;
}

function isTargetToken(token: string, word: string) {
  const t = token.toLowerCase();
  return stemsFor(word).some(s => t.startsWith(s) && t.length - s.length <= 4);
}

function usesWord(text: string, word: string) {
  if (word.includes(' ')) return text.toLowerCase().includes(word.toLowerCase());
  return (text.match(/[A-Za-z]+/g) ?? []).some(t => isTargetToken(t, word));
}

/** "Not only… but also" → "Not only", "…, which leads to" → "which leads to" */
function insertableText(phrase: string) {
  return phrase.replace(/^…,?\s*/, '').split('…')[0].trim();
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ALL_CONNECTORS = CONNECTORS.flatMap(c => c.items.map(i => insertableText(i.connector).replace(/,$/, '')));

function findConnector(text: string): string | null {
  const t = ` ${text.toLowerCase().replace(/\s+/g, ' ')} `;
  return ALL_CONNECTORS.find(c => c.length > 2 && new RegExp(`[\\s,.(]${escapeRe(c.toLowerCase())}[\\s,.]`).test(t)) ?? null;
}

const SMALL_WORDS = new Set(['a', 'an', 'the', 'of', 'to', 'in', 'on', 'for', 'with', 'at', 'by', 'and', 'or']);

function findCollocation(text: string, collocations: WordCollocation[], word: string): string | null {
  if (!usesWord(text, word)) return null;
  const lower = text.toLowerCase();
  for (const col of collocations) {
    const partners = (col.collocation.toLowerCase().match(/[a-z']+/g) ?? [])
      .filter(t => !SMALL_WORDS.has(t) && !isTargetToken(t, word));
    if (partners.length && partners.every(p => new RegExp(`\\b${escapeRe(p)}`).test(lower))) return col.collocation;
  }
  return null;
}

function highlightTarget(text: string, word: string, color = LAB_INK) {
  return text.split(/([A-Za-z]+)/).map((p, i) =>
    i % 2 === 1 && isTargetToken(p, word)
      ? <span key={i} style={{ color, fontWeight: 600 }}>{p}</span>
      : <span key={i}>{p}</span>
  );
}

// ── Command palette ───────────────────────────────────────────────
interface PaletteItem { key: string; group: string; color: string; label: string; insert: string; example?: string }

function buildPaletteItems(collocations: WordCollocation[]): PaletteItem[] {
  const items: PaletteItem[] = collocations.map(c => ({
    key: `col-${c.id}`, group: 'Collocations', color: '#00FFC8', label: c.collocation, insert: c.collocation,
  }));
  for (const list of [CONNECTORS, POWER_PHRASES] as const) {
    for (const cat of list as readonly ChipCategory[]) {
      for (const it of cat.items) {
        items.push({
          key: `${cat.id}-${it.connector}`, group: cat.label, color: cat.color,
          label: it.connector, insert: insertableText(it.connector), example: it.example,
        });
      }
    }
  }
  return items;
}

function CommandPalette({
  open, items, onClose, onPick,
}: { open: boolean; items: PaletteItem[]; onClose: () => void; onPick: (text: string) => void }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const q = query.trim().toLowerCase();
  const results = q
    ? items.filter(i => `${i.label} ${i.group} ${i.example ?? ''}`.toLowerCase().includes(q))
    : items;

  useEffect(() => { if (open) { setQuery(''); setActive(0); } }, [open]);
  useEffect(() => { setActive(0); }, [query]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (results[active]) onPick(results[active].insert); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };

  let lastGroup = '';
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="fixed z-50 left-1/2 top-[12vh] w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 rounded-3xl overflow-hidden flex flex-col"
            style={{
              maxHeight: '64vh',
              background: '#ffffff',
              border: '1px solid rgba(15,23,20,0.08)',
              boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
            }}
          >
            <div className="shrink-0 flex items-center gap-3 px-5 h-14" style={{ borderBottom: '1px solid rgba(15,23,20,0.06)' }}>
              <Search className="h-4 w-4 text-zinc-400" />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search collocations, connectors, phrases…"
                className="flex-1 bg-transparent outline-none text-[15px] text-zinc-900 placeholder:text-zinc-400"
              />
              <kbd className="text-[10px] text-zinc-500 px-1.5 py-0.5 rounded-md" style={{ background: '#f4f4f5' }}>esc</kbd>
            </div>
            <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto p-2 [scrollbar-width:thin]">
              {results.length === 0 && (
                <p className="text-sm text-zinc-400 text-center py-8">Nothing matches “{query}”.</p>
              )}
              {results.map((item, idx) => {
                const header = item.group !== lastGroup;
                lastGroup = item.group;
                const isActive = idx === active;
                return (
                  <div key={item.key}>
                    {header && (
                      <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] font-bold text-zinc-400 px-3 pt-3 pb-1.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: item.color }} /> {item.group}
                      </p>
                    )}
                    <button
                      data-idx={idx}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => onPick(item.insert)}
                      className="w-full text-left rounded-xl px-3 py-2 flex items-baseline gap-3 transition-colors"
                      style={{ background: isActive ? '#f4f4f5' : 'transparent' }}
                    >
                      <span className="text-[14px] font-semibold shrink-0" style={{ color: isActive ? ink(item.color) : '#27272a', fontFamily: FONT_DISPLAY }}>
                        {item.label}
                      </span>
                      {item.example && (
                        <span className="text-[12px] text-zinc-400 truncate">{item.example}</span>
                      )}
                      {isActive && <CornerDownLeft className="ml-auto h-3.5 w-3.5 shrink-0 text-zinc-400 self-center" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Writer's toolkit (collocations / connectors / power phrases) ──
type ToolTab = 'connectors' | 'phrases' | 'collocations';

// Each tab has its own icon; the active one shows its label and tints its icon.
const TOOL_TABS = [
  { id: 'collocations', label: 'Collocations', Icon: Link2, color: '#059669' },
  { id: 'connectors', label: 'Connectors', Icon: Shuffle, color: '#7c3aed' },
  { id: 'phrases', label: 'Power phrases', Icon: Zap, color: '#d97706' },
] as const;

/** `showBadge` puts the toolkit's wand badge at the start of the tab row (the
 *  mobile sheet has its own titled header instead). */
function Toolkit({
  collocations, word, onInsert, showBadge = false,
}: { collocations: WordCollocation[]; word: string; onInsert: (text: string) => void; showBadge?: boolean }) {
  const [tab, setTab] = useState<ToolTab>(collocations.length ? 'collocations' : 'connectors');
  const list: readonly ChipCategory[] = tab === 'connectors' ? CONNECTORS : POWER_PHRASES;
  const [catId, setCatId] = useState<string>(CONNECTORS[0].id);
  const cat = list.find(c => c.id === catId) ?? list[0];
  // Chip under the pointer/focus. Keys are scoped to the current list, so a
  // stale hover from another category can never leak into the preview.
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  const switchTab = (id: ToolTab) => {
    setTab(id);
    setHoverKey(null);
    if (id === 'connectors') setCatId(CONNECTORS[0].id);
    if (id === 'phrases') setCatId(POWER_PHRASES[0].id);
  };

  const chips: { key: string; label: string; insert: string; example?: string; color: string }[] =
    tab === 'collocations'
      ? collocations.map(c => ({ key: `col-${c.id}`, label: c.collocation, insert: c.collocation, color: '#00FFC8' }))
      : cat.items.map(i => ({ key: `${cat.id}::${i.connector}`, label: i.connector, insert: insertableText(i.connector), example: i.example, color: cat.color }));
  // Preview always belongs to the visible list: hovered chip, else the first one
  const previewChip = chips.find(c => c.key === hoverKey) ?? chips[0];

  return (
    <div className="h-full flex flex-col min-h-0" onMouseLeave={() => setHoverKey(null)}>
      {/* Tabs: a dark track; the active tab is a white pill with its label,
          the others are just icons. The pill slides between them. */}
      <div className="shrink-0 flex items-center gap-2.5">
        <div className="inline-flex items-center gap-0.5 p-[3px] rounded-full" style={{ background: '#161618', boxShadow: '0 6px 18px -8px rgba(0,0,0,0.5)' }}>
          {TOOL_TABS.filter(t => t.id !== 'collocations' || collocations.length > 0).map(t => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => switchTab(t.id)}
                title={active ? undefined : t.label}
                aria-label={t.label}
                className={`relative h-7 rounded-full flex items-center gap-1 text-[12px] font-semibold transition-colors ${
                  active ? 'pl-2.5 pr-3 text-zinc-900' : 'w-7 justify-center text-white/65 hover:text-white'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="toolkit-tab"
                    className="absolute inset-0 rounded-full bg-white"
                    style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.25)' }}
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <t.Icon className="relative h-3.5 w-3.5 shrink-0" strokeWidth={2} style={active ? { color: t.color } : undefined} />
                {active && (
                  <motion.span
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08, duration: 0.18 }}
                    className="relative whitespace-nowrap"
                  >
                    {t.label}
                  </motion.span>
                )}
                {active && t.id === 'collocations' && (
                  <span
                    className="relative min-w-[16px] h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center text-white"
                    style={{ background: t.color }}
                  >
                    {collocations.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {showBadge && (
          <span
            title="Writer's toolkit"
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: '#161618', boxShadow: '0 6px 18px -8px rgba(0,0,0,0.5)' }}
          >
            <Wand2 className="h-3.5 w-3.5 text-white" strokeWidth={2} />
          </span>
        )}
      </div>

      {/* Category cloud — every category visible, one click to switch */}
      {tab !== 'collocations' && (
        <div className="shrink-0 flex flex-wrap gap-1 mt-3">
          {list.map(c => {
            const active = c.id === cat.id;
            return (
              <button
                key={c.id}
                onClick={() => { setCatId(c.id); setHoverKey(null); }}
                className="relative rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold transition-colors"
                style={{
                  color: active ? '#0b0b0e' : '#52525b',
                  background: active ? 'transparent' : '#fff',
                  border: `1px solid ${active ? c.color : 'rgba(15,23,20,0.08)'}`,
                }}
              >
                {active && (
                  <motion.span
                    layoutId={`toolkit-cat-${tab}`}
                    className="absolute inset-0 rounded-full"
                    style={{ background: c.color, boxShadow: `0 0 16px ${c.color}55` }}
                    transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                  />
                )}
                <span className="relative flex items-center gap-1.5">
                  {!active && <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />}
                  {c.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="shrink-0 h-px my-3" style={{ background: 'linear-gradient(90deg, rgba(15,23,20,0.1), transparent)' }} />

      {/* Phrase cloud — tap to insert at the cursor */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab === 'collocations' ? 'collocations' : cat.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
          // Scrolls on its own if a long category doesn't fit, so the
          // example + tip below are never pushed out of the card
          className="min-h-0 overflow-y-auto [scrollbar-width:thin]"
        >
          {tab !== 'collocations' && (
            <p className="text-[12px] text-zinc-500 mb-2.5">
              <span className="font-bold" style={{ color: ink(cat.color) }}>{cat.label}</span> · {cat.description}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip, i) => {
              const lit = tab !== 'collocations' && chip.key === previewChip?.key;
              return (
                <motion.button
                  key={chip.key}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.015, duration: 0.15 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => onInsert(chip.insert)}
                  onMouseEnter={() => setHoverKey(chip.key)}
                  onFocus={() => setHoverKey(chip.key)}
                  className="rounded-xl px-3.5 py-2 text-[14px] font-semibold transition-all"
                  style={{
                    fontFamily: FONT_DISPLAY,
                    color: ink(chip.color),
                    background: lit ? `${chip.color}26` : `${chip.color}0d`,
                    border: `1px solid ${lit ? chip.color : chip.color + '30'}`,
                    boxShadow: lit ? `0 0 16px ${chip.color}30` : 'none',
                  }}
                >
                  {tab === 'collocations' ? highlightTarget(chip.label, word, '#047857') : chip.label}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="flex-1 min-h-3" />

      {/* Example + tip — full text, never clipped */}
      <div className="shrink-0 space-y-1.5">
        <AnimatePresence mode="wait" initial={false}>
          {tab !== 'collocations' && previewChip?.example ? (
            // The example as a card: connector pill on top, the sentence with
            // the connector swept in highlighter in its category colour
            <motion.div
              key={previewChip.key}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
              className="relative rounded-xl bg-white pl-4 pr-3 py-2 overflow-hidden"
              style={{ border: '1px solid rgba(15,23,20,0.08)' }}
            >
              <span aria-hidden className="absolute left-0 inset-y-0 w-1" style={{ background: ink(previewChip.color) }} />
              <div className="flex items-center gap-1.5 mb-1">
                <span className="rounded-full px-2 py-px text-[10.5px] font-bold text-white" style={{ background: ink(previewChip.color) }}>
                  {previewChip.label}
                </span>
                <span className="text-[9px] uppercase tracking-[0.16em] font-bold text-zinc-400">in a sentence</span>
              </div>
              <p className="text-[13.5px] font-medium leading-snug text-zinc-800">
                {highlightConnector(previewChip.example, previewChip.label, ink(previewChip.color))}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="col-tip"
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-start gap-2 rounded-xl px-3 py-2"
              style={{ background: '#e9fbf5', border: '1.5px solid #a7ecd6' }}
            >
              <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white" style={{ background: '#059669' }}>
                <Link2 className="h-3 w-3" strokeWidth={2.6} />
              </span>
              <p className="text-[12.5px] leading-snug text-zinc-800">
                Natural partners for <span className="font-bold text-emerald-700">{word}</span>. Use one to light up the <span className="font-bold">Collocation</span> check.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        {tab !== 'collocations' && (
          // The tip as a sticky note
          <div className="flex items-start gap-2 rounded-xl px-3 py-2" style={{ background: '#fff8e1', border: '1.5px solid #fde68a' }}>
            <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white" style={{ background: '#f59e0b' }}>
              <Lightbulb className="h-3 w-3" strokeWidth={2.6} />
            </span>
            <p className="min-w-0 text-[12px] leading-snug text-zinc-800">
              <span className="mr-1 text-[9px] uppercase tracking-[0.16em] font-bold text-amber-700">Tip</span>
              {cat.tip}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────
export function GenerationPhase({
  currentItem, currentIndex, totalWords, generationText, generationSaved,
  aiFeedback, aiLoading, aiError, isSaving,
  onGenerationTextChange, onSave, onSaveQuick, onNextWord, onRetry,
  tier, topic, priorSentence, roastMode, onToggleRoast, collocations,
}: GenerationPhaseProps) {
  const word = currentItem.word.word;
  const verdict = aiFeedback
    ? verdictConfig[aiFeedback.verdict as keyof typeof verdictConfig] ?? verdictConfig.close
    : null;

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const caretRef = useRef<{ start: number; end: number } | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const paletteItems = useMemo(() => buildPaletteItems(collocations), [collocations]);

  // Mint a trophy on a 9+ score. Fires once per saved sentence.
  const mintedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!aiFeedback || aiFeedback.score < 9) return;
    const key = `${currentItem.word.id}::${generationText.trim()}`;
    if (mintedRef.current === key) return;
    mintedRef.current = key;
    mintTrophy({
      word,
      wordId: currentItem.word.id,
      sentence: generationText.trim(),
      topic: topic.title,
      score: aiFeedback.score,
    });
  }, [aiFeedback, currentItem.word.id, word, generationText, topic.title]);

  // Reset mint guard between words so the next word can mint
  useEffect(() => { mintedRef.current = null; }, [currentItem.word.id]);

  // Shrink-to-fit for the feedback: no scrolling, so if it overflows its box
  // (long AI notes, short screens), step the zoom down until it fits.
  const reviewBoxRef = useRef<HTMLDivElement>(null);
  const reviewContentRef = useRef<HTMLDivElement>(null);
  const [reviewZoom, setReviewZoom] = useState(1);
  const [viewportH, setViewportH] = useState(() => window.innerHeight);
  useEffect(() => {
    const onResize = () => setViewportH(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  useLayoutEffect(() => {
    setReviewZoom(1);
  }, [aiFeedback, aiError, aiLoading, generationSaved, viewportH]);
  useLayoutEffect(() => {
    const box = reviewBoxRef.current;
    const content = reviewContentRef.current;
    if (!box || !content) return;
    if (content.getBoundingClientRect().height > box.clientHeight && reviewZoom > 0.7) {
      setReviewZoom(z => Math.round((z - 0.05) * 100) / 100);
    }
  }, [reviewZoom, aiFeedback, aiError, aiLoading, generationSaved, viewportH]);

  const placeholder = tier === 'learning'
    ? 'A few words is enough…'
    : tier === 'leech'
      ? 'Rewrite it, sharper this time…'
      : 'Start writing…';

  const showRemix = (tier === 'learning' || tier === 'mature' || tier === 'leech') && !!priorSentence;
  const trophyMinted = !!aiFeedback && aiFeedback.score >= 9;
  const pos = getWordPos(word);

  // ── Live checks → meter + one next-step hint ──────────────────
  const text = generationText.trim();
  const wordCount = text ? text.split(/\s+/).length : 0;
  const hasWord = !!text && usesWord(text, word);
  const connector = text ? findConnector(text) : null;
  const collocation = text ? findCollocation(text, collocations, word) : null;
  const lengthOk = wordCount >= 8 && wordCount <= 30;
  const checks = [
    { ok: hasWord, label: 'Word' },
    { ok: lengthOk, label: 'Length' },
    { ok: !!connector, label: 'Connector' },
    ...(collocations.length ? [{ ok: !!collocation, label: 'Collocation' }] : []),
  ];
  const sampleCollocation = collocations[0]?.collocation;
  const hintKey = !text ? 'empty' : !hasWord ? 'word' : wordCount < 8 ? 'short' : wordCount > 30 ? 'long'
    : !connector ? 'connector' : collocations.length && !collocation ? 'collocation' : 'done';
  const hint = !text
    ? <>Press <Kbd>/</Kbd> for collocations, connectors and power phrases</>
    : !hasWord
      ? <>Work <span style={{ color: LAB }}>{word}</span> into the sentence</>
      : wordCount < 8
        ? <>Keep going — aim for at least 8 words</>
        : wordCount > 30
          ? <>Tighten it — under 30 words reads cleaner</>
          : !connector
            ? <>Link two ideas with a connector · <Kbd>/</Kbd></>
            : collocations.length && !collocation
              ? <>Bonus: try a collocation{sampleCollocation ? <> like <span className="text-[#00FFC8]">{sampleCollocation}</span></> : null}</>
              : <span className="text-[#00FFC8]">Strong sentence — send it</span>;

  const canSubmit = !!text && !isSaving && !aiLoading;
  const submit = () => {
    if (!canSubmit) return;
    if (tier === 'mature') onSaveQuick(); else onSave();
  };

  const openPalette = () => {
    const el = textareaRef.current;
    caretRef.current = el ? { start: el.selectionStart, end: el.selectionEnd } : null;
    setPaletteOpen(true);
  };

  const insert = (phrase: string) => {
    const value = generationText;
    const { start, end } = caretRef.current ?? { start: value.length, end: value.length };
    const before = value.slice(0, start);
    const after = value.slice(end);
    const lead = before && !/\s$/.test(before) ? ' ' : '';
    const next = `${before}${lead}${phrase} ${after.replace(/^\s+/, '')}`;
    onGenerationTextChange(next);
    setPaletteOpen(false);
    setSheetOpen(false);
    const caret = (before + lead + phrase + ' ').length;
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(caret, caret);
    });
  };

  // Toolkit clicks: the textarea keeps its selection while blurred, so read it now
  const insertAtCursor = (phrase: string) => {
    const el = textareaRef.current;
    caretRef.current = el ? { start: el.selectionStart, end: el.selectionEnd } : null;
    insert(phrase);
  };

  const onEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === '/' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); openPalette(); return; }
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); }
  };

  // Global: Ctrl/Cmd+K opens the palette; after feedback, Enter moves on.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (!generationSaved && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openPalette();
      } else if (generationSaved && !aiLoading && e.key === 'Enter') {
        e.preventDefault();
        onNextWord();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const tierLabel = tier === 'leech' ? 'Leech — rewrite it' : tier === 'mature' ? 'Mature' : tier === 'learning' ? 'Learning' : 'New word';
  const tierColor = tier === 'leech' ? '#f87171' : tier === 'mature' ? '#00FFC8' : tier === 'learning' ? '#38bdf8' : '#a1a1aa';

  return (
    <>
      <motion.div
        key={`gen-${currentIndex}`}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="mt-4 flex gap-5"
        style={CARD_STYLE}
      >
      <div
        className="rv-surface relative rounded-[2rem] overflow-hidden flex flex-col flex-1 min-w-0"
        style={{ border: '1px solid rgba(15,23,20,0.08)' }}
      >
        {/* ── Hero: tier · topic, the word, its meaning — kept compact ── */}
        <div className="relative shrink-0 px-7 pt-5 pb-4" style={{ background: HERO.background }}>
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: tierColor }}>{tierLabel}</span>
            <span
              title={`${topic.title} · ${topic.prompt}`}
              className="min-w-0 truncate rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-50/80"
            >
              ◎ {topic.title}
            </span>
            <button
              onClick={onToggleRoast}
              aria-pressed={roastMode}
              title={roastMode ? 'Roast mode on — brutal feedback' : 'Roast mode off — tap for brutal feedback'}
              className="ml-auto shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
              style={{
                background: roastMode ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)',
                color: roastMode ? '#f87171' : 'rgba(209,250,229,0.55)',
                boxShadow: roastMode ? '0 0 18px rgba(239,68,68,0.35)' : 'none',
              }}
            >
              <Flame className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-baseline gap-2.5 mt-1.5">
            <motion.h2
              initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="font-bold leading-none"
              style={{
                fontSize: 'clamp(1.8rem, 4vw, 2.4rem)',
                fontFamily: FONT_DISPLAY,
                letterSpacing: '-0.03em',
                background: 'linear-gradient(120deg, #fde68a 0%, #fbbf24 45%, #f59e0b 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              {word}
            </motion.h2>
            {pos && (
              <span className="text-xs italic font-semibold" style={{ color: pos.source === 'oxford' ? '#c4b5fd' : 'rgba(209,250,229,0.5)' }}>
                {pos.abbr}
              </span>
            )}
          </div>
          <p className="text-[13px] text-emerald-100/60 mt-1.5 leading-snug line-clamp-1" title={currentItem.word.definition}>
            {currentItem.word.definition}
          </p>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {!generationSaved ? (
            /* ══ Compose ═══════════════════════════════════════════ */
            <motion.div
              key="compose"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="relative flex-1 min-h-0 flex flex-col px-7 pt-4 pb-6"
            >

              {showRemix && priorSentence && (
                <button
                  onClick={() => onGenerationTextChange(priorSentence)}
                  className="group shrink-0 mb-3 flex items-center gap-2 text-left text-[12.5px] text-zinc-500 hover:text-zinc-800 transition-colors"
                  title="Load your previous sentence to rework it"
                >
                  <History className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate italic">Last time: “{priorSentence}”</span>
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-emerald-600 opacity-70 group-hover:opacity-100">Remix</span>
                </button>
              )}

              {/* Editor: transparent textarea over a mirror that highlights the word */}
              <div className="relative flex-1 min-h-[6rem]" style={{ fontFamily: FONT_DISPLAY }}>
                <div
                  ref={mirrorRef}
                  aria-hidden
                  className={`absolute inset-0 overflow-hidden whitespace-pre-wrap break-words text-transparent pointer-events-none ${EDITOR_TEXT}`}
                >
                  {generationText.split(/([A-Za-z]+)/).map((p, i) =>
                    i % 2 === 1 && isTargetToken(p, word)
                      ? <mark key={i} className="text-transparent rounded-md" style={{ background: '#fef3c7', boxShadow: '0 0 0 2px #fde68a' }}>{p}</mark>
                      : <span key={i}>{p}</span>
                  )}
                  {'\n'}
                </div>
                <textarea
                  ref={textareaRef}
                  autoFocus
                  value={generationText}
                  onChange={e => onGenerationTextChange(e.target.value)}
                  onKeyDown={onEditorKeyDown}
                  onScroll={e => { if (mirrorRef.current) mirrorRef.current.scrollTop = e.currentTarget.scrollTop; }}
                  placeholder={placeholder}
                  spellCheck
                  className={`absolute inset-0 w-full h-full resize-none bg-transparent outline-none text-zinc-900 placeholder:text-zinc-400 caret-amber-600 ${EDITOR_TEXT}`}
                />
              </div>

              {/* Meter + hint */}
              <div className="shrink-0 mt-4">
                <div className="flex gap-1.5">
                  {checks.map(c => (
                    <div key={c.label} className="flex-1" title={`${c.label}${c.ok ? ' ✓' : ''}`}>
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: '#e4e4e7' }}>
                        <motion.div
                          className="h-full rounded-full"
                          initial={false}
                          animate={{ width: c.ok ? '100%' : '0%' }}
                          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                          style={{ background: 'linear-gradient(90deg, #f59e0b, #059669)' }}
                        />
                      </div>
                      <p className="text-[9px] uppercase tracking-[0.15em] font-bold mt-1.5" style={{ color: c.ok ? '#52525b' : '#d4d4d8' }}>
                        {c.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom bar */}
              <div className="shrink-0 flex items-center gap-3 mt-4">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={hintKey}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18 }}
                    className="flex-1 min-w-0 text-[13px] text-zinc-500 truncate"
                  >
                    {hint}
                  </motion.p>
                </AnimatePresence>

                <button
                  onClick={() => (window.matchMedia('(min-width: 1024px)').matches ? openPalette() : setSheetOpen(true))}
                  title="Search collocations, connectors & phrases (/ or Ctrl+K)"
                  className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 transition-colors"
                  style={{ background: '#fff', border: '1px solid rgba(15,23,20,0.1)' }}
                >
                  <Command className="h-4 w-4" />
                </button>

                {tier === 'mature' && (
                  <button
                    onClick={onSave}
                    disabled={!canSubmit}
                    title="Audit with AI"
                    className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 transition-colors disabled:opacity-30"
                    style={{ background: '#fff', border: '1px solid rgba(15,23,20,0.1)' }}
                  >
                    <Sparkles className="h-4 w-4" />
                  </button>
                )}

                <motion.button
                  onClick={submit}
                  disabled={!canSubmit}
                  whileTap={canSubmit ? { scale: 0.9 } : undefined}
                  title={tier === 'mature' ? 'Save (Enter)' : 'Send for review (Enter)'}
                  className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all"
                  style={{
                    background: canSubmit ? HERO_GREEN : '#e4e4e7',
                    color: canSubmit ? '#fff' : '#a1a1aa',
                    boxShadow: canSubmit ? '0 8px 24px rgba(10,50,41,0.3)' : 'none',
                  }}
                >
                  {isSaving || aiLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowUp className="h-5 w-5" strokeWidth={2.5} />}
                </motion.button>
              </div>
            </motion.div>
          ) : (
            /* ══ Review ════════════════════════════════════════════ */
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex-1 min-h-0 flex flex-col px-7 pt-4 pb-5"
            >
              <div ref={reviewBoxRef} className="flex-1 min-h-0 overflow-hidden">
                {aiLoading ? (
                  <div className="space-y-3 pt-2">
                    <p className="text-[13px] text-zinc-500 flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: LAB_INK }} />
                      {roastMode ? 'Sharpening the knives…' : 'Reading your sentence…'}
                    </p>
                    {[92, 78, 64].map((w, i) => (
                      <motion.div
                        key={i}
                        className="h-3 rounded-full"
                        style={{ width: `${w}%`, background: '#e4e4e7' }}
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                ) : (
                  <div ref={reviewContentRef} className="space-y-3" style={{ zoom: reviewZoom }}>
                    {aiFeedback && verdict && (
                      <div className="flex items-center gap-3">
                        <motion.span
                          initial={{ opacity: 0, scale: 0.6 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ type: 'spring', stiffness: 260, damping: 16 }}
                          className="font-black leading-none tabular-nums"
                          style={{ fontSize: '2.6rem', fontFamily: FONT_DISPLAY, color: verdict.color, letterSpacing: '-0.04em' }}
                        >
                          {aiFeedback.score}
                          <span className="ml-0.5 text-sm font-bold text-zinc-400 tracking-normal">/10</span>
                        </motion.span>
                        <p className="text-lg font-bold leading-tight" style={{ color: verdict.color, fontFamily: FONT_DISPLAY }}>{verdict.label}</p>
                        {trophyMinted && (
                          <motion.span
                            initial={{ opacity: 0, rotate: -20, scale: 0.5 }}
                            animate={{ opacity: 1, rotate: 0, scale: 1 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 12, delay: 0.3 }}
                            className="ml-auto flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full"
                            style={{ color: '#b45309', background: '#fef3c7', border: '1px solid #fcd34d' }}
                            title="Saved to your trophy wall"
                          >
                            <Trophy className="h-3.5 w-3.5" /> Greatest Hit
                          </motion.span>
                        )}
                      </div>
                    )}

                    {/* Yours vs stronger */}
                    <div className={`grid gap-2 ${aiFeedback?.better_example ? 'sm:grid-cols-2' : ''}`}>
                      <div className="rounded-xl px-3.5 py-2.5 bg-white" style={{ border: '1.5px solid #e4e4e7' }}>
                        <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-zinc-500 mb-0.5">Yours</p>
                        <p className="text-[15px] font-medium leading-snug text-zinc-900">
                          {highlightTarget(generationText, word)}
                        </p>
                      </div>
                      {aiFeedback?.better_example && (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.25 }}
                          className="rounded-xl px-3.5 py-2.5"
                          style={{ background: '#fff6e0', border: '1.5px solid #fbdc8f' }}
                        >
                          <p className="flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] font-bold mb-0.5" style={{ color: LAB_INK }}>
                            <Sparkles className="h-3 w-3" strokeWidth={2.6} /> Stronger
                          </p>
                          <p className="text-[15px] font-medium leading-snug text-zinc-900">
                            {highlightTarget(aiFeedback.better_example, word)}
                          </p>
                        </motion.div>
                      )}
                    </div>

                    {aiFeedback && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        // Side by side on wider screens: shorter than a stack
                        className="flex flex-col sm:flex-row gap-2"
                      >
                        <Note tone="works">{aiFeedback.what_worked}</Note>
                        {aiFeedback.mistake && <Note tone="issue">{aiFeedback.mistake}</Note>}
                        {aiFeedback.fix && <Note tone="fix">{aiFeedback.fix}</Note>}
                      </motion.div>
                    )}

                    {aiError && (
                      <div className="text-[13px] space-y-1">
                        <p className="text-zinc-600">AI feedback unavailable — your sentence is still saved when you continue.</p>
                        <p className="text-xs text-red-600/80 font-mono break-words">{aiError}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {!aiLoading && (
                <div className="shrink-0 flex items-center gap-3 mt-3">
                  <button
                    onClick={onRetry}
                    className="h-11 px-5 rounded-full flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-zinc-900 transition-colors"
                    style={{ background: '#fff', border: '1px solid rgba(15,23,20,0.1)' }}
                  >
                    <RotateCcw className="h-4 w-4" /> Rewrite
                  </button>
                  <motion.button
                    onClick={onNextWord}
                    whileTap={{ scale: 0.97 }}
                    className="ml-auto h-11 pl-6 pr-5 rounded-full flex items-center gap-2 text-sm font-bold"
                    style={{ background: HERO_GREEN, color: '#fff' }}
                  >
                    {currentIndex + 1 >= totalWords ? 'View summary' : 'Next word'}
                    <ArrowRight className="h-4 w-4" />
                    <Kbd dark>↵</Kbd>
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

        {/* ══ Writer's toolkit (desktop sidebar) ════════════════════════ */}
        <aside
          className="rv-surface hidden lg:flex w-[50%] shrink-0 flex-col px-6 pt-5 pb-6 min-h-0 rounded-[2rem] overflow-hidden"
          style={{ border: '1px solid rgba(15,23,20,0.08)' }}
        >
          <div className="flex-1 min-h-0">
            <Toolkit collocations={collocations} word={word} onInsert={insertAtCursor} showBadge />
          </div>
        </aside>
      </motion.div>

      {/* Toolkit sheet (mobile) */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
              onClick={() => setSheetOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-[2rem] p-5 flex flex-col"
              style={{
                height: '72vh',
                background: '#f4f6f4',
                borderTop: '1px solid rgba(251,191,36,0.3)',
              }}
            >
              <div className="shrink-0 flex items-center justify-between mb-3">
                <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] font-bold text-zinc-500">
                  <Wand2 className="h-3.5 w-3.5" style={{ color: LAB_INK }} /> Writer's toolkit
                </p>
                <button
                  onClick={() => setSheetOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-600"
                  style={{ background: '#e4e4e7' }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 min-h-0">
                <Toolkit collocations={collocations} word={word} onInsert={insertAtCursor} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <CommandPalette
        open={paletteOpen}
        items={paletteItems}
        onClose={() => { setPaletteOpen(false); requestAnimationFrame(() => textareaRef.current?.focus()); }}
        onPick={insert}
      />
    </>
  );
}

function Kbd({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <kbd
      className="hidden sm:inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-md text-[10px] font-semibold align-middle mx-0.5"
      style={{ background: dark ? 'rgba(255,255,255,0.15)' : '#f4f4f5', color: dark ? 'inherit' : '#71717a' }}
    >
      {children}
    </kbd>
  );
}

const NOTE_TONES = {
  works: { label: 'Works', color: '#059669', soft: '#e9fbf5', edge: '#a7ecd6', Icon: Check },
  issue: { label: 'Issue', color: '#dc2626', soft: '#fef0f0', edge: '#fbc8c8', Icon: X },
  fix: { label: 'Fix', color: '#ea580c', soft: '#fff3ea', edge: '#fcd0ae', Icon: Wrench },
} as const;

/** One feedback point as a tinted card with a solid icon badge. */
function Note({ tone, children }: { tone: keyof typeof NOTE_TONES; children: React.ReactNode }) {
  const { label, color, soft, edge, Icon } = NOTE_TONES[tone];
  return (
    <div className="flex-1 min-w-0 rounded-xl px-3 py-2.5" style={{ background: soft, border: `1.5px solid ${edge}` }}>
      <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] font-bold mb-1" style={{ color }}>
        <span className="w-4 h-4 rounded-full flex items-center justify-center text-white" style={{ background: color }}>
          <Icon className="h-2.5 w-2.5" strokeWidth={3.2} />
        </span>
        {label}
      </p>
      <p className="text-[13px] leading-snug text-zinc-800">{children}</p>
    </div>
  );
}
