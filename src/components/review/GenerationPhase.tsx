import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, RotateCcw, Sparkles, Trophy, X, Zap } from 'lucide-react';
import type { DueWordItem, AiFeedback } from './types';
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
  aiError: boolean;
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

function highlightConnector(example: string, connector: string) {
  const clean = connector.replace('…, ', '').replace('… ', '');
  const idx = example.toLowerCase().indexOf(clean.toLowerCase());
  if (idx === -1) return <>{example}</>;
  return (
    <>
      {example.slice(0, idx)}
      <span className="font-bold text-white">{example.slice(idx, idx + clean.length)}</span>
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
  natural: { bg: 'rgba(0,255,200,0.1)', border: 'rgba(0,255,200,0.3)', color: '#00FFC8', label: '✓ Natural' },
  close: { bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)', color: '#f97316', label: '⚡ Almost there' },
  unnatural: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', color: '#ef4444', label: '✗ Try again' },
} as const;

export function GenerationPhase({
  currentItem, currentIndex, totalWords, generationText, generationSaved,
  aiFeedback, aiLoading, aiError, isSaving,
  activeConnector, onConnectorChange,
  onGenerationTextChange, onSave, onSaveQuick, onNextWord, onRetry,
  tier, topic, priorSentence, roastMode, onToggleRoast,
}: GenerationPhaseProps) {
  const verdict = aiFeedback
    ? verdictConfig[aiFeedback.verdict as keyof typeof verdictConfig] ?? verdictConfig.close
    : null;

  // Local UI state: which tab is active in the chip strip.
  // Independent from `activeConnector` (which is the open sheet's id, global to both lists).
  const [activeTab, setActiveTab] = useState<'connectors' | 'phrases'>('connectors');

  // Active list driving the chip strip below the toggle.
  const currentList: readonly ChipCategory[] =
    activeTab === 'connectors' ? CONNECTORS : POWER_PHRASES;

  // Bottom-sheet lookup: search BOTH arrays so the sheet stays correct
  // even if the user toggles tabs while a sheet is open.
  const activeData: ChipCategory | null =
    CONNECTORS.find(c => c.id === activeConnector) ??
    POWER_PHRASES.find(c => c.id === activeConnector) ??
    null;

  // Mint a trophy on a 10/10 score. Fires once per saved sentence.
  const mintedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!aiFeedback || aiFeedback.score < 9) return;
    const key = `${currentItem.word.id}::${generationText.trim()}`;
    if (mintedRef.current === key) return;
    mintedRef.current = key;
    mintTrophy({
      word: currentItem.word.word,
      wordId: currentItem.word.id,
      sentence: generationText.trim(),
      topic: topic.title,
    });
  }, [aiFeedback, currentItem.word.id, currentItem.word.word, generationText, topic.title]);

  // Reset mint guard between words so the next word can mint
  useEffect(() => { mintedRef.current = null; }, [currentItem.word.id]);

  // Tier-driven copy
  const promptText = (() => {
    switch (tier) {
      case 'new': return 'Write your own sentence using this word:';
      case 'learning': return 'Write a short phrase or sentence using this word:';
      case 'mature': return 'Quick check — write a sentence. AI scoring is optional at this level.';
      case 'leech': return "You've slipped on this word before. Rewrite your old sentence — better this time.";
    }
  })();

  const placeholder = tier === 'learning'
    ? 'A few words is enough…'
    : tier === 'leech'
      ? 'Rewrite it sharper…'
      : 'Type your sentence…';

  const showRemix = (tier === 'learning' || tier === 'mature' || tier === 'leech') && !!priorSentence;
  const trophyMinted = !!aiFeedback && aiFeedback.score >= 9;

  return (
    <>
      {/* Main card */}
      <motion.div
        key={`gen-${currentIndex}`}
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -60 }}
        transition={{ duration: 0.3 }}
      >
        <div className="rv-glass rounded-[2rem] p-8 mt-4">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span
              className="text-[9px] uppercase tracking-[0.25em] font-bold px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(251,191,36,0.07)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.18)' }}
            >
              ✍ Generation Lab
            </span>
            {tier !== 'new' && (
              <span
                className="text-[9px] uppercase tracking-[0.2em] font-bold px-2.5 py-1 rounded-full"
                style={
                  tier === 'leech'
                    ? { background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.22)' }
                    : tier === 'mature'
                      ? { background: 'rgba(0,255,200,0.07)', color: '#00FFC8', border: '1px solid rgba(0,255,200,0.18)' }
                      : { background: 'rgba(56,189,248,0.07)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.18)' }
                }
              >
                {tier === 'leech' ? '⚠ Leech' : tier === 'mature' ? '◆ Mature' : '◇ Learning'}
              </span>
            )}
            <button
              onClick={onToggleRoast}
              className="text-[9px] uppercase tracking-[0.2em] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1 transition-all active:scale-95"
              style={
                roastMode
                  ? { background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.35)' }
                  : { background: 'rgba(255,255,255,0.04)', color: '#71717a', border: '1px solid rgba(255,255,255,0.10)' }
              }
              aria-pressed={roastMode}
              title={roastMode ? 'Roast Mode: ON — tap to soften' : 'Roast Mode: OFF — tap for brutal feedback'}
            >
              <Zap className="h-3 w-3" /> Roast {roastMode ? 'on' : 'off'}
            </button>
          </div>

          {/* Topic of the day banner */}
          <div
            className="mb-5 rounded-xl px-4 py-2.5 flex items-center gap-2.5"
            style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.18)' }}
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0" style={{ color: '#38bdf8' }} />
            <p className="text-[11px] text-zinc-400 leading-snug">
              <span className="text-[10px] uppercase tracking-widest font-bold mr-1.5" style={{ color: '#38bdf8' }}>Today's topic</span>
              <span className="text-zinc-200 font-semibold">{topic.title}</span>
              <span className="text-zinc-500"> · weave today's words around {topic.prompt}.</span>
            </p>
          </div>
          <div className="flex items-baseline gap-3 mb-2">
            <motion.h2
              initial={{ opacity: 0, scale: 0.82, filter: 'blur(8px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={{ type: 'spring', stiffness: 180, damping: 18, delay: 0.06 }}
              className="font-bold leading-none select-none"
              style={{
                fontSize: 'clamp(2.2rem, 7vw, 3.2rem)',
                color: '#fbbf24',
                fontFamily: "'Space Grotesk', sans-serif",
                textShadow: '0 0 32px rgba(251,191,36,0.22)',
                letterSpacing: '-0.01em',
              }}
            >
              {currentItem.word.word}
            </motion.h2>
            {(() => {
              const pos = getWordPos(currentItem.word.word);
              if (!pos) return null;
              return (
                <span
                  className="text-xs font-semibold italic shrink-0"
                  style={{ color: pos.source === 'oxford' ? '#a78bfa' : '#71717a' }}
                  title={pos.source === 'inferred' ? `inferred from word form` : `Oxford 3000`}
                >
                  {pos.abbr}
                </span>
              );
            })()}
          </div>
          <p className="text-zinc-400 text-sm mb-6">{currentItem.word.definition}</p>

          {/* Toggle pill + chip strip */}
          <div className="mb-4 space-y-3">
            {/* Toggle pill — swaps which list of chips shows below */}
            <div className="flex gap-1.5">
              <button
                onClick={() => setActiveTab('connectors')}
                className="text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-full transition-all active:scale-95"
                style={
                  activeTab === 'connectors'
                    ? { background: 'rgba(0,255,200,0.12)', color: '#00FFC8', border: '1px solid rgba(0,255,200,0.32)' }
                    : { background: 'rgba(255,255,255,0.04)', color: '#71717a', border: '1px solid rgba(255,255,255,0.08)' }
                }
                aria-pressed={activeTab === 'connectors'}
              >
                Connectors
              </button>
              <button
                onClick={() => setActiveTab('phrases')}
                className="text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-full transition-all active:scale-95"
                style={
                  activeTab === 'phrases'
                    ? { background: 'rgba(0,255,200,0.12)', color: '#00FFC8', border: '1px solid rgba(0,255,200,0.32)' }
                    : { background: 'rgba(255,255,255,0.04)', color: '#71717a', border: '1px solid rgba(255,255,255,0.08)' }
                }
                aria-pressed={activeTab === 'phrases'}
              >
                Power Phrases
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {currentList.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => onConnectorChange(activeConnector === cat.id ? null : cat.id)}
                  className="rounded-xl px-3 py-1.5 flex flex-col items-start gap-1 transition-all active:scale-95"
                  style={{
                    background: activeConnector === cat.id ? `${cat.color}18` : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${activeConnector === cat.id ? cat.color : cat.color + '55'}`,
                  }}
                >
                  <span className="text-xs font-semibold leading-none" style={{ color: cat.color }}>
                    {cat.label}
                  </span>
                  <span className="text-[10px] font-medium leading-none opacity-60" style={{ color: cat.color }}>
                    {cat.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <p className="text-white font-semibold mb-3">{promptText}</p>

          {/* Remix scaffold: surface the user's previous sentence so they can rewrite it better */}
          {!generationSaved && showRemix && priorSentence && (
            <div
              className="mb-3 rounded-xl p-3.5"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                  {tier === 'leech' ? 'Your old try' : 'Your previous sentence'}
                </span>
                <button
                  onClick={() => onGenerationTextChange(priorSentence)}
                  className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full transition-all active:scale-95"
                  style={{ background: 'rgba(0,255,200,0.08)', color: '#00FFC8', border: '1px solid rgba(0,255,200,0.22)' }}
                >
                  Remix
                </button>
              </div>
              <p className="text-sm text-zinc-300 italic">"{priorSentence}"</p>
            </div>
          )}

          {!generationSaved ? (
            <div className="space-y-3">
              <textarea
                className="rv-textarea"
                placeholder={placeholder}
                value={generationText}
                onChange={e => onGenerationTextChange(e.target.value)}
              />
              {tier === 'mature' ? (
                <div className="flex gap-3">
                  <button
                    onClick={onSave}
                    disabled={!generationText.trim() || isSaving || aiLoading}
                    className="flex items-center justify-center gap-2 flex-1 rounded-2xl py-3 text-sm font-bold transition-all active:scale-95"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#a1a1aa' }}
                  >
                    {aiLoading ? <><Loader2 className="h-4 w-4 animate-spin" />Auditing…</> : 'Audit with AI'}
                  </button>
                  <button
                    onClick={onSaveQuick}
                    disabled={!generationText.trim() || isSaving}
                    className="rv-btn-mint flex-1"
                  >
                    Save · skip AI
                  </button>
                </div>
              ) : (
                <button
                  onClick={onSave}
                  disabled={!generationText.trim() || isSaving || aiLoading}
                  className="rv-btn-mint"
                >
                  {isSaving || aiLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Checking…</>
                  ) : 'Submit'}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div
                className="rounded-xl p-4"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <p className="text-zinc-200 text-sm">"{generationText}"</p>
                <p className="text-[10px] text-zinc-600 mt-1">— My sentence</p>
              </div>

              {aiLoading && (
                <div className="flex items-center gap-2 text-zinc-500 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#00FFC8' }} />
                  Checking your sentence…
                </div>
              )}

              {trophyMinted && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 16 }}
                  className="rounded-xl px-4 py-3 flex items-center gap-3"
                  style={{
                    background: 'linear-gradient(135deg, rgba(240,201,106,0.10) 0%, rgba(200,146,42,0.06) 100%)',
                    border: '1px solid rgba(240,201,106,0.45)',
                    boxShadow: '0 0 28px rgba(240,201,106,0.18)',
                  }}
                >
                  <Trophy className="h-5 w-5 shrink-0" style={{ color: '#f0c96a' }} />
                  <div className="leading-tight">
                    <p className="text-sm font-bold" style={{ color: '#f0c96a', fontFamily: "'Space Grotesk', sans-serif" }}>
                      Greatest Hits — minted.
                    </p>
                    <p className="text-[11px] text-zinc-400">{aiFeedback.score}/10 — saved to your trophy wall.</p>
                  </div>
                </motion.div>
              )}

              {aiFeedback && verdict && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                  className="rounded-xl p-5 space-y-3"
                  style={{ background: verdict.bg, border: `1px solid ${verdict.border}` }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="rounded-full px-3 py-1 text-xs font-bold"
                      style={{ background: 'rgba(0,0,0,0.3)', color: verdict.color }}
                    >
                      {verdict.label}
                    </span>
                    <motion.span
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.1 }}
                      className="text-3xl font-bold"
                      style={{ color: verdict.color, fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {aiFeedback.score}<span className="text-base text-zinc-500">/10</span>
                    </motion.span>
                  </div>
                  <p className="text-sm text-zinc-300">
                    <span className="font-semibold" style={{ color: '#00FFC8' }}>What worked: </span>
                    {aiFeedback.what_worked}
                  </p>
                  {aiFeedback.fix && (
                    <p className="text-sm text-zinc-300">
                      <span className="font-semibold" style={{ color: '#f97316' }}>Fix: </span>
                      {aiFeedback.fix}
                    </p>
                  )}
                  {aiFeedback.better_example && (
                    <blockquote
                      className="text-sm text-zinc-400 italic pl-3"
                      style={{ borderLeft: '2px solid rgba(255,255,255,0.15)' }}
                    >
                      {aiFeedback.better_example}
                    </blockquote>
                  )}
                </motion.div>
              )}

              {aiError && (
                <p className="text-sm text-zinc-500">AI feedback unavailable — your sentence was saved.</p>
              )}

              {!aiLoading && (
                <div className="flex gap-3">
                  <button
                    onClick={onRetry}
                    className="flex items-center justify-center gap-2 flex-1 rounded-2xl py-3 text-sm font-bold transition-all active:scale-95"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#a1a1aa',
                    }}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Try Again
                  </button>
                  <button onClick={onNextWord} className="rv-btn-mint flex-1">
                    {currentIndex + 1 >= totalWords ? 'View Summary' : 'Next Word'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Bottom sheet — same on both mobile and desktop */}
      <AnimatePresence>
        {activeData && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
              onClick={() => onConnectorChange(null)}
            />
            <motion.div
              key={activeData.id}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-[2rem] p-6 space-y-4 max-h-[78vh] overflow-y-auto"
              style={{
                background: 'rgba(18,18,22,0.88)',
                backdropFilter: 'blur(28px)',
                WebkitBackdropFilter: 'blur(28px)',
                borderTop: `1px solid ${activeData.color}40`,
                borderLeft: '1px solid rgba(255,255,255,0.07)',
                borderRight: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <div className="flex justify-center -mt-1 mb-1">
                <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
              </div>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xl font-bold" style={{ color: activeData.color, fontFamily: "'Space Grotesk', sans-serif" }}>
                    {activeData.label}
                  </p>
                  <p className="text-xs text-zinc-500 italic mt-0.5">{activeData.description}</p>
                </div>
                <button
                  onClick={() => onConnectorChange(null)}
                  className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 ml-4 transition-all active:scale-90"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: '#a1a1aa' }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ConnectorContent data={activeData} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}