import { toast } from 'sonner';

type Meme = { quote: string; char: string; img: string };

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const M = {
  gangster: '/memes/gangster_michael.webp',
  surprised: '/memes/surprised_in_a_goodway_micheal.webp',
  doubtful: '/memes/doubtful_micheal.webp',
  noGod: '/memes/no_god_michael.webp',
  dwight: '/memes/stone_faced_dwight.webp',
  jim: '/memes/looking_at_camera_jim.webp',
};

const WORD_SAVED: Meme[] = [
  { quote: "You miss 100% of the words you don't learn. — Wayne Gretzky", char: "Michael Scott", img: M.gangster },
  { quote: "Bears. Beets. Battlestar Galactica.", char: "Dwight Schrute", img: M.dwight },
  { quote: "Fact: You are now measurably less ignorant.", char: "Dwight Schrute", img: M.dwight },
  { quote: "I am running this vocabulary and it is going great.", char: "Michael Scott", img: M.gangster },
  { quote: "That's what she said. About your expanding vocabulary.", char: "Michael Scott", img: M.surprised },
];

const WORD_CONQUERED: Meme[] = [
  { quote: "BOOM. Roasted. The word never stood a chance.", char: "Michael Scott", img: M.gangster },
  { quote: "Fact: Word neutralised. Moving on.", char: "Dwight Schrute", img: M.dwight },
  { quote: "I am a threat to ignorance and I will not apologise.", char: "Michael Scott", img: M.gangster },
  { quote: "Identity theft is not a joke. Vocabulary theft is encouraged.", char: "Dwight Schrute", img: M.dwight },
  { quote: "Today I am the hero of my own story. Chapter: this word.", char: "Michael Scott", img: M.gangster },
];

const DAILY_COMPLETE: Meme[] = [
  { quote: "Today I have achieved everything I set out to do. Also it is 9 AM.", char: "Michael Scott", img: M.surprised },
  { quote: "I declare bankruptcy of ignorance — DONE.", char: "Michael Scott", img: M.gangster },
  { quote: "Mission complete. Return to base. The beet farm awaits.", char: "Dwight Schrute", img: M.dwight },
  { quote: "I am not superstitious. But I am a little stitious about your vocabulary gains.", char: "Michael Scott", img: M.doubtful },
];

const DEFINITION_GENERATED: Meme[] = [
  { quote: "Wikipedia says... close enough. Good enough for me.", char: "Michael Scott", img: M.doubtful },
  { quote: "Fact: Definition acquired. File it under D for Domination.", char: "Dwight Schrute", img: M.dwight },
  { quote: "I looked it up so you don't have to. I am basically a dictionary.", char: "Michael Scott", img: M.gangster },
];

const EXAMPLE_GENERATED: Meme[] = [
  { quote: "And that is how I used it in a sentence. Nobody left.", char: "Michael Scott", img: M.surprised },
  { quote: "Fact: Context is everything. Except in bear attacks.", char: "Dwight Schrute", img: M.dwight },
  { quote: "I once used a word incorrectly for three years. Not anymore.", char: "Michael Scott", img: M.doubtful },
];

const SYNONYMS_GENERATED: Meme[] = [
  { quote: "Variety is the spice of life. Also of vocabulary.", char: "Michael Scott", img: M.surprised },
  { quote: "Fact: Having synonyms makes you 40% more articulate. I made that up.", char: "Dwight Schrute", img: M.dwight },
  { quote: "More words, more problems. That is not how the saying goes.", char: "Michael Scott", img: M.doubtful },
];

const COLLOCATIONS_GENERATED: Meme[] = [
  { quote: "Words that go together like Michael and bad decisions.", char: "Jim Halpert", img: M.jim },
  { quote: "Fact: Collocations are how fluent people think. I am fluent in everything.", char: "Dwight Schrute", img: M.dwight },
  { quote: "These words belong together. Like us. Like Dunder Mifflin.", char: "Michael Scott", img: M.gangster },
];

const MEMORY_TRICK: Meme[] = [
  { quote: "The human brain is like a piñata. Sometimes you have to hit it.", char: "Michael Scott", img: M.noGod },
  { quote: "In the wild, a bear memorises 10,000 smells. You can memorise one word.", char: "Dwight Schrute", img: M.dwight },
  { quote: "I have a great memory. I remember everything important. Like this.", char: "Michael Scott", img: M.gangster },
];

const AUTOFILL: Meme[] = [
  { quote: "I am a machine. A word machine. You're welcome.", char: "Michael Scott", img: M.gangster },
  { quote: "Automation is how I stay one step ahead. That, and karate.", char: "Dwight Schrute", img: M.dwight },
  { quote: "I filled everything at once. I am a hero. I said it.", char: "Michael Scott", img: M.gangster },
];

const WORD_SUGGESTED: Meme[] = [
  { quote: "You're going to want to write that down.", char: "Michael Scott", img: M.gangster },
  { quote: "Fact: I chose this word with purpose and authority.", char: "Dwight Schrute", img: M.dwight },
  { quote: "That word? Chef's kiss. I have excellent taste.", char: "Michael Scott", img: M.surprised },
];

const WORD_DELETED: Meme[] = [
  { quote: "You fired that word. But you can't fire the memories.", char: "Michael Scott", img: M.noGod },
  { quote: "Cut. Like a beet. Clean and efficient.", char: "Dwight Schrute", img: M.dwight },
  { quote: "And just like that, it is gone. Very sad. Very brave.", char: "Michael Scott", img: M.noGod },
];

const WORD_UPDATED: Meme[] = [
  { quote: "You updated it. That is called growth. I have grown too.", char: "Michael Scott", img: M.surprised },
  { quote: "Fact: Revision is the mark of a disciplined mind.", char: "Dwight Schrute", img: M.dwight },
];

const SIGN_IN: Meme[] = [
  { quote: "I am Beyoncé, always. Welcome back.", char: "Michael Scott", img: M.gangster },
  { quote: "Identity confirmed. You are not a threat. Proceed.", char: "Dwight Schrute", img: M.dwight },
];

const SIGN_OUT: Meme[] = [
  { quote: "See you tomorrow. Or never. I don't know your life.", char: "Michael Scott", img: M.doubtful },
  { quote: "Logging off. Maintaining perimeter security.", char: "Dwight Schrute", img: M.dwight },
];

const SETTINGS_SAVED: Meme[] = [
  { quote: "Preferences noted. I will act accordingly and not ask questions.", char: "Dwight Schrute", img: M.dwight },
  { quote: "Settings saved. This is a perfect set of settings.", char: "Michael Scott", img: M.gangster },
];

function MemeToast({
  title,
  meme,
  action,
  id,
}: {
  title: string;
  meme: Meme;
  action?: { label: string; onClick: () => void };
  id: string | number;
}) {
  return (
    <div className="w-full overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800 shadow-xl">
      <img
        src={meme.img}
        alt={meme.char}
        className="w-full max-h-44 sm:max-h-60 object-cover object-top"
      />
      <div className="px-3 py-3 sm:px-4 sm:py-4 space-y-2 sm:space-y-3">
        <p className="text-xs sm:text-sm font-bold text-white tracking-wide">{title}</p>
        <div className="border-l-2 border-teal-400 pl-3 space-y-1">
          <p className="text-xs sm:text-sm text-zinc-100 italic leading-relaxed">
            "{meme.quote}"
          </p>
          <p className="text-[10px] sm:text-xs font-semibold text-teal-400 uppercase tracking-wider">
            — {meme.char}
          </p>
        </div>
        {action && (
          <button
            onClick={() => { action.onClick(); toast.dismiss(id); }}
            className="text-xs font-semibold text-white bg-teal-500 hover:bg-teal-400 transition-colors px-3 py-1.5 rounded-md"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}

function show(title: string, meme: Meme, action?: { label: string; onClick: () => void }) {
  toast.custom(
    (id) => <MemeToast title={title} meme={meme} action={action} id={id} />,
    { duration: 4000 },
  );
}

export const memeToast = {
  wordSaved(word: string, action?: { label: string; onClick: () => void }) {
    show(`"${word}" added to your library! 🏆`, pick(WORD_SAVED), action);
  },

  wordConquered(word: string, left: number, action?: { label: string; onClick: () => void }) {
    const subtitle = left > 0
      ? `"${word}" conquered! ${left} word${left === 1 ? '' : 's'} left. 💥`
      : `"${word}" conquered! You've finished today's list! 🎉`;
    const meme = left === 0 ? pick(DAILY_COMPLETE) : pick(WORD_CONQUERED);
    show(subtitle, meme, action);
  },

  definitionGenerated() {
    show('Definition generated!', pick(DEFINITION_GENERATED));
  },

  exampleGenerated() {
    show('Example generated!', pick(EXAMPLE_GENERATED));
  },

  synonymsGenerated() {
    show('Synonyms generated!', pick(SYNONYMS_GENERATED));
  },

  collocationsGenerated() {
    show('Collocations generated!', pick(COLLOCATIONS_GENERATED));
  },

  memoryTrickGenerated() {
    show('Memory trick generated!', pick(MEMORY_TRICK));
  },

  autofillComplete() {
    show('All fields filled!', pick(AUTOFILL));
  },

  wordSuggested() {
    show('Word suggested!', pick(WORD_SUGGESTED));
  },

  wordDeleted() {
    show('Word deleted', pick(WORD_DELETED));
  },

  wordUpdated() {
    show('Word updated', pick(WORD_UPDATED));
  },

  signIn() {
    show('Welcome back!', pick(SIGN_IN));
  },

  signOut() {
    show('Signed out', pick(SIGN_OUT));
  },

  settingsSaved() {
    show('Settings saved', pick(SETTINGS_SAVED));
  },
};
