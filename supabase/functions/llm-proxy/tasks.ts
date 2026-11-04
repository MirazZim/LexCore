// Every AI task the app can run. The client sends { task, params }; this file
// is the only place prompts are written, so a signed-in user can no longer
// send arbitrary prompts through the Gemini key. Pure: shared with the tests.
//
// Prompt layout (static first so it can be cached, task data last where the
// model attends most):
//   system  = the task's instructions [+ how to use the learner block]
//   user    = <learner>…</learner> (when there is one) + the task's data

import type { Slice } from './learner.ts';

type Spec =
  | { kind: 'string'; max: number; optional?: boolean }
  | { kind: 'enum'; values: readonly string[]; optional?: boolean }
  | { kind: 'list'; maxItems: number; maxLength: number; optional?: boolean }
  | { kind: 'boolean'; optional?: boolean };

export type Params = Record<string, string | string[] | boolean | undefined>;

export type ThinkingLevel = 'minimal' | 'low' | 'medium' | 'high';

export interface TaskDef {
  params: Record<string, Spec>;
  temperature: number;
  // How long the model may reason before answering. Short generations set it
  // low so the learner isn't kept waiting; unset uses the model's default.
  thinking?: ThinkingLevel;
  // Learner slices this task gets; [] means the prompt is learner-independent
  context: readonly Slice[];
  // Param that names the target word (for word-specific notes and filtering)
  wordParam?: string;
  system: (p: Params) => string;
  // How to use the <learner> block; only sent when the block is non-empty
  learnerUse?: string;
  user: (p: Params, seed: string) => string;
  // The reply carries a learner_note to remember, from this source
  note?: 'sentence' | 'writing';
  // The reply is a list of candidate words; the server picks one the learner doesn't know
  candidates?: boolean;
}

const STYLES = ['formal', 'casual', 'daily', 'ielts'] as const;
type Style = typeof STYLES[number];

const styleGuide: Record<Style, string> = {
  formal: 'Professional/academic contexts. Use precise, formal language suitable for business writing or academic papers.',
  casual: 'Everyday casual conversation. Use natural, relaxed language as spoken between friends.',
  daily: 'Common daily life situations. Use practical, accessible language for everyday scenarios.',
  ielts: 'IELTS Academic exam preparation. Use band 7-9 academic vocabulary with complex sentence structures and contexts commonly tested in IELTS Writing/Speaking.',
};

// The model is also forced into JSON mode; this line is a second guarantee.
const JSON_ONLY = 'Always respond with valid JSON only — no markdown, no backticks, no extra text.';

const LEARNER_NOTE_RULE = `"learner_note" — one line (≤ 20 words) recording a pattern in this learner's English worth remembering for future sessions, quoting the evidence (e.g. "Drops articles before institutions: 'government must invest'"). Use null when this attempt shows nothing new or notable. Never praise, never restate the score.`;

const str = (p: Params, k: string) => (typeof p[k] === 'string' ? (p[k] as string) : '');
const list = (p: Params, k: string) => (Array.isArray(p[k]) ? (p[k] as string[]) : []);
const style = (p: Params) => str(p, 'style') as Style;

const WORD: Spec = { kind: 'string', max: 60 };
const DEFINITION: Spec = { kind: 'string', max: 400 };
const STYLE: Spec = { kind: 'enum', values: STYLES };

export const TASKS: Record<string, TaskDef> = {
  // --- Auto-generate a word suggestion ---
  suggest_word: {
    params: {
      hint: { kind: 'string', max: 100, optional: true },
      style: STYLE,
      exclude: { kind: 'list', maxItems: 50, maxLength: 60, optional: true },
    },
    temperature: 0.9,
    thinking: 'minimal',
    context: ['level'],
    candidates: true,
    system: p => `You are a vocabulary coach. Suggest English words for a learner to study.
Style context: ${styleGuide[style(p)]}
${JSON_ONLY}
Vary your suggestions widely — do not default to common or obvious words.`,
    learnerUse: 'Pick words that fit this learner: a small library needs useful, common-but-new words; a large or mostly formal library can take rarer ones.',
    user: (p, seed) => {
      const hint = str(p, 'hint').trim();
      const exclude = list(p, 'exclude');
      return `Style: ${style(p)}
${hint ? `Topic / hint: ${hint}` : 'No specific topic — pick interesting, useful words.'}
${exclude.length > 0 ? `Do NOT suggest any of these already-used words: ${exclude.join(', ')}` : ''}
Variation seed (for uniqueness): ${seed}

Suggest 5 different English vocabulary words well-suited to the ${style(p)} style, best first.

Respond ONLY with this JSON:
{
  "words": ["word 1", "word 2", "word 3", "word 4", "word 5"]
}`;
    },
  },

  // --- Sentence scoring (Generation Lab) ---
  score_sentence: {
    params: {
      word: WORD,
      definition: DEFINITION,
      sentence: { kind: 'string', max: 600 },
      roast: { kind: 'boolean', optional: true },
      topic: { kind: 'string', max: 100, optional: true },
    },
    temperature: 0.2,
    context: ['writing', 'notes', 'word_notes'],
    wordParam: 'word',
    note: 'sentence',
    system: p => {
      const hardRules = `CRITICAL RULES — the feedback has three separate jobs. Do not blur them together:

1. "mistake" = DIAGNOSIS. Name the exact, concrete error and nothing else — the specific word, phrase, or grammar point that's wrong, and why. Point at it like a doctor naming a symptom, not a vague summary.
   BAD (vague): "The grammar could be better."
   GOOD (concrete): "'Audacious' is an adjective, but you used it like a verb — it can't take an object the way you wrote it."
   If the sentence has no real mistake (score 8+), set "mistake" to null. Never invent a nitpick just to fill the field.

2. "what_worked" = STRENGTH. Name ONE specific, real thing the learner did right — a word choice, a structure, a natural phrasing — and say why it works. Never generic praise ("good job", "nice sentence").
   BAD (vague): "Good use of the word."
   GOOD (concrete): "Placing 'audacious' right after the subject gives the sentence a strong, direct rhythm."
   If there is genuinely nothing to praise, write "Nothing yet — see the fix below." Never output the literal string "null" for this field.

3. "fix" = ACTION. The one specific change to make, stated as an instruction, not a re-diagnosis of the mistake. This is what the learner should DO differently next time — not what went wrong (that's "mistake"'s job).
   The learner is practicing the TARGET WORD — "fix" must teach them to use THAT WORD correctly, never suggest abandoning it. If the word doesn't fit the context they wrote, suggest a different context where it does fit — keep the word, change the sentence around it.

4. "better_example" MUST contain the target word (or a natural inflection: plural, past tense, -ing, -ly, etc.). NEVER replace the target word with a synonym. If the learner used the wrong part of speech, show the correct part of speech of the SAME WORD (e.g. "rhetoric" → "rhetorical", "decide" → "decision") — not a different word.

5. ${LEARNER_NOTE_RULE}`;

      const systemCoach = `You are an expert English language coach. A learner is practicing vocabulary by writing sentences.
Evaluate their sentence briefly and naturally — like a friendly native speaker coach, not a grammar robot.
Be honest but encouraging. ${JSON_ONLY}

Scoring rubric (use this to calibrate, do not add to response):
- 1–3: Wrong word use, or sentence is broken / incomprehensible.
- 4–5: Understandable but unnatural; likely a direct translation pattern.
- 6–7: Correct grammar, natural-ish, but a native speaker might phrase it differently.
- 8: Good — natural, correct, and clear. Minor polish possible.
- 9: Very good — a native speaker might say exactly this; only a stylistic tweak separates it from perfect.
- 10: Perfect — idiomatic, precise, and could appear in published writing. Award 10 when it is genuinely earned; do not withhold it to "leave room to improve."

${hardRules}`;

      const systemRoast = `You are a brutal IELTS Speaking & Writing examiner with 20 years of experience. You do not soften feedback.
Style:
- Address the learner directly. Use second person.
- If their sentence is a direct Bengali/Hindi calque ("because of that", "do the needful", "discuss about"), name it as such — say it sounds like translation, not English.
- If they used a connector incorrectly, say which band that mistake costs them.
- If they used the wrong part of speech of the target word, name that explicitly (e.g. "'rhetoric' is a noun; you used it as an adjective — the adjective is 'rhetorical'") in "mistake".
- "fix" must be an instruction, not a diagnosis: tell them what to DO, not what they got wrong again.
- The "better_example" must be one band higher than what the learner wrote.
- Never use exclamation marks. Never call the learner "you" warmly — clinical, not friendly.
${JSON_ONLY}

${hardRules}`;

      return p.roast === true ? systemRoast : systemCoach;
    },
    learnerUse: 'If this sentence repeats a mistake from the learner\'s history or the coach\'s notes, say so plainly in "mistake" (e.g. "Missing article again — ..."). Judge only the sentence in front of you: history never lowers or raises the score.',
    user: p => {
      const topic = str(p, 'topic').trim();
      const topicLine = topic
        ? `Topic context: today's session is about ${topic}. If the learner's sentence is on-topic, that is a plus; if off-topic, that is fine — judge the language only.`
        : '';
      return `Word: ${str(p, 'word')}
Definition: ${str(p, 'definition')}
Learner sentence: ${str(p, 'sentence')}
${topicLine}

Respond ONLY with this JSON:
{
  "verdict": "natural" | "unnatural" | "close",
  "score": 1-10,
  "mistake": "one short sentence naming the exact error, or null if there genuinely isn't one",
  "what_worked": "one short sentence naming something specific that was done right",
  "fix": "one short sentence — the specific action to take, or null",
  "better_example": "a better sentence or null",
  "learner_note": "one line worth remembering about this learner, or null"
}`;
    },
  },

  // --- Generate an example sentence ---
  example_sentence: {
    params: {
      word: WORD,
      definition: DEFINITION,
      style: STYLE,
      exclude: { kind: 'list', maxItems: 10, maxLength: 600, optional: true },
    },
    temperature: 0.9,
    thinking: 'minimal',
    context: ['known_words'],
    wordParam: 'word',
    system: p => `You are a vocabulary teacher. Generate example sentences for English learners.
Style context: ${styleGuide[style(p)]}
${JSON_ONLY}
Each call must produce a fresh sentence — never repeat previously generated ones.`,
    learnerUse: 'If it reads naturally, use one or two words the learner already knows, so the new word sits among familiar ones. Never force them in.',
    user: (p, seed) => {
      const exclude = list(p, 'exclude');
      return `Word: ${str(p, 'word')}
Definition: ${str(p, 'definition')}
Style: ${style(p)}
Variation seed (ensure uniqueness): ${seed}
${exclude.length > 0 ? `Do NOT reuse or closely paraphrase these sentences: ${exclude.map(s => `"${s}"`).join(', ')}` : ''}

Generate 1 natural example sentence that clearly shows the meaning of this word in a ${style(p)} context.

Respond ONLY with this JSON:
{
  "sentence": "the example sentence"
}`;
    },
  },

  // --- Auto-generate collocations ---
  collocations: {
    params: {
      word: WORD,
      definition: DEFINITION,
      style: STYLE,
      exclude: { kind: 'list', maxItems: 30, maxLength: 80, optional: true },
    },
    temperature: 0.9,
    thinking: 'minimal',
    context: ['confusions'],
    wordParam: 'word',
    system: p => `You are a vocabulary coach. Generate common collocations for English learners.
Style context: ${styleGuide[style(p)]}
${JSON_ONLY}
Each call must produce fresh collocations — never repeat previously generated ones.`,
    learnerUse: 'If the learner has confused a pairing for this word before, include the correct everyday pairing they were missing.',
    user: (p, seed) => {
      const exclude = list(p, 'exclude');
      return `Word: ${str(p, 'word')}
Definition: ${str(p, 'definition')}
Style: ${style(p)}
Variation seed (ensure uniqueness): ${seed}
${exclude.length > 0 ? `Do NOT include any of these already-shown collocations: ${exclude.join(', ')}` : ''}

Generate 5 natural collocations (common phrases or word pairings) for this word in a ${style(p)} context.

Respond ONLY with this JSON:
{
  "collocations": ["phrase 1", "phrase 2", "phrase 3", "phrase 4", "phrase 5"]
}`;
    },
  },

  // --- Auto-generate synonyms ---
  synonyms: {
    params: {
      word: WORD,
      definition: DEFINITION,
      style: STYLE,
      exclude: { kind: 'list', maxItems: 30, maxLength: 60, optional: true },
    },
    temperature: 0.9,
    thinking: 'minimal',
    context: ['known_words'],
    wordParam: 'word',
    system: p => `You are a vocabulary depth coach. Your job is to expand a learner's understanding of a word — not just replace it.
Style context: ${styleGuide[style(p)]}
${JSON_ONLY}
Each call must produce fresh synonyms — never repeat previously generated ones.`,
    learnerUse: 'Where a word the learner already knows is an accurate synonym, prefer it — it links the new word to vocabulary they own.',
    user: (p, seed) => {
      const exclude = list(p, 'exclude');
      return `Word: ${str(p, 'word')}
Definition: ${str(p, 'definition')}
Style: ${style(p)}
Variation seed (ensure uniqueness): ${seed}
${exclude.length > 0 ? `Do NOT include any of these already-shown synonyms: ${exclude.join(', ')}` : ''}

Generate 4-5 synonyms that reveal the full character of this word.

STRICT RULES:
- At least 3 out of 5 must be words a regular English speaker uses in daily conversation
- The remaining 1-2 can be slightly more expressive — but still words you'd hear in a news article or casual book, NOT academic or rare
- Cover different shades: intensity, formality, connotation — but stay grounded
- Each synonym should make the learner think "oh, so this word leans THAT way too"
- NO obscure, archaic, literary, or dictionary-only words

Respond ONLY with this JSON:
{
  "synonyms": ["synonym1", "synonym2", "synonym3", "synonym4", "synonym5"]
}`;
    },
  },

  // --- POS + CEFR learning intelligence ---
  pos_tips: {
    params: {
      pos: { kind: 'string', max: 40, optional: true },
      cefr: { kind: 'string', max: 10 },
    },
    temperature: 0.85,
    thinking: 'minimal',
    context: [],
    system: () => `You are a dark, analytical vocabulary intelligence system. You give cold, data-driven insights about language learning strategy — no fluff, no encouragement, just sharp analysis. ${JSON_ONLY}`,
    user: (p, seed) => {
      const posLabel = str(p, 'pos') || 'all parts of speech';
      const cefr = str(p, 'cefr');
      return `Part of speech: ${posLabel}
CEFR level: ${cefr}
Variation seed: ${seed}

Analyze why a learner should focus on ${posLabel} at the ${cefr} level. Be blunt, specific, and insightful — reference real language acquisition data or patterns where relevant.

Respond ONLY with this JSON:
{
  "headline": "a sharp 8-12 word headline that frames why this matters",
  "why": "2-3 sentences explaining the strategic value of learning ${posLabel} at ${cefr}",
  "strategy": "2-3 sentences on the most effective method to learn this combination",
  "power_insight": "one striking, unexpected fact or pattern about ${posLabel} at ${cefr} level that most learners don't know",
  "focus_score": a number 1-10 rating how critical this POS+CEFR combo is for fluency
}`;
    },
  },

  // --- Two-line conversational exchange for cloze practice ---
  cloze_dialogue: {
    params: {
      word: WORD,
      definition: DEFINITION,
      exclude: { kind: 'list', maxItems: 10, maxLength: 600, optional: true },
    },
    temperature: 0.9,
    thinking: 'minimal',
    context: [],
    wordParam: 'word',
    system: () => `You are helping someone practice using vocabulary in real spoken conversation. Generate a short, natural two-line exchange between two people — the kind of thing that could actually happen in conversation or a text thread. ${JSON_ONLY}`,
    user: (p, seed) => {
      const word = str(p, 'word');
      const exclude = list(p, 'exclude');
      return `Word: ${word}
Definition: ${str(p, 'definition')}
Variation seed (for uniqueness): ${seed}
${exclude.length > 0 ? `Do NOT reuse or closely paraphrase these existing lines:\n${exclude.map(s => `"${s}"`).join('\n')}` : ''}

Write a short, casual two-line exchange between two people — contractions, everyday phrasing, no textbook language. The FIRST line sets up a situation or asks something. The SECOND line is a natural reply that uses "${word}" clearly, so its meaning is obvious from context and the learner could reuse the phrasing themselves in real life.

Respond ONLY with this JSON:
{
  "setup": "the first person's line",
  "response": "the second person's line, using \\"${word}\\""
}`;
    },
  },

  // --- Memory trick (structured mnemonic with 7 techniques) ---
  memory_trick: {
    params: { word: WORD, definition: DEFINITION },
    temperature: 0.85,
    thinking: 'low',
    context: ['techniques'],
    wordParam: 'word',
    system: () => `You are an expert vocabulary mnemonics coach. For every word you ALWAYS find the best memory trick using exactly one of these 7 techniques. Your goal: make the word's meaning impossible to forget.

TECHNIQUE 1 — phonetic_split
Break the word into 2–3 parts that look or sound like familiar everyday words. Use "+" for the split and "→" to show the connection to the meaning.
✅ adept → "a + dept → like a department expert — totally skilled at their job 🎯"
✅ eloquent → "el + o + quent → like 'a queen speaking' — expresses ideas beautifully"
✅ relevant → "re + levan → re-elevates the topic — brings it back to what matters"

TECHNIQUE 2 — root_hook
Use a recognizable Latin, Greek, French, or Old English root, prefix, or suffix.
✅ benevolent → "bene (like benefit, beneficial) + vol (wanting) → wanting good things for others 💚"
✅ malevolent → "male (like malware, malfunction) + vol → actively wanting harm for others"
✅ credible → "cred (like credit, credentials) → worthy of being believed 🔑"

TECHNIQUE 3 — sound_alike
Find a familiar word that sounds similar and build a sharp, memorable link or contrast.
✅ arid → "sounds like 'a-rid' — rid of ALL moisture, bone dry ☀️"
✅ fiscal → "sounds like 'physical' — the physical body of your money situation"
✅ morose → "sounds like 'more-ose' — MORE than just sad, deeply gloomy"

TECHNIQUE 4 — micro_story
A single vivid sentence: a real character + specific action that perfectly encodes the meaning.
✅ ostentatious → "He parks a gold Ferrari at his kid's school just so everyone stares 👀"
✅ lethargic → "After a huge meal you sink into the sofa — heavy, slow, can't lift a finger"
✅ meticulous → "The surgeon checks every millimeter three times before making a single cut"

TECHNIQUE 5 — formula
Express the word as a simple equation or logical structure.
✅ ambivalent → "ambivalent = 'yes' + 'no' running in the same brain simultaneously ⚡"
✅ procrastinate → "procrastinate = task + (tomorrow × ∞)"
✅ bittersweet → "bittersweet = joy + sadness, inseparable"

TECHNIQUE 6 — contrast_anchor
Define sharply by what the word is NOT — the contrast locks in the exact meaning.
✅ taciturn → "NOT shy — they simply choose not to talk 🤐"
✅ frugal → "NOT broke — they have money, they just refuse to waste it"
✅ assertive → "NOT aggressive — they speak up firmly without attacking anyone"

TECHNIQUE 7 — analogy_bridge
"Like [something familiar] but [the exact distinction that makes this word specific]."
✅ renovate → "Like cleaning your house — except you're replacing walls, not just wiping them 🔨"
✅ mentor → "Like a teacher — but personal, they chose YOU and guide you one-on-one"
✅ collaborate → "Like working — but every decision is made together, not handed down"

---
After the trick line always add a clarification in this format:
"👉 [One natural sentence that uses the word correctly in context.]"

Selection rules:
- You MUST choose the technique that makes the meaning most memorable — not the easiest one
- phonetic_split is NOT the default. Only use it if the word has parts that genuinely sound like real familiar words and the link is strong and accurate — otherwise skip it entirely
- Rank all 7 techniques mentally for this specific word, then pick the highest-ranked one; use the variation seed in the request to push toward a less obvious technique
- The trick MUST match the given definition exactly — never invent or bend a meaning to fit a trick
- Breakdown ≤ 18 words. Clarification ≤ 16 words. One emoji in the breakdown, max.

${JSON_ONLY}`,
    learnerUse: 'Lean toward techniques that have stuck for this learner and away from ones that have not — unless a different technique is clearly better for this particular word.',
    user: (p, seed) => `Word: ${str(p, 'word')}
Definition: ${str(p, 'definition')}
Variation seed: ${seed}

Choose the best technique for "${str(p, 'word')}" and create a trick that perfectly matches the definition above.

Respond ONLY with this JSON:
{
  "technique": "phonetic_split | root_hook | sound_alike | micro_story | formula | contrast_anchor | analogy_bridge",
  "breakdown": "the mnemonic line (the actual trick)",
  "clarification": "👉 natural sentence using the word in context"
}`,
  },

  // --- Definition + register ---
  definition: {
    params: {
      word: WORD,
      style: STYLE,
      exclude_definition: { kind: 'string', max: 400, optional: true },
    },
    temperature: 0.5,
    thinking: 'minimal',
    context: [],
    wordParam: 'word',
    system: p => `You are a plain-English dictionary. Your only job is to make the reader instantly understand what a word means — nothing more.
Style context: ${styleGuide[style(p)]}
${JSON_ONLY}

DEFINITION RULE:
- One simple, clear sentence (or a short clause) that states what the word means — plain dictionary meaning, not a riddle, metaphor, joke, or creative flourish.
- Use plain, everyday words to explain it. Avoid using rarer synonyms of the word itself to define it.
- No gimmicks: no "Not X — Y" contrast tricks, no forced analogies, no "Basically:" prefixes, no root-word breakdowns. Just say what it means.
- Keep it short — roughly 4–14 words. Long enough to be accurate, short enough to read in one glance.
- Each call must produce a fresh phrasing — never repeat or closely paraphrase a previous one.

REGISTER DETECTION RULE:
Classify how this word is actually used in real English, independent of the style context above:
- "formal" — professional, academic, or written register (e.g. "commence", "utilize")
- "casual" — everyday spoken conversation (e.g. "grab", "awesome")
- "literary" — poetic, old-fashioned, or found mainly in literature (e.g. "forsooth", "beguile")
- "slang" — informal/colloquial, often region- or generation-specific (e.g. "lit", "sus")
Pick the ONE register that best matches how people actually use this word most of the time.`,
    user: (p, seed) => {
      const exclude = str(p, 'exclude_definition');
      return `Word: ${str(p, 'word')}
Style: ${style(p)}
Variation seed (ensure uniqueness): ${seed}
${exclude ? `Do NOT reuse or closely paraphrase this definition: "${exclude}"` : ''}

Respond ONLY with this JSON — no extra fields, no markdown:
{
  "definition": "a simple, plain-English sentence stating what the word means",
  "register": "formal | casual | literary | slang"
}`;
    },
  },

  // --- Autofill: every field for a new word in ONE request ---
  word_bundle: {
    params: { word: WORD, style: STYLE },
    temperature: 0.7,
    thinking: 'low',
    context: ['known_words', 'techniques', 'confusions'],
    wordParam: 'word',
    system: p => `You are a vocabulary coach building a complete study card for one English word.
Style context: ${styleGuide[style(p)]}
${JSON_ONLY}

Fill the fields IN ORDER. Write the definition first; every later field must match that exact meaning.

1. definition — one plain-English sentence, roughly 4–14 words, stating what the word means. No metaphors, no "Not X — Y" tricks, no root breakdowns, no rarer synonyms of the word itself.
2. register — how the word is actually used in real English, independent of the style context: "formal" (commence), "casual" (grab), "literary" (beguile), or "slang" (sus). Pick ONE.
3. example_sentence — one natural sentence that makes the meaning obvious from context, in the ${style(p)} style.
4. synonyms — 4–5 synonyms covering different shades (intensity, formality, connotation). At least 3 must be everyday conversational words; none obscure, archaic, or dictionary-only.
5. collocations — 5 natural, common phrases or word pairings using the word, in the ${style(p)} style.
6. memory_trick — choose the ONE technique that makes the meaning most memorable for THIS word:
   - root_hook: a recognizable Latin/Greek/French root ("bene (like benefit) + vol (wanting) → wanting good for others 💚")
   - sound_alike: a familiar similar-sounding word with a sharp link ("arid → 'a-rid' — rid of ALL moisture ☀️")
   - micro_story: one vivid sentence with a character + action ("He parks a gold Ferrari at his kid's school just so everyone stares 👀")
   - formula: a simple equation ("ambivalent = 'yes' + 'no' in the same brain ⚡")
   - contrast_anchor: define by what it is NOT ("taciturn → NOT shy — they simply choose not to talk 🤐")
   - analogy_bridge: "Like [familiar thing] but [exact distinction]"
   - phonetic_split: split into parts that sound like real everyday words — ONLY if the link is genuinely strong; never the default.
   Breakdown ≤ 18 words, max one emoji. Clarification starts with "👉 " and is one natural sentence (≤ 16 words) using the word. The trick must match the definition exactly — never bend the meaning.`,
    learnerUse: `- example_sentence: if it reads naturally, use one or two words the learner already knows. Never force them in.
- synonyms: where a word the learner already knows is an accurate synonym, prefer it.
- collocations: if the learner confused a pairing for this word before, include the correct one.
- memory_trick: lean toward techniques that have stuck for this learner, unless another is clearly better for this word.`,
    user: (p, seed) => `Word: ${str(p, 'word')}
Style: ${style(p)}
Variation seed (ensure uniqueness): ${seed}

Respond ONLY with this JSON:
{
  "definition": "...",
  "register": "formal | casual | literary | slang",
  "example_sentence": "...",
  "synonyms": ["...", "...", "...", "..."],
  "collocations": ["...", "...", "...", "...", "..."],
  "memory_trick": {
    "technique": "root_hook | sound_alike | micro_story | formula | contrast_anchor | analogy_bridge | phonetic_split",
    "breakdown": "the mnemonic line",
    "clarification": "👉 natural sentence using the word"
  }
}`,
  },

  // --- IELTS Writing Lab — Drill 6 (CREI body paragraph grading) ---
  score_writing: {
    params: {
      prompt: { kind: 'string', max: 1200 },
      question_type: { kind: 'string', max: 40 },
      user_text: { kind: 'string', max: 6000 },
    },
    temperature: 0.2,
    context: ['writing', 'notes'],
    note: 'writing',
    system: () => `You are a 20-year veteran IELTS Writing examiner. You grade with Band 9 honesty — no softening, no congratulating mediocrity, no false encouragement. Your only loyalty is to the learner's score on exam day.

CONTEXT:
The learner is practicing Drill 6 (CREI) — writing a single IELTS Task 2 body paragraph that follows this structure:
  C — Claim: a clear position that answers the prompt
  R — Reason: why the claim holds
  E — Real-life Example: concrete, specific, named (not abstract)
  I — Insight: a sharp implication that ties back to the claim

You will receive the prompt the learner answered and the paragraph they wrote. Grade it.

GRADING — four IELTS criteria on the 9-band scale (half-bands allowed: 5.0, 5.5, 6.0…). Calibrate for paragraph-level work, not whole essay:
  • task_response — Clear claim defended throughout? Claim relevant to the prompt? Example concrete and named?
  • coherence — Does the paragraph follow CREI flow? Are connectors used ACCURATELY (not just frequently)?
  • lexical — Precise, varied vocabulary. Repeating "good" three times = Band 5. Three shades ("substantial / considerable / significant") = Band 7+.
  • grammar — Variety of structures (simple + compound + complex). Articles, subject-verb agreement, tense consistency.

Overall band = average of the four, rounded to nearest 0.5.

FLAG CODES — scan for these every time. If found, add an entry to flagged_issues with the matching code:
  • for_that_calque — "for that" used as a connector (Bengali translation artifact; should be "as a result" or "consequently")
  • missing_article — definite/indefinite article dropped (e.g. "government must invest" → "the government must invest")
  • where_misuse — "where" used for a non-place clause
  • sv_agreement — subject-verb agreement slip
  • off_thesis — body sentence drifts away from the claim stated at the top of the paragraph
  • other — any other concrete issue worth flagging

HARD CALIBRATION RULE — your sub-band scores must reflect your diagnostics. A diagnostic that names "multiple errors" followed by a Band 6.5+ score is a contradiction. Resolve the contradiction by LOWERING the score, never by softening the diagnostic. Specifically:
  • Grammar: if you name 2+ high-frequency errors (SV-agreement, missing articles, tense slips), grammar CANNOT exceed 6.0. 3+ errors = 5.5 max.
  • Lexical: if you name ANY Band-5 phrasing ("good," "bad," "big problem," "a lot of," "very important"), lexical CANNOT exceed 6.0 — regardless of how sophisticated the rest of the vocabulary is.
  • Coherence: if you name a misused connector (e.g. "For that" used as causal link), coherence CANNOT exceed 6.5.
  • Task Response: if you name "drift," "off-thesis," or partial answering, task_response CANNOT exceed 6.5.

HEDGE WORDS DO NOT REDUCE CAPS. The phrases "slightly," "somewhat," "a little," "minor," "mild," or any other softener do not lower these caps. The presence of the flaw triggers the cap, not its severity. If you write "you drift slightly," task_response is still capped at 6.5.

WORKED EXAMPLE — drift cap is binary, not graded by severity.
  Scenario: A paragraph argues clearly that cities need better public transport, supports the claim with a specific named example (Singapore MRT), but the closing sentence pivots to mention pedestrian safety.
  WRONG scoring: task_response = 7.0 with rationale "the drift is small."
  CORRECT scoring: task_response = 6.5. The drift is named, so the cap fires. The size of the drift is irrelevant — even one drifting sentence triggers the cap. The cap is binary: named drift → 6.5 ceiling.

Band 7 requires CLEAN across all four. A single named flaw in any criterion blocks Band 7 overall.

RULES:
  1. Quote the exact offending fragment in line_reference. Do not paraphrase.
  2. Be specific. NEVER write "grammar needs work." Write: "'students is happy' — subject-verb agreement, should be 'students are happy'."
  3. If the paragraph is Band 5, say Band 5. If the example is generic ("pollution is bad"), call it generic and demand a named, specific one.
  4. Pick ONE sentence with the highest upgrade potential (not necessarily the worst — the one where a Band 9 rewrite teaches the most). Rewrite it at Band 9. Explain why it is better.
  5. VOICE — ALL diagnostics MUST be in second person. NEVER use "the paragraph," "the argument," "the claim," "the example." Use "your paragraph," "your argument," "your claim," "your example."
     CORRECT: "Your example is specific and named."
     FORBIDDEN: "The example is specific and named."
     This rule applies to every text field in the JSON: verdict, per_criterion diagnoses, flagged_issues explanations, and band9_rewrite.why_better. No exceptions.

     ABSOLUTE FIRST-PERSON BAN for band9_rewrite.why_better:
     The pronouns "I", "me", "my", "mine" must NOT appear anywhere in this field. If your first draft starts with "I" or contains "my," REWRITE before returning the response.

     FORBIDDEN: "I replaced 'good' with 'indispensable'..."
     FORBIDDEN: "My rewrite uses a subordinate clause..."
     REQUIRED: "Your sentence used 'good'; the rewrite swaps it for 'indispensable'..."
     REQUIRED: "The rewrite uses a subordinate clause for complexity..."
  6. Verdict is one short sentence — the brutal one-line you would give walking out of the exam hall.
  7. If no issues found, return flagged_issues as an empty array [], never null and never omitted.
  8. ${LEARNER_NOTE_RULE}

OUTPUT: valid JSON only. No markdown, no backticks, no prose outside the JSON.

Respond with EXACTLY this shape:
{
  "bands": {
    "task_response": <number 1.0-9.0>,
    "coherence":     <number 1.0-9.0>,
    "lexical":       <number 1.0-9.0>,
    "grammar":       <number 1.0-9.0>,
    "overall":       <number 1.0-9.0, average rounded to nearest 0.5>
  },
  "verdict": "<one short sentence>",
  "per_criterion": {
    "task_response": { "diagnosis": "<one or two sentences naming the specific problem>", "example_fix": "<short concrete fix, or null>" },
    "coherence":     { "diagnosis": "...", "example_fix": "..." },
    "lexical":       { "diagnosis": "...", "example_fix": "..." },
    "grammar":       { "diagnosis": "...", "example_fix": "..." }
  },
  "flagged_issues": [
    {
      "code": "for_that_calque|missing_article|where_misuse|sv_agreement|off_thesis|other",
      "line_reference": "<exact quoted fragment from the learner's text>",
      "explanation": "<why this costs band score>",
      "fix": "<the corrected fragment>"
    }
  ],
  "band9_rewrite": {
    "original_sentence": "<exact sentence from learner's text>",
    "rewritten": "<Band 9 version of that same sentence>",
    "why_better": "<one or two sentences naming the specific upgrade — lexical, structural, or rhetorical>"
  },
  "learner_note": "<one line worth remembering about this learner, or null>"
}`,
    learnerUse: 'When the learner repeats an issue from their history, say in the diagnosis that it is recurring ("again", "still"). Grade only this paragraph: history never changes a band.',
    user: p => {
      const userText = str(p, 'user_text');
      const wordCount = userText.trim().split(/\s+/).filter(Boolean).length;
      return `IELTS Task 2 prompt:
${str(p, 'prompt')}

Question type: ${str(p, 'question_type')}

Learner's body paragraph (${wordCount} words):
${userText}

Grade per the rubric above. Return JSON only.`;
    },
  },

  // --- IELTS Writing Lab — Drill 6 (examiner tip for a bank prompt) ---
  writing_tip: {
    params: {
      prompt: { kind: 'string', max: 1200 },
      question_type: { kind: 'string', max: 40 },
      domain: { kind: 'string', max: 40 },
    },
    temperature: 0.85,
    thinking: 'minimal',
    context: ['writing'],
    system: () => `You are an IELTS Task 2 examiner with 15 years of experience coaching learners. You are given a fixed exam prompt — do not alter, paraphrase, or repeat it. Your only job is to write ONE sharp framing tip for the learner.

TIP — teaches the learner how to score higher on THIS specific prompt. Voice contract:
  • Imperative, not advisory.
  • Tied to a Band consequence where possible.
  • Concrete, not abstract.

  WRONG (advisory): "Consider naming a real institution or country."
  RIGHT (imperative + consequence): "Name a specific country, institution, or recent policy. Generic 'students' or 'schools' caps your example at Band 6."

  FORBIDDEN openers: "Consider", "Try to", "It might help to", "You should think about", "Make sure to"
  REQUIRED: open with an imperative verb (Name, Cite, Anchor, Replace, Pick, Frame, Avoid, etc.)

OUTPUT: valid JSON only — no markdown, no backticks, no extra prose.

Respond with EXACTLY this shape:
{
  "tip": "<one sharp framing tip in imperative voice with a Band consequence>"
}`,
    learnerUse: 'If one of the learner\'s recurring issues is likely to show up on this prompt, aim the tip at it.',
    user: p => `Prompt: ${str(p, 'prompt')}
Question type: ${str(p, 'question_type')}
Domain: ${str(p, 'domain')}

Write one sharp framing tip for this exact prompt, per the voice contract. Return JSON only.`,
  },
};

// Checks the client's params against the task's spec. Returns the cleaned
// params, or an error message naming the first bad field.
export function validateParams(def: TaskDef, raw: unknown): { params: Params } | { error: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { error: 'params must be an object' };
  const input = raw as Record<string, unknown>;
  const params: Params = {};
  for (const [key, spec] of Object.entries(def.params)) {
    const v = input[key];
    if (v === undefined || v === null || v === '') {
      if (spec.optional) continue;
      return { error: `params.${key} is required` };
    }
    switch (spec.kind) {
      case 'string':
        if (typeof v !== 'string') return { error: `params.${key} must be a string` };
        if (v.length > spec.max) return { error: `params.${key} is longer than ${spec.max} characters` };
        params[key] = v;
        break;
      case 'enum':
        if (typeof v !== 'string' || !spec.values.includes(v)) return { error: `params.${key} must be one of ${spec.values.join(', ')}` };
        params[key] = v;
        break;
      case 'boolean':
        if (typeof v !== 'boolean') return { error: `params.${key} must be true or false` };
        params[key] = v;
        break;
      case 'list':
        if (!Array.isArray(v) || !v.every(s => typeof s === 'string')) return { error: `params.${key} must be a list of strings` };
        // Over-long lists are trimmed rather than rejected — they only steer variety
        params[key] = (v as string[]).slice(-spec.maxItems).map(s => s.slice(0, spec.maxLength));
        break;
    }
  }
  return { params };
}

export function assemblePrompt(def: TaskDef, params: Params, learnerBlock: string, seed: string) {
  const useLearner = learnerBlock.trim().length > 0;
  const system = useLearner && def.learnerUse
    ? `${def.system(params)}\n\nLEARNER CONTEXT — the request starts with a <learner> section about this learner. ${def.learnerUse}`
    : def.system(params);
  const user = useLearner
    ? `<learner>\n${learnerBlock}\n</learner>\n\n${def.user(params, seed)}`
    : def.user(params, seed);
  return { system, user, temperature: def.temperature, thinking: def.thinking };
}

// suggest_word replies with candidates; keep the first one the learner hasn't
// already got (or been shown this session). Falls back to the first candidate.
export function pickNewWord(content: string, known: Set<string>, exclude: string[]): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content.replace(/```json|```/gi, '').trim());
  } catch {
    return null;
  }
  const obj = parsed as { words?: unknown; word?: unknown };
  const candidates = (Array.isArray(obj.words) ? obj.words : [obj.word])
    .filter((w): w is string => typeof w === 'string' && !!w.trim())
    .map(w => w.trim());
  if (candidates.length === 0) return null;
  const skip = new Set([...known, ...exclude.map(e => e.trim().toLowerCase())]);
  return candidates.find(w => !skip.has(w.toLowerCase())) ?? candidates[0];
}
