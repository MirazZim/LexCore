import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, RotateCcw, X } from 'lucide-react';
import type { DueWordItem, AiFeedback } from './types';

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
  onNextWord: () => void;
  onRetry: () => void;
}

export const CONNECTORS = [
  {
    id: 'cause',
    label: 'Cause & Effect',
    color: '#f97316',
    description: 'Use when one thing causes another',
    tip: 'Avoid "because of that" — it is a direct Bengali translation. Use "as a result" or "consequently" instead.',
    items: [
      { connector: 'As a result,',        example: 'Traffic increased. As a result, air quality worsened.' },
      { connector: 'Consequently,',       example: 'Roads were neglected. Consequently, accidents rose.' },
      { connector: 'Therefore,',          example: 'Funding was cut. Therefore, services declined.' },
      { connector: 'This means that',     example: 'Buses are unreliable. This means that workers arrive late.' },
      { connector: '…, which leads to',   example: 'Poor roads cause accidents, which leads to economic loss.' },
    ],
  },
  {
    id: 'contrast',
    label: 'Contrast',
    color: '#8b5cf6',
    description: 'Use when two ideas disagree or surprise',
    tip: 'Never start a sentence with "But" in IELTS writing. Replace it with "However," every time.',
    items: [
      { connector: 'However,',            example: 'Roads are important. However, public transport saves more lives.' },
      { connector: 'On the other hand,',  example: 'Cities need metro systems. On the other hand, rural areas need roads.' },
      { connector: 'While',               example: 'While transport is affordable, roads are still unsafe.' },
      { connector: 'Despite this,',       example: 'Funding was low. Despite this, the system improved.' },
      { connector: 'Nevertheless,',       example: 'Critics disagreed. Nevertheless, the policy was passed.' },
    ],
  },
  {
    id: 'adding',
    label: 'Adding Ideas',
    color: '#00FFC8',
    description: 'Use when building on the previous idea',
    tip: '"Also" alone is weak in academic writing. Upgrade it to "furthermore" or "moreover" for Band 6+.',
    items: [
      { connector: 'Furthermore,',        example: 'Roads reduce accidents. Furthermore, they connect rural communities.' },
      { connector: 'Moreover,',           example: 'Transport is cheap. Moreover, it reduces carbon emissions.' },
      { connector: 'In addition,',        example: 'The system is fast. In addition, it is reliable.' },
      { connector: 'Not only… but also',  example: 'It not only saves time but also reduces pollution.' },
    ],
  },
  {
    id: 'examples',
    label: 'Examples',
    color: '#60a5fa',
    description: 'Use to introduce real evidence',
    tip: 'After your example, always add one sentence explaining WHY it proves your point. Never let examples stand alone.',
    items: [
      { connector: 'For instance,',              example: 'Many cities lack transport. For instance, rural Bangladesh has no bus routes.' },
      { connector: 'For example,',               example: 'Poor roads cause harm. For example, villages in Sylhet report weekly accidents.' },
      { connector: 'This is evident in',         example: 'This is evident in Japan, where metro usage reduced road deaths by 40%.' },
      { connector: 'A clear example of this is', example: "A clear example of this is Singapore's investment in rail infrastructure." },
    ],
  },
  {
    id: 'concluding',
    label: 'Concluding',
    color: '#f43f5e',
    description: 'Use in your conclusion only',
    tip: 'Never introduce a new idea in the conclusion. Restate your position in different words and end with an insight.',
    items: [
      { connector: 'In conclusion,',   example: 'In conclusion, road infrastructure must precede transport investment.' },
      { connector: 'To summarise,',    example: 'To summarise, both systems are needed, but roads come first.' },
      { connector: 'Ultimately,',      example: 'Ultimately, no transport system functions without stable roads.' },
      { connector: 'It is clear that', example: 'It is clear that governments must prioritise infrastructure.' },
    ],
  },
  {
    id: 'concession',
    label: 'Concession',
    color: '#a78bfa',
    description: 'Admit the opposing view before countering it',
    tip: 'Don\'t just concede and leave it there — always follow with "however" or "yet" to bring the argument back to your side.',
    items: [
      { connector: 'Admittedly,',     example: 'Admittedly, cars are convenient. However, their environmental cost is too high to ignore.' },
      { connector: 'It is true that', example: 'It is true that technology creates jobs. However, it also displaces traditional workers.' },
      { connector: 'Although',        example: 'Although public transport is slow, it remains the most sustainable option.' },
      { connector: 'Even though',     example: 'Even though the cost is high, investment in infrastructure is essential.' },
      { connector: 'Granted,',        example: 'Granted, the policy has flaws. Yet it represents the first step toward meaningful change.' },
    ],
  },
  {
    id: 'condition',
    label: 'Condition',
    color: '#fbbf24',
    description: 'Use for if/unless scenarios',
    tip: 'In academic writing, prefer "provided that" and "as long as" over the casual "if" for more formal impact.',
    items: [
      { connector: 'If',                   example: 'If governments invest in roads, rural economies will improve significantly.' },
      { connector: 'Unless',               example: 'Unless emissions are reduced, climate targets will remain unmet.' },
      { connector: 'Provided that',        example: 'Provided that funding is secured, the project will be completed on time.' },
      { connector: 'As long as',           example: 'As long as safety standards are maintained, the benefits outweigh the risks.' },
      { connector: 'On the condition that',example: 'The agreement will hold on the condition that both parties comply.' },
    ],
  },
  {
    id: 'purpose',
    label: 'Purpose',
    color: '#34d399',
    description: 'Use to explain the goal behind an action',
    tip: '"In order to" is more formal than bare "to" — use it in body paragraphs for added academic weight.',
    items: [
      { connector: 'In order to',     example: 'In order to reduce congestion, cities must expand public transport.' },
      { connector: 'So that',         example: 'Governments invest in education so that future generations can compete globally.' },
      { connector: 'With the aim of', example: 'The policy was introduced with the aim of cutting carbon emissions by 2030.' },
      { connector: 'To ensure that',  example: 'Strict regulations exist to ensure that public safety is never compromised.' },
    ],
  },
  {
    id: 'comparison',
    label: 'Comparison',
    color: '#f472b6',
    description: 'Use to show two things are similar',
    tip: 'Never use "same as" in formal writing. Replace it with "similarly" or "likewise" for a higher band score.',
    items: [
      { connector: 'Similarly,',      example: 'Japan invested in rail early. Similarly, Singapore built a world-class metro system.' },
      { connector: 'Likewise,',       example: 'Roads reduce accidents. Likewise, street lighting improves pedestrian safety.' },
      { connector: 'In the same way,',example: 'Exercise improves mental health. In the same way, green spaces reduce urban stress.' },
      { connector: 'Just as',         example: 'Just as physical health requires exercise, economic health requires investment.' },
      { connector: 'Compared to',     example: 'Compared to road transport, rail travel emits far less carbon per journey.' },
    ],
  },
  {
    id: 'sequence',
    label: 'Sequence/Time',
    color: '#38bdf8',
    description: 'Use to order events or steps in an argument',
    tip: 'Avoid relying only on "firstly, secondly, thirdly" — vary with "initially", "subsequently", and "finally" for a richer sequence.',
    items: [
      { connector: 'Firstly,',       example: 'Firstly, the government must assess existing infrastructure before spending begins.' },
      { connector: 'Subsequently,',  example: 'Roads were built. Subsequently, trade between regions increased dramatically.' },
      { connector: 'Meanwhile,',     example: 'Construction continued in the north. Meanwhile, southern areas faced neglect.' },
      { connector: 'Eventually,',    example: 'Funding was delayed for years. Eventually, the project was abandoned altogether.' },
      { connector: 'Finally,',       example: 'Finally, once the network is complete, maintenance must be prioritised.' },
    ],
  },
  {
    id: 'emphasis',
    label: 'Emphasis',
    color: '#fb923c',
    description: 'Use to stress the importance of a point',
    tip: 'Use emphasis connectors only once per paragraph — overuse drains them of their power.',
    items: [
      { connector: 'Above all,',            example: 'Above all, governments must ensure that basic services reach rural communities.' },
      { connector: 'In particular,',        example: 'The report highlights one concern in particular: the lack of rural road access.' },
      { connector: 'Notably,',              example: 'Notably, countries with strong infrastructure tend to report higher GDP growth.' },
      { connector: 'It is worth noting that',example: 'It is worth noting that investment in roads also benefits healthcare delivery.' },
      { connector: 'Crucially,',            example: 'Crucially, no economic plan will succeed without addressing transport links first.' },
    ],
  },
  {
    id: 'clarification',
    label: 'Clarification',
    color: '#4ade80',
    description: 'Use to explain or restate what you mean',
    tip: 'Use clarification connectors when your statement is complex — they show the examiner you can self-monitor your writing.',
    items: [
      { connector: 'In other words,',       example: 'Investment declined. In other words, the roads were simply left to decay.' },
      { connector: 'That is to say,',       example: 'The system is underfunded, that is to say, it cannot serve growing demand.' },
      { connector: 'To put it another way,',example: 'The policy failed. To put it another way, it never addressed the root cause.' },
      { connector: 'More specifically,',    example: 'Poor infrastructure affects communities. More specifically, it limits access to hospitals.' },
      { connector: 'Put simply,',           example: 'Put simply, there is not enough money and too little planning.' },
    ],
  },
  {
    id: 'generalisation',
    label: 'Generalisation',
    color: '#c084fc',
    description: 'Use to make broad or universal claims',
    tip: 'Always soften generalisations with "tend to", "often", or "in many cases" — absolute claims are easy to disprove.',
    items: [
      { connector: 'In general,',       example: 'In general, wealthier nations invest more heavily in public infrastructure.' },
      { connector: 'On the whole,',     example: 'On the whole, countries with better roads report higher levels of economic growth.' },
      { connector: 'As a rule,',        example: 'As a rule, urban areas receive more transport funding than rural ones.' },
      { connector: 'In most cases,',    example: 'In most cases, road improvements lead to lower accident rates within two years.' },
      { connector: 'Broadly speaking,', example: 'Broadly speaking, infrastructure investment yields long-term economic dividends.' },
    ],
  },
  {
    id: 'opinion',
    label: 'Opinion/Stance',
    color: '#facc15',
    description: 'Use to express your personal position',
    tip: 'Weak starters like "I think" score lower — use "It is argued that" or "I would contend that" for formal IELTS impact.',
    items: [
      { connector: 'It is argued that',       example: 'It is argued that public transport is more beneficial than private vehicle use.' },
      { connector: 'In my view,',             example: 'In my view, governments should prioritise rail over road construction.' },
      { connector: 'It is widely believed that',example: 'It is widely believed that education is the key driver of economic growth.' },
      { connector: 'From my perspective,',    example: 'From my perspective, short-term costs should not deter long-term infrastructure planning.' },
      { connector: 'I would contend that',    example: 'I would contend that without proper funding, no transport reform will succeed.' },
    ],
  },
  {
    id: 'unexpected',
    label: 'Unexpected Result',
    color: '#e879f9',
    description: 'Use when the outcome is surprising or contrary to expectation',
    tip: '"Surprisingly" alone is not enough — always explain why the result was unexpected to demonstrate critical thinking.',
    items: [
      { connector: 'Surprisingly,',            example: 'Roads were built in the region. Surprisingly, air pollution actually decreased.' },
      { connector: 'Unexpectedly,',            example: 'The budget was cut. Unexpectedly, efficiency improved as a result.' },
      { connector: 'Against all expectations,',example: 'Against all expectations, ridership increased during the economic downturn.' },
      { connector: 'It is remarkable that',    example: 'It is remarkable that a city of this size manages with so few private vehicles.' },
      { connector: 'Paradoxically,',           example: 'Paradoxically, building more roads often leads to greater traffic congestion over time.' },
    ],
  },
] as const;

export type ConnectorCategory = typeof CONNECTORS[number];

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

export function ConnectorContent({ data }: { data: ConnectorCategory }) {
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
  natural:   { bg: 'rgba(0,255,200,0.1)',   border: 'rgba(0,255,200,0.3)',   color: '#00FFC8', label: '✓ Natural' },
  close:     { bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.3)',  color: '#f97316', label: '⚡ Almost there' },
  unnatural: { bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)',   color: '#ef4444', label: '✗ Try again' },
} as const;

export function GenerationPhase({
  currentItem, currentIndex, totalWords, generationText, generationSaved,
  aiFeedback, aiLoading, aiError, isSaving,
  activeConnector, onConnectorChange,
  onGenerationTextChange, onSave, onNextWord, onRetry,
}: GenerationPhaseProps) {
  const verdict = aiFeedback
    ? verdictConfig[aiFeedback.verdict as keyof typeof verdictConfig] ?? verdictConfig.close
    : null;

  const activeData = CONNECTORS.find(c => c.id === activeConnector) ?? null;

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
          <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-2">
            Generation Lab
          </p>
          <h2
            className="text-3xl font-bold mb-1"
            style={{ color: '#00FFC8', fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {currentItem.word.word}
          </h2>
          <p className="text-zinc-400 text-sm mb-6">{currentItem.word.definition}</p>

          {/* Connector buttons */}
          <div className="mb-4 space-y-3">
            <p className="text-[10px] uppercase tracking-widest text-zinc-600">Connectors</p>
            <div className="flex flex-wrap gap-2">
              {CONNECTORS.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => onConnectorChange(activeConnector === cat.id ? null : cat.id)}
                  className="rounded-xl px-3 py-1.5 text-xs font-semibold transition-all active:scale-95"
                  style={{
                    background: activeConnector === cat.id ? `${cat.color}18` : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${activeConnector === cat.id ? cat.color : cat.color + '55'}`,
                    color: cat.color,
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <p className="text-white font-semibold mb-3">Write your own sentence using this word:</p>

          {!generationSaved ? (
            <div className="space-y-3">
              <textarea
                className="rv-textarea"
                placeholder="Type your sentence…"
                value={generationText}
                onChange={e => onGenerationTextChange(e.target.value)}
              />
              <button
                onClick={onSave}
                disabled={!generationText.trim() || isSaving || aiLoading}
                className="rv-btn-mint"
              >
                {isSaving || aiLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Checking…</>
                ) : 'Submit'}
              </button>
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

              {aiFeedback && verdict && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
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
                    <span
                      className="text-2xl font-bold"
                      style={{ color: verdict.color, fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {aiFeedback.score}<span className="text-base text-zinc-500">/10</span>
                    </span>
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
