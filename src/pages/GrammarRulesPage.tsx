import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookText, ChevronDown, ChevronUp, CheckCircle2, Send, Lightbulb } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/* ─── Types ─── */

interface TableRow {
  cells: string[];
}

interface DrillQuestion {
  sentence: string;
  answer: string;
  explanation: string;
}

interface GrammarSection {
  id: string;
  category: string;
  title: string;
  content: React.ReactNode;
  drill?: DrillQuestion[];
}

/* ─── Drill Component ─── */

function DrillExercise({ questions, title }: { questions: DrillQuestion[]; title: string }) {
  const [answers, setAnswers] = useState<string[]>(Array(questions.length).fill(''));
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => setSubmitted(true);
  const handleReset = () => {
    setAnswers(Array(questions.length).fill(''));
    setSubmitted(false);
  };

  const correctCount = submitted
    ? questions.filter((q, i) => answers[i].trim().toLowerCase() === q.answer.toLowerCase()).length
    : 0;

  return (
    <div className="mt-4 space-y-3">
      <p className="text-xs font-semibold text-green-400">📝 {title}</p>
      {questions.map((q, i) => {
        const isCorrect = submitted && answers[i].trim().toLowerCase() === q.answer.toLowerCase();
        const isWrong = submitted && !isCorrect;
        return (
          <div key={i} className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-5 shrink-0">{i + 1}.</span>
              <p className="text-sm flex-1">{q.sentence}</p>
            </div>
            <div className="ml-7">
              <Input
                value={answers[i]}
                onChange={(e) => {
                  const next = [...answers];
                  next[i] = e.target.value;
                  setAnswers(next);
                }}
                disabled={submitted}
                placeholder="Your answer..."
                className={cn(
                  'h-8 text-sm',
                  isCorrect && 'border-green-500/50 bg-green-500/10',
                  isWrong && 'border-destructive/50 bg-destructive/10'
                )}
              />
              {submitted && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-1">
                  {isCorrect ? (
                    <p className="text-xs text-green-400">✅ Correct!</p>
                  ) : (
                    <div>
                      <p className="text-xs text-destructive">❌ Answer: <span className="font-semibold">{q.answer}</span></p>
                      <p className="text-xs text-muted-foreground mt-0.5">{q.explanation}</p>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        );
      })}
      <div className="ml-7 flex gap-2">
        {!submitted ? (
          <Button size="sm" onClick={handleSubmit} disabled={answers.some(a => !a.trim())} className="text-xs">
            <Send className="h-3 w-3 mr-1" /> Submit Answers
          </Button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold">
              {correctCount}/{questions.length} correct
            </span>
            <Button size="sm" variant="secondary" onClick={handleReset} className="text-xs">
              Try Again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Simple Table ─── */

function SimpleTable({ headers, rows }: { headers: string[]; rows: TableRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-secondary">
            {headers.map((h, i) => (
              <th key={i} className="px-3 py-2 text-left font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? '' : 'bg-secondary/50'}>
              {row.cells.map((cell, j) => (
                <td key={j} className="px-3 py-2">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Example Block ─── */

function ExampleBlock({ correct, text }: { correct: boolean; text: string }) {
  return (
    <div className={cn(
      'rounded-lg p-2.5 text-xs border',
      correct ? 'bg-green-500/10 border-green-500/20' : 'bg-destructive/10 border-destructive/20'
    )}>
      <span className="mr-1">{correct ? '✅' : '❌'}</span>
      <span className={!correct ? 'line-through decoration-destructive/50' : ''}>{text}</span>
    </div>
  );
}

/* ─── Golden Rule / Tip Block — GREEN ─── */

function TipBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 flex items-start gap-2">
      <Lightbulb className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
      <p className="text-xs text-green-300">{children}</p>
    </div>
  );
}

/* ─── GRAMMAR CONTENT ─── */

const grammarSections: GrammarSection[] = [
  /* ========== SUBJECT-VERB AGREEMENT ========== */
  {
    id: 'sva-core',
    category: 'Subject-Verb Agreement',
    title: '🔑 The Core Idea — Lock & Key',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Think of it like a <strong>lock and key</strong>. The subject is the lock. The verb is the key. They must match — or the sentence doesn't open.
        </p>
        <TipBlock>
          English verbs only change in one situation: when the subject is <strong>he / she / it</strong> (or anything you can replace with he/she/it) → add <strong>-s</strong> to the verb. That's it.
        </TipBlock>
        <SimpleTable
          headers={['Subject', 'Verb Form', 'Example']}
          rows={[
            { cells: ['I', 'believe', 'I believe this is true'] },
            { cells: ['You', 'believe', 'You believe in hard work'] },
            { cells: ['He', 'believes', 'He believes in hard work'] },
            { cells: ['She', 'believes', 'She believes in hard work'] },
            { cells: ['It', 'believes', 'It makes sense'] },
            { cells: ['We', 'believe', 'We believe in education'] },
            { cells: ['They', 'believe', 'They believe in education'] },
            { cells: ['Students (plural)', 'believe', 'Students believe this'] },
            { cells: ['A student (singular)', 'believes', 'A student believes this'] },
          ]}
        />
        <TipBlock>
          <strong>Golden rule:</strong> Singular subject (one person/thing) → verb gets <strong>-s</strong>. Plural subject (more than one) → verb gets <strong>no -s</strong>.
        </TipBlock>
      </div>
    ),
  },
  {
    id: 'sva-replace-test',
    category: 'Subject-Verb Agreement',
    title: '🧪 The "Replace Test" — Never Get It Wrong',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Whenever you're unsure, <strong>replace the subject with "he" or "they"</strong> in your head.
        </p>
        <SimpleTable
          headers={['Your Sentence', 'Replace With', 'Answer']}
          rows={[
            { cells: ['"The teacher __ walk"', 'Can I say "he walk"? No → "he walks"', 'The teacher walks ✅'] },
            { cells: ['"The students __ walk"', 'Can I say "they walk"? Yes', 'The students walk ✅'] },
            { cells: ['"Everyone __ have"', 'Can I say "he have"? No → "he has"', 'Everyone has ✅'] },
          ]}
        />
        <TipBlock>Practice this in your head every time. It takes 2 seconds and eliminates the error completely.</TipBlock>
      </div>
    ),
  },
  {
    id: 'sva-tricky-1',
    category: 'Subject-Verb Agreement',
    title: '⚡ Tricky Case 1 — Words Between Subject & Verb',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          The subject and verb are often separated by extra words. Don't get fooled. When you see <strong>[singular noun] + of + [plural noun]</strong>, the subject is always the <strong>first noun</strong>.
        </p>
        <div className="space-y-1.5">
          <ExampleBlock correct text={'"The quality [of the universities] is improving."'} />
          <ExampleBlock correct text={'"The number [of students who study abroad] is increasing."'} />
          <ExampleBlock correct text={'"The prices [of food] are rising."'} />
        </div>
        <TipBlock>Cross out everything between "of the..." and find the main noun. That's your real subject.</TipBlock>
      </div>
    ),
  },
  {
    id: 'sva-tricky-2',
    category: 'Subject-Verb Agreement',
    title: '⚡ Tricky Case 2 — Words That Feel Plural But Are Singular',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          These words always take <strong>singular verbs</strong>, even though they feel like they're talking about many people:
        </p>
        <SimpleTable
          headers={['Word', 'Correct Verb', 'Example']}
          rows={[
            { cells: ['Everyone', 'has, is, believes', 'Everyone wants success'] },
            { cells: ['Nobody', 'knows, is', 'Nobody knows the answer'] },
            { cells: ['Someone', 'is, has', 'Someone is at the door'] },
            { cells: ['Each', 'has, is', 'Each student has a book'] },
            { cells: ['Either', 'works, is', 'Either option works'] },
          ]}
        />
        <TipBlock>These words refer to <strong>one at a time</strong>. "Everyone" means each single person — so it's singular.</TipBlock>
      </div>
    ),
  },
  {
    id: 'sva-tricky-3',
    category: 'Subject-Verb Agreement',
    title: '⚡ Tricky Case 3 — "There is" vs "There are"',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          With <strong>there is/are</strong>, the subject comes <strong>after</strong> the verb. Find it first, then decide.
        </p>
        <div className="space-y-1.5">
          <ExampleBlock correct text={'"There is a problem." → subject = problem (singular)'} />
          <ExampleBlock correct text={'"There are many problems." → subject = problems (plural)'} />
          <ExampleBlock correct text={'"There is a reason why students struggle."'} />
        </div>
      </div>
    ),
  },
  {
    id: 'sva-tricky-4',
    category: 'Subject-Verb Agreement',
    title: '⚡ Tricky Case 4 — Relative Clauses (who/that/which)',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          When you use <strong>who, that, which</strong> — the verb inside that clause must agree with what who/that/which <strong>refers to</strong>.
        </p>
        <div className="space-y-1.5">
          <ExampleBlock correct text={'"Students who study hard succeed." → who = students (plural) → study'} />
          <ExampleBlock correct text={'"A student who studies hard succeeds." → who = a student (singular) → studies'} />
          <ExampleBlock correct text={'"The number of students who study abroad is increasing." → who = students → study'} />
        </div>
      </div>
    ),
  },
  {
    id: 'sva-visual',
    category: 'Subject-Verb Agreement',
    title: '📊 Visual Summary & Drill',
    content: (
      <div className="space-y-3">
        <div className="rounded-lg bg-secondary p-4 font-mono text-xs leading-relaxed whitespace-pre text-center overflow-x-auto">
{`IS THE SUBJECT SINGULAR OR PLURAL?
            |
   _________|_________
  |                   |
SINGULAR            PLURAL
(he/she/it)      (they/we/you)
  |                   |
Verb + S          Verb (no S)
"he believes"    "they believe"`}
        </div>
      </div>
    ),
    drill: [
      { sentence: 'The list of problems ___ getting longer. (is/are)', answer: 'is', explanation: 'Subject is "list" (singular), not "problems".' },
      { sentence: 'Each of the students ___ submitted their work. (has/have)', answer: 'has', explanation: '"Each" is always singular → "has".' },
      { sentence: 'There ___ many reasons to study abroad. (is/are)', answer: 'are', explanation: 'Subject is "reasons" (plural) → "are".' },
      { sentence: 'Nobody ___ how hard this is. (understand/understands)', answer: 'understands', explanation: '"Nobody" is singular → "understands".' },
      { sentence: 'The teachers who work in rural areas ___ more support. (need/needs)', answer: 'need', explanation: '"who" refers to "teachers" (plural) → "need".' },
      { sentence: 'Everyone in the two groups ___ different things. (believe/believes)', answer: 'believes', explanation: '"Everyone" is always singular → "believes".' },
    ],
  },

  /* ========== ARTICLES ========== */
  {
    id: 'art-core',
    category: 'Articles',
    title: '🔑 The Core Idea — 3-Question System',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          In some languages, articles don't exist. So your brain never learned to <em>feel</em> when they're needed. The fix is building a <strong>decision system</strong>.
        </p>
        <div className="rounded-lg bg-secondary p-4 font-mono text-xs leading-relaxed whitespace-pre overflow-x-auto">
{`Q1: Is the noun countable?
     |
  NO → no article (education, knowledge)
  YES ↓

Q2: First time mentioning it?
     |
  YES → a / an
  NO  → the

Q3: a or an?
  Vowel sound → an
  Consonant sound → a`}
        </div>
        <TipBlock>Run these 3 questions for <strong>every single noun</strong> you write. Within a week, it becomes automatic.</TipBlock>
      </div>
    ),
  },
  {
    id: 'art-countable',
    category: 'Articles',
    title: '📦 Step 1 — Countable vs Uncountable',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          This is the foundation. <strong>Countable</strong>: you can put a number in front (one book, two universities). <strong>Uncountable</strong>: you cannot (one knowledge ❌).
        </p>
        <SimpleTable
          headers={['Uncountable Noun', "❌ Don't add a/an", 'Why It Feels Countable']}
          rows={[
            { cells: ['knowledge', '—', 'feels like a thing you have'] },
            { cells: ['education', '—', 'feels like a course you take'] },
            { cells: ['information', '—', 'feels like facts you collect'] },
            { cells: ['advice', '—', 'feels like suggestions you give'] },
            { cells: ['progress', '—', 'feels like steps you take'] },
            { cells: ['research', '—', 'feels like a project you do'] },
            { cells: ['evidence', '—', 'feels like items you find'] },
            { cells: ['weather', '—', 'feels like a condition'] },
            { cells: ['traffic', '—', 'feels like cars you can count'] },
            { cells: ['work', '—', 'feels like tasks you do'] },
          ]}
        />
        <TipBlock>
          <strong>The test:</strong> Can you say "one ___, two ___s"? If no → uncountable → no article.
        </TipBlock>
      </div>
    ),
  },
  {
    id: 'art-first-mention',
    category: 'Articles',
    title: '🆕 Step 2 — First Mention vs Already Known',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Once you confirm a noun is countable, decide which article based on <strong>shared knowledge</strong>.
        </p>
        <div>
          <p className="text-xs font-semibold mb-1.5">Use <strong>a / an</strong> when:</p>
          <div className="space-y-1.5">
            <ExampleBlock correct text="I saw a dog today. (any dog — first mention)" />
            <ExampleBlock correct text="She attends a university in Ireland. (we don't know which one yet)" />
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold mb-1.5">Use <strong>the</strong> when:</p>
          <div className="space-y-1.5">
            <ExampleBlock correct text="I saw a dog. The dog was barking. (now we know which dog)" />
            <ExampleBlock correct text="The sun rises in the east. (only one sun)" />
            <ExampleBlock correct text="The government should act. (the specific government being discussed)" />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'art-a-an',
    category: 'Articles',
    title: '🔤 Step 3 — "a" or "an"?',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Depends on the <strong>sound</strong> of the next word — not the letter.
        </p>
        <SimpleTable
          headers={['Word', 'Article', 'Why']}
          rows={[
            { cells: ['university', 'a university', 'sounds like "yoo" — consonant sound'] },
            { cells: ['hour', 'an hour', 'sounds like "ow" — vowel sound, silent h'] },
            { cells: ['honest', 'an honest', 'sounds like "on" — silent h'] },
            { cells: ['European', 'a European', 'sounds like "yoo" — consonant sound'] },
            { cells: ['MBA', 'an MBA', 'sounds like "em" — vowel sound'] },
          ]}
        />
        <TipBlock><strong>Golden rule:</strong> It's about the <strong>sound</strong>, not the spelling. Say the word out loud — your ear knows.</TipBlock>
      </div>
    ),
  },
  {
    id: 'art-special',
    category: 'Articles',
    title: '⚡ The 4 Special Cases',
    content: (
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold mb-1.5">Case 1 — General Statements (no article)</p>
          <div className="space-y-1.5">
            <ExampleBlock correct text="Education is important. (education as a concept)" />
            <ExampleBlock correct text="The education in Finland is excellent. (specific education system)" />
            <ExampleBlock correct text="Dogs are loyal animals. (dogs in general)" />
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold mb-1.5">Case 2 — Plural Countable Nouns in General</p>
          <div className="space-y-1.5">
            <ExampleBlock correct text="Universities should offer broader education." />
            <ExampleBlock correct text="The universities in Ireland are world-class. (specific ones)" />
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold mb-1.5">Case 3 — Jobs and Roles (always use a/an)</p>
          <div className="space-y-1.5">
            <ExampleBlock correct text="She is a doctor." />
            <ExampleBlock correct text="I am a student." />
            <ExampleBlock correct={false} text="I am student. (missing article)" />
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold mb-1.5">Case 4 — Unique Things (always use the)</p>
          <p className="text-xs text-muted-foreground">The sun, the moon, the internet, the government, the environment</p>
        </div>
      </div>
    ),
  },
  {
    id: 'art-visual',
    category: 'Articles',
    title: '📊 Visual Summary & Drill',
    content: (
      <div className="space-y-3">
        <div className="rounded-lg bg-secondary p-4 font-mono text-xs leading-relaxed whitespace-pre overflow-x-auto">
{`      NOUN
        |
  Is it countable?
   /           \\
  NO            YES
(uncountable)  (countable)
  |               |
No article    First mention
education,     or unknown?
knowledge     /          \\
             YES          NO
              |            |
           a / an         the`}
        </div>
      </div>
    ),
    drill: [
      { sentence: '___ university should provide ___ quality education to ___ students. (a/the/—)', answer: 'A, —, —', explanation: '"A university" (first mention, countable). "quality education" (uncountable, general). "students" (plural, general).' },
      { sentence: 'She gave me ___ advice that changed ___ way I think. (a/the/—)', answer: '—, the', explanation: '"advice" is uncountable → no article. "the way" → specific way.' },
      { sentence: 'He is ___ honest man who works as ___ engineer. (a/an)', answer: 'an, an', explanation: '"honest" starts with vowel sound → "an". "engineer" starts with vowel sound → "an".' },
      { sentence: '___ research shows that ___ exercise improves ___ mental health. (a/the/—)', answer: '—, —, —', explanation: 'All three are uncountable nouns used in a general sense → no articles.' },
      { sentence: 'I bought ___ book yesterday. ___ book was about ___ history of Ireland. (a/the)', answer: 'a, The, the', explanation: '"a book" (first mention). "The book" (now known). "the history" (specific).' },
      { sentence: '___ information you shared is very useful. (a/the/—)', answer: 'The', explanation: '"The information" — specific information that was shared (already known).' },
      { sentence: 'There is ___ university in Dublin that offers ___ MBA in computing. (a/an/the)', answer: 'a, an', explanation: '"a university" (first mention, "yoo" sound → a). "an MBA" ("em" sound → an).' },
      { sentence: '___ knowledge is ___ most powerful weapon in ___ world. (a/the/—)', answer: '—, the, the', explanation: '"Knowledge" (uncountable, general). "the most powerful" (superlative → the). "the world" (unique thing).' },
    ],
  },

  /* ========== VERB TENSES ========== */
  {
    id: 'tense-core',
    category: 'Verb Tenses',
    title: '🔑 The Core Idea — Timeline Thinking',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Every English sentence lives on a <strong>timeline</strong>. Before you write a verb, ask: <em>"When does this action happen?"</em> Past, present, or future — and is it finished, ongoing, or habitual?
        </p>
        <div className="rounded-lg bg-secondary p-4 font-mono text-xs leading-relaxed whitespace-pre text-center overflow-x-auto">
{`  PAST ←————————— NOW ————————→ FUTURE
   |                |                |
did / was doing   do / am doing   will do / going to
   |                |                |
finished?         habit or now?   plan or spontaneous?`}
        </div>
        <TipBlock><strong>Golden rule:</strong> Choose the tense based on <strong>when</strong> it happens and whether the action is <strong>complete, ongoing, or repeated</strong>.</TipBlock>
      </div>
    ),
  },
  {
    id: 'tense-present',
    category: 'Verb Tenses',
    title: '🔄 Present Simple vs Present Continuous',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          <strong>Present Simple</strong> = habits, facts, routines. <strong>Present Continuous</strong> = actions happening right now or temporary situations.
        </p>
        <SimpleTable
          headers={['Tense', 'Structure', 'Signal Words']}
          rows={[
            { cells: ['Present Simple', 'I work / He works', 'every day, always, usually, often, never'] },
            { cells: ['Present Continuous', 'I am working / He is working', 'right now, at the moment, currently, today'] },
          ]}
        />
        <div className="space-y-1.5">
          <ExampleBlock correct text="I drink coffee every morning. (habit → simple)" />
          <ExampleBlock correct text="I am drinking coffee right now. (happening now → continuous)" />
          <ExampleBlock correct={false} text="I am drinking coffee every morning. (habit ≠ continuous)" />
          <ExampleBlock correct={false} text="I drink coffee right now. (now ≠ simple)" />
        </div>
        <TipBlock><strong>The signal word test:</strong> See "every day/always/usually"? → Simple. See "right now/currently"? → Continuous.</TipBlock>
        <div className="mt-3">
          <p className="text-xs font-semibold mb-1.5">⚠️ Stative Verbs — Verbs That NEVER Use Continuous</p>
          <p className="text-xs text-muted-foreground mb-2">Some verbs describe states, not actions. They <strong>never</strong> take the continuous form:</p>
          <SimpleTable
            headers={['Category', 'Verbs']}
            rows={[
              { cells: ['Feelings', 'love, hate, like, prefer, want, need'] },
              { cells: ['Thinking', 'know, believe, understand, remember, forget'] },
              { cells: ['Senses', 'see, hear, smell, taste (when meaning "perceive")'] },
              { cells: ['Possession', 'have, own, belong, possess'] },
            ]}
          />
          <div className="space-y-1.5 mt-2">
            <ExampleBlock correct text="I know the answer. (not: I am knowing)" />
            <ExampleBlock correct text="She loves chocolate. (not: She is loving)" />
            <ExampleBlock correct={false} text="I am knowing the answer." />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'tense-past',
    category: 'Verb Tenses',
    title: '⏪ Past Simple vs Present Perfect',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          This is the <strong>#1 tense mistake</strong> for most learners. The difference is simple once you see it:
        </p>
        <SimpleTable
          headers={['Tense', 'When to Use', 'Signal Words']}
          rows={[
            { cells: ['Past Simple', 'Finished action at a specific time', 'yesterday, last week, in 2020, ago, when I was young'] },
            { cells: ['Present Perfect', 'Action connected to now (no specific time)', 'ever, never, already, yet, just, since, for, so far'] },
          ]}
        />
        <div className="space-y-1.5">
          <ExampleBlock correct text="I visited Paris last year. (specific time → past simple)" />
          <ExampleBlock correct text="I have visited Paris three times. (total experience up to now → perfect)" />
          <ExampleBlock correct={false} text="I have visited Paris last year. (specific time + perfect = WRONG)" />
          <ExampleBlock correct text="She has lived here since 2019. (started in past, still true now)" />
          <ExampleBlock correct text="She lived here in 2019. (finished — she doesn't live here anymore)" />
        </div>
        <TipBlock><strong>Golden rule:</strong> If you mention WHEN (yesterday, in 2020, last month), use <strong>Past Simple</strong>. If there's no specific time and the action matters NOW, use <strong>Present Perfect</strong>.</TipBlock>
        <div className="mt-3">
          <p className="text-xs font-semibold mb-1.5">The "Since vs For" Trap</p>
          <div className="space-y-1.5">
            <ExampleBlock correct text="I have lived here since 2019. (since = a point in time)" />
            <ExampleBlock correct text="I have lived here for 5 years. (for = a duration)" />
            <ExampleBlock correct={false} text="I have lived here since 5 years." />
          </div>
          <TipBlock><strong>Since</strong> = a specific point (since Monday, since 2020). <strong>For</strong> = a duration (for 3 days, for 2 years).</TipBlock>
        </div>
      </div>
    ),
  },
  {
    id: 'tense-past-cont',
    category: 'Verb Tenses',
    title: '🔀 Past Simple vs Past Continuous',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Use these two together when telling stories: one action <strong>interrupted</strong> another.
        </p>
        <SimpleTable
          headers={['Tense', 'Use', 'Structure']}
          rows={[
            { cells: ['Past Simple', 'Short, completed action', 'I walked / She called'] },
            { cells: ['Past Continuous', 'Long, ongoing background action', 'I was walking / She was calling'] },
          ]}
        />
        <div className="space-y-1.5">
          <ExampleBlock correct text="I was studying when the phone rang. (studying = background, rang = interruption)" />
          <ExampleBlock correct text="While she was cooking, the doorbell rang." />
          <ExampleBlock correct text="At 8 PM, I was watching TV. (in progress at that moment)" />
        </div>
        <TipBlock><strong>Golden rule:</strong> "While" / "when" stories → the long action gets <strong>was/were + -ing</strong>, the short interruption gets <strong>past simple</strong>.</TipBlock>
      </div>
    ),
  },
  {
    id: 'tense-future',
    category: 'Verb Tenses',
    title: '⏩ Future: "will" vs "going to"',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Both talk about the future — but they signal <strong>different levels of planning</strong>.
        </p>
        <SimpleTable
          headers={['Form', 'When to Use', 'Example']}
          rows={[
            { cells: ['will + verb', 'Spontaneous decisions, promises, predictions', "I'll help you! / It will rain tomorrow."] },
            { cells: ['going to + verb', 'Plans already decided, evidence-based predictions', "I'm going to study medicine. / Look at those clouds — it's going to rain."] },
          ]}
        />
        <div className="space-y-1.5">
          <ExampleBlock correct text="Wait, I'll open the door for you! (spontaneous — just decided)" />
          <ExampleBlock correct text="I'm going to visit Japan next summer. (already planned)" />
          <ExampleBlock correct text="She's going to have a baby! (evidence — you can see she's pregnant)" />
          <ExampleBlock correct text="Technology will change everything. (general prediction)" />
        </div>
        <TipBlock><strong>Golden rule:</strong> Just decided right now? → "<strong>will</strong>." Already planned before this moment? → "<strong>going to</strong>."</TipBlock>
      </div>
    ),
    drill: [
      { sentence: 'I ___ (visit) my grandmother every Sunday. (present simple/continuous)', answer: 'visit', explanation: '"every Sunday" = habit → present simple.' },
      { sentence: 'She ___ (study) at the library right now. (present simple/continuous)', answer: 'is studying', explanation: '"right now" = happening now → present continuous.' },
      { sentence: 'We ___ (live) in London since 2018. (past simple/present perfect)', answer: 'have lived', explanation: '"since 2018" = started in past, still true → present perfect.' },
      { sentence: 'I ___ (see) that movie yesterday. (past simple/present perfect)', answer: 'saw', explanation: '"yesterday" = specific past time → past simple.' },
      { sentence: 'He ___ (read) when the lights went out. (past simple/continuous)', answer: 'was reading', explanation: 'Reading = ongoing background action interrupted by lights going out.' },
      { sentence: 'I ___ (travel) to Spain next month — I already booked the tickets. (will/going to)', answer: "am going to travel", explanation: 'Already planned (tickets booked) → "going to".' },
    ],
  },

  /* ========== PREPOSITIONS ========== */
  {
    id: 'prep-core',
    category: 'Prepositions',
    title: '🔑 The Core Idea — Size Thinking',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          English prepositions follow a <strong>size logic</strong>: big containers → <em>in</em>, surfaces → <em>on</em>, precise points → <em>at</em>. This works for both <strong>time</strong> and <strong>place</strong>.
        </p>
        <div className="rounded-lg bg-secondary p-4 font-mono text-xs leading-relaxed whitespace-pre text-center overflow-x-auto">
{`       BIG ────────── MEDIUM ────────── SMALL
        IN              ON               AT
  months, years      days, dates     exact times
  cities, countries  streets, floors  addresses, spots`}
        </div>
        <TipBlock><strong>Golden rule:</strong> Think about <strong>size</strong>. The bigger the container, the more likely it's "<strong>in</strong>." The more precise the point, the more likely it's "<strong>at</strong>."</TipBlock>
      </div>
    ),
  },
  {
    id: 'prep-time',
    category: 'Prepositions',
    title: '🕐 In, On, At — Time',
    content: (
      <div className="space-y-3">
        <SimpleTable
          headers={['Preposition', 'Used For', 'Examples']}
          rows={[
            { cells: ['IN', 'Months, years, seasons, centuries, long periods', 'in January, in 2024, in summer, in the 21st century'] },
            { cells: ['ON', 'Days, dates, specific days', 'on Monday, on March 5th, on my birthday, on Christmas Day'] },
            { cells: ['AT', 'Exact times, mealtimes, night, weekend (British)', 'at 3 PM, at noon, at midnight, at lunchtime'] },
          ]}
        />
        <div className="space-y-1.5">
          <ExampleBlock correct text="I was born in 1995." />
          <ExampleBlock correct text="The meeting is on Friday." />
          <ExampleBlock correct text="I wake up at 7 AM." />
          <ExampleBlock correct={false} text="I was born on 1995." />
          <ExampleBlock correct={false} text="The meeting is at Friday." />
        </div>
        <TipBlock><strong>Memory trick:</strong> IN = big time box (months/years). ON = specific day (it sits ON the calendar). AT = exact point (pinpointed).</TipBlock>
        <div className="mt-3">
          <p className="text-xs font-semibold mb-1.5">⚠️ Exceptions That Fool Everyone</p>
          <SimpleTable
            headers={['Phrase', 'Preposition', 'Why']}
            rows={[
              { cells: ['at night', 'AT', 'Treated as a point in time, not a period'] },
              { cells: ['at the weekend (UK)', 'AT', 'British English treats it as a point'] },
              { cells: ['on the weekend (US)', 'ON', 'American English treats it as a day'] },
              { cells: ['in the morning/afternoon/evening', 'IN', 'These are periods of time'] },
              { cells: ['at noon / at midnight', 'AT', 'Exact points'] },
            ]}
          />
        </div>
      </div>
    ),
  },
  {
    id: 'prep-place',
    category: 'Prepositions',
    title: '📍 In, On, At — Place',
    content: (
      <div className="space-y-3">
        <SimpleTable
          headers={['Preposition', 'Used For', 'Examples']}
          rows={[
            { cells: ['IN', 'Enclosed spaces, cities, countries', 'in the room, in London, in Japan, in a car'] },
            { cells: ['ON', 'Surfaces, floors, streets, transport', 'on the table, on the 2nd floor, on Main Street, on the bus'] },
            { cells: ['AT', 'Specific points, addresses, places', 'at the door, at 42 Oak Street, at the airport, at school'] },
          ]}
        />
        <div className="space-y-1.5">
          <ExampleBlock correct text="She lives in Dublin." />
          <ExampleBlock correct text="The book is on the shelf." />
          <ExampleBlock correct text="I'll meet you at the café." />
        </div>
        <TipBlock><strong>Transport trick:</strong> Small vehicles you sit IN (in a car, in a taxi). Large transport you stand ON (on a bus, on a train, on a plane).</TipBlock>
      </div>
    ),
  },
  {
    id: 'prep-tricky',
    category: 'Prepositions',
    title: '⚡ Tricky Preposition Pairs',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">These preposition combinations cause the most errors:</p>
        <SimpleTable
          headers={['Correct', 'Incorrect', 'Rule']}
          rows={[
            { cells: ['depend on', 'depend from/of', 'Always "depend on"'] },
            { cells: ['interested in', 'interested on/for', 'Always "interested in"'] },
            { cells: ['good at', 'good in/on', 'Skills → "good at"'] },
            { cells: ['different from', 'different than/to', '"Different from" is standard'] },
            { cells: ['listen to', 'listen at/of', 'Always "listen to"'] },
            { cells: ['arrive at / arrive in', 'arrive to', 'Small place = at, big = in. Never "to"'] },
            { cells: ['married to', 'married with', 'Always "married to"'] },
            { cells: ['consist of', 'consist from', 'Always "consist of"'] },
          ]}
        />
        <TipBlock><strong>Golden rule:</strong> Preposition + verb combinations are <strong>fixed</strong> — you can't logic them out. Memorize the correct pairs.</TipBlock>
      </div>
    ),
    drill: [
      { sentence: 'The class starts ___ 9 AM ___ Monday. (at/on/in)', answer: 'at, on', explanation: 'Exact time → "at." Specific day → "on."' },
      { sentence: 'She was born ___ July ___ 1998. (at/on/in)', answer: 'in, in', explanation: 'Month → "in." Year → "in."' },
      { sentence: 'He arrived ___ the airport ___ the morning. (at/on/in)', answer: 'at, in', explanation: 'Specific point → "at." Period of day → "in."' },
      { sentence: 'They live ___ a small apartment ___ the 3rd floor. (at/on/in)', answer: 'in, on', explanation: 'Enclosed space → "in." Floor/surface → "on."' },
      { sentence: 'She is very good ___ mathematics and is interested ___ physics. (at/in/on)', answer: 'at, in', explanation: 'Skills → "good at." Topic → "interested in."' },
      { sentence: 'I depend ___ my parents for financial support. (on/of/from)', answer: 'on', explanation: '"Depend on" is the fixed combination.' },
    ],
  },

  /* ========== COMMON MISTAKES ========== */
  {
    id: 'cm-core',
    category: 'Common Mistakes',
    title: '🔑 The Core Idea — Homophones & Lookalikes',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Most "common mistakes" are words that <strong>sound the same but mean different things</strong> (homophones), or words that <strong>look similar but have different uses</strong>. The fix is simple — learn the <strong>substitution test</strong> for each pair.
        </p>
        <TipBlock><strong>Golden rule:</strong> For every confusing word pair, there's a <strong>2-second test</strong> you can run in your head. Learn the test, not the grammar jargon.</TipBlock>
      </div>
    ),
  },
  {
    id: 'cm-its',
    category: 'Common Mistakes',
    title: "🔀 Its vs It's",
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          <strong>"It's"</strong> = "it is" or "it has." <strong>"Its"</strong> = possessive (belonging to it).
        </p>
        <div className="space-y-1.5">
          <ExampleBlock correct text="It's raining outside. (it is raining)" />
          <ExampleBlock correct text="The dog wagged its tail. (the tail belongs to the dog)" />
          <ExampleBlock correct={false} text="Its raining outside." />
          <ExampleBlock correct={false} text="The dog wagged it's tail." />
        </div>
        <TipBlock><strong>The test:</strong> Replace with "it is." If the sentence still works → <strong>it's</strong>. If not → <strong>its</strong>.</TipBlock>
      </div>
    ),
  },
  {
    id: 'cm-their',
    category: 'Common Mistakes',
    title: "🔀 Their, They're, There",
    content: (
      <div className="space-y-3">
        <SimpleTable
          headers={['Word', 'Meaning', 'Test']}
          rows={[
            { cells: ["They're", '"they are"', 'Replace with "they are" — does it work?'] },
            { cells: ['Their', 'Belonging to them', 'Replace with "our" — does it work?'] },
            { cells: ['There', 'A place / existence', "If the other two don't fit → there"] },
          ]}
        />
        <div className="space-y-1.5">
          <ExampleBlock correct text="Their house is big. (belonging to them)" />
          <ExampleBlock correct text="They're coming tomorrow. (they are coming)" />
          <ExampleBlock correct text="There are two cats. (existence)" />
        </div>
        <TipBlock><strong>The test:</strong> Try "they are" first. Then try "our." If neither works → it's <strong>there</strong>.</TipBlock>
      </div>
    ),
  },
  {
    id: 'cm-your',
    category: 'Common Mistakes',
    title: "🔀 Your vs You're",
    content: (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <ExampleBlock correct text="Your book is on the table. (belonging to you)" />
          <ExampleBlock correct text="You're doing great! (you are doing great)" />
          <ExampleBlock correct={false} text="You're book is on the table." />
          <ExampleBlock correct={false} text="Your doing great!" />
        </div>
        <TipBlock><strong>The test:</strong> Replace with "you are." If the sentence still makes sense → <strong>you're</strong>. If not → <strong>your</strong>.</TipBlock>
      </div>
    ),
  },
  {
    id: 'cm-than-then',
    category: 'Common Mistakes',
    title: '🔀 Than vs Then',
    content: (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <ExampleBlock correct text="She is taller than me. (comparison)" />
          <ExampleBlock correct text="First eat, then study. (time/sequence)" />
          <ExampleBlock correct={false} text="She is taller then me." />
        </div>
        <TipBlock><strong>The test:</strong> Comparing two things? → <strong>than</strong>. Talking about time order? → <strong>then</strong>. ("thAn" = compArison, "thEn" = whEn)</TipBlock>
      </div>
    ),
  },
  {
    id: 'cm-affect-effect',
    category: 'Common Mistakes',
    title: '🔀 Affect vs Effect',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          <strong>Affect</strong> = verb (to influence). <strong>Effect</strong> = noun (the result).
        </p>
        <div className="space-y-1.5">
          <ExampleBlock correct text="The weather affects my mood. (verb — it does something)" />
          <ExampleBlock correct text="The effect of the medicine was immediate. (noun — the result)" />
          <ExampleBlock correct={false} text="The weather effects my mood." />
        </div>
        <TipBlock><strong>Memory trick:</strong> <strong>A</strong>ffect = <strong>A</strong>ction (verb). <strong>E</strong>ffect = <strong>E</strong>nd result (noun).</TipBlock>
      </div>
    ),
  },
  {
    id: 'cm-fewer-less',
    category: 'Common Mistakes',
    title: '🔀 Fewer vs Less',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          <strong>Fewer</strong> = countable things. <strong>Less</strong> = uncountable things.
        </p>
        <div className="space-y-1.5">
          <ExampleBlock correct text="Fewer people came to the party. (you can count people)" />
          <ExampleBlock correct text="I have less time than before. (you can't count time)" />
          <ExampleBlock correct={false} text="Less people came to the party." />
        </div>
        <TipBlock><strong>The test:</strong> Can you count it? → <strong>fewer</strong>. Can't count it? → <strong>less</strong>. (Same logic as articles!)</TipBlock>
      </div>
    ),
    drill: [
      { sentence: "___ going to rain tomorrow. (Its/It's)", answer: "It's", explanation: '"It is going to rain" works → it\'s.' },
      { sentence: "The cat licked ___ paws. (its/it's)", answer: 'its', explanation: 'Possessive (the paws belong to the cat) → its.' },
      { sentence: "___ planning to visit ___ house over ___. (Their/They're/There)", answer: "They're, their, there", explanation: "They are planning (they're), belonging to them (their), a place (there)." },
      { sentence: "The noise didn't ___ her concentration, but the ___ on her grades was clear. (affect/effect)", answer: 'affect, effect', explanation: 'Affect = verb (influence). Effect = noun (result).' },
      { sentence: "There are ___ cars on the road and ___ traffic today. (fewer/less)", answer: 'fewer, less', explanation: 'Cars = countable → fewer. Traffic = uncountable → less.' },
      { sentence: "She is smarter ___ her brother, and ___ she got promoted. (than/then)", answer: 'than, then', explanation: 'Comparison → than. Time sequence → then.' },
    ],
  },

  /* ========== SENTENCE STRUCTURE ========== */
  {
    id: 'ss-core',
    category: 'Sentence Structure',
    title: '🔑 The Core Idea — One Complete Thought',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Every sentence needs a <strong>subject</strong> (who/what) and a <strong>verb</strong> (does what). That's a complete thought. The most common structure errors happen when you either <strong>jam too many thoughts together</strong> or <strong>leave a thought incomplete</strong>.
        </p>
        <TipBlock><strong>Golden rule:</strong> Each sentence = one complete thought. Two complete thoughts? Either <strong>split them</strong> or <strong>join them properly</strong> with a conjunction.</TipBlock>
      </div>
    ),
  },
  {
    id: 'ss-runon',
    category: 'Sentence Structure',
    title: '🚫 Run-on Sentences & Comma Splices',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          A <strong>run-on</strong> smashes two sentences together with no punctuation. A <strong>comma splice</strong> joins them with just a comma (not enough!).
        </p>
        <div className="space-y-1.5">
          <ExampleBlock correct={false} text="I was tired I went to bed. (run-on — no punctuation)" />
          <ExampleBlock correct={false} text="I was tired, I went to bed. (comma splice — comma alone can't join)" />
        </div>
        <p className="text-xs font-semibold mt-3 mb-1.5">✅ 4 Ways to Fix It:</p>
        <div className="space-y-1.5">
          <ExampleBlock correct text="I was tired. I went to bed. (period — two sentences)" />
          <ExampleBlock correct text="I was tired, so I went to bed. (comma + conjunction)" />
          <ExampleBlock correct text="I was tired; I went to bed. (semicolon)" />
          <ExampleBlock correct text="Because I was tired, I went to bed. (subordinate clause)" />
        </div>
        <TipBlock><strong>The test:</strong> Can each part stand alone as a sentence? If yes, you need more than a comma to join them.</TipBlock>
      </div>
    ),
  },
  {
    id: 'ss-fragments',
    category: 'Sentence Structure',
    title: '🧩 Sentence Fragments',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          A fragment is an incomplete thought — it's missing a subject, a verb, or doesn't express a full idea.
        </p>
        <div className="space-y-1.5">
          <ExampleBlock correct={false} text="Because I was tired. (incomplete — what happened?)" />
          <ExampleBlock correct text="Because I was tired, I went home." />
          <ExampleBlock correct={false} text="Running through the park. (who is running?)" />
          <ExampleBlock correct text="She was running through the park." />
          <ExampleBlock correct={false} text="The book on the table. (no verb — what about it?)" />
          <ExampleBlock correct text="The book on the table is mine." />
        </div>
        <TipBlock><strong>The test:</strong> Read the sentence aloud. If it leaves you thinking "...so what?" or "...who?" — it's a fragment. Add the missing piece.</TipBlock>
      </div>
    ),
  },
  {
    id: 'ss-parallel',
    category: 'Sentence Structure',
    title: '⚖️ Parallel Structure',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          When listing actions or ideas, keep them in the <strong>same grammatical form</strong>.
        </p>
        <div className="space-y-1.5">
          <ExampleBlock correct text="I like reading, writing, and swimming. (all -ing forms)" />
          <ExampleBlock correct={false} text="I like reading, writing, and to swim. (mixed forms)" />
          <ExampleBlock correct text="She is smart, talented, and hardworking. (all adjectives)" />
          <ExampleBlock correct={false} text="She is smart, talented, and works hard. (adjective + clause = unbalanced)" />
        </div>
        <TipBlock><strong>Golden rule:</strong> In any list, every item should follow the <strong>same pattern</strong>. All -ing? All nouns? All adjectives? Pick one and stick with it.</TipBlock>
      </div>
    ),
  },
  {
    id: 'ss-double-neg',
    category: 'Sentence Structure',
    title: '🚫 Double Negatives',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          In standard English, two negatives cancel out and make a <strong>positive</strong>. Use only <strong>one negative</strong> per clause.
        </p>
        <div className="space-y-1.5">
          <ExampleBlock correct text="I don't have any money." />
          <ExampleBlock correct text="She never goes anywhere." />
          <ExampleBlock correct={false} text="I don't have no money. (= I have money — opposite meaning!)" />
          <ExampleBlock correct={false} text="She never goes nowhere." />
        </div>
        <TipBlock><strong>Golden rule:</strong> "don't" + "any" ✅. "don't" + "no" ❌. One negative word per clause is enough.</TipBlock>
      </div>
    ),
    drill: [
      { sentence: 'Fix this: "I was hungry I made a sandwich." (add proper punctuation or conjunction)', answer: 'I was hungry, so I made a sandwich.', explanation: 'Run-on sentence → add comma + conjunction, or use a period.' },
      { sentence: 'Is this a fragment? "Walking to the store yesterday." (yes/no)', answer: 'yes', explanation: 'No subject and no main verb — who was walking? What happened?' },
      { sentence: 'Fix the parallel structure: "She enjoys hiking, to swim, and reading."', answer: 'She enjoys hiking, swimming, and reading.', explanation: 'All items should be -ing forms for parallel structure.' },
      { sentence: 'Fix the double negative: "I can\'t find nothing."', answer: "I can't find anything.", explanation: '"can\'t" + "nothing" = double negative. Use "can\'t" + "anything".' },
    ],
  },

  /* ========== MODAL VERBS ========== */
  {
    id: 'mod-core',
    category: 'Modal Verbs',
    title: '🔑 The Core Idea — Shades of Meaning',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Modal verbs don't describe actions — they describe the <strong>speaker's attitude</strong>: how possible, necessary, or permitted something is. Think of them as <strong>dimmer switches</strong>, not on/off buttons.
        </p>
        <div className="rounded-lg bg-secondary p-4 font-mono text-xs leading-relaxed whitespace-pre text-center overflow-x-auto">
{`CERTAINTY SCALE:
must be ──── should be ──── might be ──── can't be
 100%          80%            50%            0%

OBLIGATION SCALE:
must do ──── should do ──── could do ──── don't have to
required     advised       optional      free choice`}
        </div>
        <TipBlock><strong>Golden rule:</strong> Modals never change form — no -s, no -ed, no -ing. "He <strong>can</strong> swim" (not "he cans"). Always followed by the <strong>base verb</strong>.</TipBlock>
      </div>
    ),
  },
  {
    id: 'mod-can-could-may',
    category: 'Modal Verbs',
    title: '💬 Can vs Could vs May',
    content: (
      <div className="space-y-3">
        <SimpleTable
          headers={['Modal', 'Use', 'Formality', 'Example']}
          rows={[
            { cells: ['Can', 'Ability / informal permission', 'Casual', 'I can swim. / Can I sit here?'] },
            { cells: ['Could', 'Past ability / polite requests / possibility', 'Polite', 'I could swim when I was 5. / Could you help me?'] },
            { cells: ['May', 'Formal permission / possibility', 'Formal', 'May I leave early? / It may rain.'] },
          ]}
        />
        <div className="space-y-1.5">
          <ExampleBlock correct text="Can you pass the salt? (casual — friends/family)" />
          <ExampleBlock correct text="Could you please send me the file? (polite — work emails)" />
          <ExampleBlock correct text="May I use the restroom? (formal — asking authority)" />
        </div>
        <TipBlock><strong>Formality ladder:</strong> Can (casual) → Could (polite) → May (formal). When in doubt, <strong>could</strong> is always safe.</TipBlock>
      </div>
    ),
  },
  {
    id: 'mod-must-haveto',
    category: 'Modal Verbs',
    title: '⚖️ Must vs Have to vs Should',
    content: (
      <div className="space-y-3">
        <SimpleTable
          headers={['Modal', 'Meaning', 'Source', 'Example']}
          rows={[
            { cells: ['Must', 'Strong obligation', 'Internal (your own feeling)', 'I must call my mother.'] },
            { cells: ['Have to', 'Strong obligation', 'External (a rule, a law)', 'I have to wear a uniform.'] },
            { cells: ['Should', 'Advice / recommendation', 'Not required', 'You should drink more water.'] },
          ]}
        />
        <div className="space-y-1.5">
          <ExampleBlock correct text="I must remember to call her. (my own decision)" />
          <ExampleBlock correct text="You have to show your passport at the border. (it's the rule)" />
          <ExampleBlock correct text="You should try this restaurant. (recommendation)" />
        </div>
        <p className="text-xs font-semibold mt-3 mb-1.5">⚠️ Negative Forms — This Is Where People Get Confused</p>
        <SimpleTable
          headers={['Positive', 'Negative', 'Meaning']}
          rows={[
            { cells: ['must do', "mustn't do", "it's forbidden (DON'T do it)"] },
            { cells: ['have to do', "don't have to do", "it's optional (you CAN but don't NEED to)"] },
          ]}
        />
        <div className="space-y-1.5">
          <ExampleBlock correct text="You mustn't smoke here. (it's prohibited)" />
          <ExampleBlock correct text="You don't have to come. (you can come if you want, but it's your choice)" />
        </div>
        <TipBlock><strong>Critical difference:</strong> "mustn't" = <strong>forbidden</strong>. "don't have to" = <strong>free choice</strong>. These are NOT the same!</TipBlock>
      </div>
    ),
  },
  {
    id: 'mod-might-would',
    category: 'Modal Verbs',
    title: '🔮 Might vs Would vs Could (Possibility)',
    content: (
      <div className="space-y-3">
        <SimpleTable
          headers={['Modal', 'Certainty Level', 'Example']}
          rows={[
            { cells: ['will', '~95% certain', 'She will pass the exam.'] },
            { cells: ['should', '~75% expected', 'She should pass the exam.'] },
            { cells: ['might / may', '~50% possible', 'She might pass the exam.'] },
            { cells: ['could', '~30% possible', 'She could pass the exam.'] },
          ]}
        />
        <div className="space-y-1.5">
          <ExampleBlock correct text="It might rain later. (50/50 — I'm not sure)" />
          <ExampleBlock correct text="That could be the answer. (it's possible but I'm not confident)" />
          <ExampleBlock correct text="I would help, but I'm busy. (hypothetical willingness)" />
        </div>
        <TipBlock><strong>Golden rule:</strong> More certain → <strong>will/should</strong>. Less certain → <strong>might/could</strong>. "Would" = hypothetical (imaginary situations).</TipBlock>
      </div>
    ),
    drill: [
      { sentence: '___ you please close the window? (Can/Could/May — formal email)', answer: 'Could', explanation: 'Formal/polite request → "Could" is the safe choice.' },
      { sentence: 'You ___ park here — it\'s a fire lane. (mustn\'t / don\'t have to)', answer: "mustn't", explanation: "It's forbidden (a rule) → mustn't." },
      { sentence: 'The exam is optional. You ___ take it if you want. (mustn\'t / don\'t have to)', answer: "don't have to", explanation: "It's optional, your free choice → don't have to." },
      { sentence: 'It ___ snow tonight — the forecast says 50% chance. (will/might)', answer: 'might', explanation: '50% chance = uncertain → might.' },
      { sentence: 'You ___ see a doctor about that cough. (should/must)', answer: 'should', explanation: "It's advice/recommendation, not a rule → should." },
      { sentence: 'She ___ speak French when she was 10, but she\'s forgotten it now. (can/could)', answer: 'could', explanation: 'Past ability → could.' },
    ],
  },

  /* ========== CONDITIONALS ========== */
  {
    id: 'cond-core',
    category: 'Conditionals',
    title: '🔑 The Core Idea — The Reality Scale',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Conditionals express <strong>"if X happens, then Y happens."</strong> The 4 types represent a scale from <strong>100% real</strong> to <strong>impossible</strong>.
        </p>
        <div className="rounded-lg bg-secondary p-4 font-mono text-xs leading-relaxed whitespace-pre text-center overflow-x-auto">
{`REALITY SCALE:
Zero ──── First ──── Second ──── Third
 FACT     LIKELY     UNLIKELY    IMPOSSIBLE
always    future    hypothetical  past regret
true      possible  imaginary     can't change`}
        </div>
        <TipBlock><strong>Golden rule:</strong> The more unreal the situation, the further back in tense you go. Real → present tense. Unreal → past tense. Impossible past → past perfect.</TipBlock>
      </div>
    ),
  },
  {
    id: 'cond-zero-first',
    category: 'Conditionals',
    title: '0️⃣ Zero Conditional (Facts)',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          <strong>If + present, present.</strong> Used for things that are <strong>always true</strong> — scientific facts, general truths.
        </p>
        <div className="space-y-1.5">
          <ExampleBlock correct text="If you heat water to 100°C, it boils." />
          <ExampleBlock correct text="If you mix red and blue, you get purple." />
          <ExampleBlock correct text="If babies are hungry, they cry." />
        </div>
        <TipBlock>You can replace "if" with "when" and the meaning stays the same → it's zero conditional.</TipBlock>
      </div>
    ),
  },
  {
    id: 'cond-first',
    category: 'Conditionals',
    title: '1️⃣ First Conditional (Likely Future)',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          <strong>If + present simple, will + verb.</strong> Used for <strong>real, possible</strong> future situations.
        </p>
        <div className="space-y-1.5">
          <ExampleBlock correct text="If it rains tomorrow, I will stay home." />
          <ExampleBlock correct text="If you study hard, you will pass the exam." />
          <ExampleBlock correct={false} text="If it will rain tomorrow, I will stay home. (NEVER use 'will' in the 'if' clause)" />
        </div>
        <TipBlock><strong>Critical rule:</strong> NEVER put "will" in the "if" clause. "If" + present simple, [main clause] + will. Always.</TipBlock>
      </div>
    ),
  },
  {
    id: 'cond-second',
    category: 'Conditionals',
    title: '2️⃣ Second Conditional (Unlikely / Imaginary)',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          <strong>If + past simple, would + verb.</strong> Used for <strong>hypothetical, unlikely, or imaginary</strong> present/future situations.
        </p>
        <div className="space-y-1.5">
          <ExampleBlock correct text="If I won the lottery, I would travel the world." />
          <ExampleBlock correct text="If I were you, I would study harder." />
          <ExampleBlock correct text="If she had more time, she would learn French." />
          <ExampleBlock correct={false} text='If I was you, I would study harder. (always "were" for all subjects in conditionals)' />
        </div>
        <TipBlock><strong>Golden rule:</strong> Always say "If I <strong>were</strong>" (not "If I was") in second conditional — even though "was" sounds right to your ear.</TipBlock>
      </div>
    ),
  },
  {
    id: 'cond-third',
    category: 'Conditionals',
    title: '3️⃣ Third Conditional (Impossible Past)',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          <strong>If + past perfect (had + past participle), would have + past participle.</strong> Used for <strong>regrets and imagining different past outcomes</strong>. The situation is <strong>impossible to change</strong>.
        </p>
        <div className="space-y-1.5">
          <ExampleBlock correct text="If I had studied harder, I would have passed the exam." />
          <ExampleBlock correct text="If she had left earlier, she wouldn't have missed the train." />
          <ExampleBlock correct text="If they had known about the traffic, they would have taken a different route." />
          <ExampleBlock correct={false} text="If I would have studied harder, I would have passed. (don't put 'would' in the 'if' clause)" />
        </div>
        <TipBlock><strong>Golden rule:</strong> Third conditional is for <strong>time travel regrets</strong> — things you wish you could change but can't. Never put "would" in the "if" clause.</TipBlock>
      </div>
    ),
    drill: [
      { sentence: 'If you ___ (heat) ice, it ___ (melt). (zero conditional)', answer: 'heat, melts', explanation: 'Facts/always true → If + present, present.' },
      { sentence: 'If she ___ (call) me, I ___ (answer). (first conditional — likely future)', answer: 'calls, will answer', explanation: 'Likely future → If + present simple, will + verb.' },
      { sentence: 'If I ___ (be) rich, I ___ (buy) a house on the beach. (second conditional)', answer: 'were, would buy', explanation: 'Hypothetical → If + past simple (were), would + verb.' },
      { sentence: 'If I ___ (know) about the party, I ___ (come). (third conditional — past regret)', answer: 'had known, would have come', explanation: "Impossible past → If + past perfect, would have + past participle." },
      { sentence: 'If it ___ (rain) tomorrow, we ___ (cancel) the picnic. (first conditional)', answer: 'rains, will cancel', explanation: 'Real future possibility → If + present simple, will + verb.' },
    ],
  },

  /* ========== PUNCTUATION ========== */
  {
    id: 'punc-core',
    category: 'Punctuation',
    title: '🔑 The Core Idea — Punctuation = Breathing Instructions',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Think of punctuation as <strong>breathing instructions</strong> for the reader. A comma = short pause. A period = full stop and breathe. A semicolon = a longer pause between connected ideas.
        </p>
        <TipBlock><strong>Golden rule:</strong> Read your sentence aloud. Where you naturally pause → comma. Where you stop → period. If you run out of breath → you need punctuation.</TipBlock>
      </div>
    ),
  },
  {
    id: 'punc-comma',
    category: 'Punctuation',
    title: '📌 The 5 Essential Comma Rules',
    content: (
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold mb-1.5">1. Lists (Oxford Comma)</p>
          <div className="space-y-1.5">
            <ExampleBlock correct text="I bought eggs, milk, and bread." />
            <ExampleBlock correct={false} text="I bought eggs, milk and bread. (can be ambiguous)" />
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold mb-1.5">2. Before conjunctions joining two complete sentences</p>
          <div className="space-y-1.5">
            <ExampleBlock correct text="I was tired, so I went to bed." />
            <ExampleBlock correct text="She called, but nobody answered." />
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold mb-1.5">3. After introductory phrases</p>
          <div className="space-y-1.5">
            <ExampleBlock correct text="After the meeting, we went to lunch." />
            <ExampleBlock correct text="However, the results were surprising." />
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold mb-1.5">4. Around extra information (non-essential clauses)</p>
          <div className="space-y-1.5">
            <ExampleBlock correct text="My sister, who lives in London, is visiting." />
            <ExampleBlock correct text="The book, which I bought yesterday, is fascinating." />
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold mb-1.5">5. Direct address</p>
          <div className="space-y-1.5">
            <ExampleBlock correct text="Let's eat, grandma! (talking TO grandma)" />
            <ExampleBlock correct={false} text="Let's eat grandma! (eating grandma 😱)" />
          </div>
        </div>
        <TipBlock><strong>Golden rule:</strong> Commas save lives. "Let's eat, grandma" vs "Let's eat grandma." Punctuation changes meaning!</TipBlock>
      </div>
    ),
  },
  {
    id: 'punc-apostrophe',
    category: 'Punctuation',
    title: '✏️ Apostrophes — Possession & Contractions',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Apostrophes do exactly <strong>two jobs</strong>: show possession and show missing letters.</p>
        <div>
          <p className="text-xs font-semibold mb-1.5">Possession:</p>
          <SimpleTable
            headers={['Owner', 'Rule', 'Example']}
            rows={[
              { cells: ['Singular noun', "Add 's", "The cat's toy / James's book"] },
              { cells: ['Plural ending in s', "Add just '", "The cats' toys / The teachers' room"] },
              { cells: ['Plural NOT ending in s', "Add 's", "The children's park / The men's room"] },
            ]}
          />
        </div>
        <div className="mt-3">
          <p className="text-xs font-semibold mb-1.5">Contractions (missing letters):</p>
          <SimpleTable
            headers={['Full Form', 'Contraction']}
            rows={[
              { cells: ['I am', "I'm"] },
              { cells: ['do not', "don't"] },
              { cells: ['they have', "they've"] },
              { cells: ['it is', "it's"] },
              { cells: ['would not', "wouldn't"] },
            ]}
          />
        </div>
        <TipBlock><strong>Never</strong> use apostrophes for plurals! "Apple's for sale" ❌ → "Apples for sale" ✅.</TipBlock>
      </div>
    ),
  },
  {
    id: 'punc-semicolon',
    category: 'Punctuation',
    title: '🔗 Semicolons & Colons',
    content: (
      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold mb-1.5">Semicolons (;) — connecting related complete sentences:</p>
          <div className="space-y-1.5">
            <ExampleBlock correct text="I have a big exam tomorrow; I can't go out tonight." />
            <ExampleBlock correct text="She loves hiking; however, she hates camping." />
          </div>
          <p className="text-xs text-muted-foreground mt-2">Use a semicolon when two sentences are <strong>closely related</strong> and you want to show the connection.</p>
        </div>
        <div className="mt-3">
          <p className="text-xs font-semibold mb-1.5">Colons (:) — introducing lists, explanations, or emphasis:</p>
          <div className="space-y-1.5">
            <ExampleBlock correct text="I need three things: patience, coffee, and sleep." />
            <ExampleBlock correct text="There is one rule: never give up." />
          </div>
        </div>
        <TipBlock><strong>Semicolon test:</strong> Can both parts stand alone as sentences? Yes → semicolon works. <strong>Colon test:</strong> Is the second part explaining or listing? Yes → colon works.</TipBlock>
      </div>
    ),
    drill: [
      { sentence: 'Add correct punctuation: "I bought apples oranges and bananas"', answer: 'I bought apples, oranges, and bananas.', explanation: 'List of three items → commas between items + Oxford comma before "and."' },
      { sentence: "The ___ (students/student's/students') homework was excellent. (one student)", answer: "student's", explanation: "One student (singular possessor) → student's." },
      { sentence: "The ___ (students/student's/students') homework was excellent. (multiple students)", answer: "students'", explanation: "Multiple students (plural ending in s) → students'." },
      { sentence: 'Choose: "She loves cooking ___ her family loves eating." (; / , / and)', answer: ';', explanation: 'Two closely related complete sentences → semicolon.' },
      { sentence: 'Fix: "Lets eat grandma" (add punctuation)', answer: "Let's eat, grandma!", explanation: "Let's (contraction of let us) + comma before direct address." },
    ],
  },
];

const categories = [...new Set(grammarSections.map(s => s.category))];

const categoryEmojis: Record<string, string> = {
  'Subject-Verb Agreement': '🔗',
  'Articles': '📝',
  'Verb Tenses': '⏰',
  'Prepositions': '📍',
  'Common Mistakes': '⚠️',
  'Sentence Structure': '🏗️',
  'Modal Verbs': '💪',
  'Conditionals': '🔀',
  'Punctuation': '✏️',
};

/* ─── Section Card ─── */

function SectionCard({ section }: { section: GrammarSection }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between text-left"
        >
          <span className="font-display font-semibold text-sm">{section.title}</span>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 overflow-hidden"
            >
              {section.content}
              {section.drill && (
                <DrillExercise questions={section.drill} title="Practice Drill" />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

/* ─── Page ─── */

export default function GrammarRulesPage() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

  const filteredSections = activeCategory
    ? grammarSections.filter(s => s.category === activeCategory)
    : grammarSections;

  return (
    <AppLayout>
      <div className="px-4 pt-6 pb-24 max-w-lg mx-auto">
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.div variants={item} className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <BookText className="h-5 w-5 text-green-400" />
              <h1 className="font-display text-2xl font-bold">Grammar Rules</h1>
            </div>
            <p className="text-sm text-muted-foreground">Essential rules made simple — with practice drills</p>
          </motion.div>

          {/* Category filters */}
          <motion.div variants={item} className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory(null)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium border transition-all',
                !activeCategory
                  ? 'bg-green-500/20 text-green-300 border-green-500/40'
                  : 'bg-secondary text-secondary-foreground border-border hover:border-green-500/30'
              )}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-medium border transition-all',
                  activeCategory === cat
                    ? 'bg-green-500/20 text-green-300 border-green-500/40'
                    : 'bg-secondary text-secondary-foreground border-border hover:border-green-500/30'
                )}
              >
                {categoryEmojis[cat]} {cat}
              </button>
            ))}
          </motion.div>

          {/* Sections */}
          {activeCategory ? (
            <motion.div variants={item} className="space-y-3 mb-8">
              {filteredSections.map(section => (
                <motion.div key={section.id} variants={item}>
                  <SectionCard section={section} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            categories.map(cat => (
              <motion.div key={cat} variants={item} className="mb-8">
                <h2 className="font-display text-lg font-semibold mb-3">
                  {categoryEmojis[cat]} {cat}
                </h2>
                <div className="space-y-3">
                  {grammarSections.filter(s => s.category === cat).map(section => (
                    <motion.div key={section.id} variants={item}>
                      <SectionCard section={section} />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
}
