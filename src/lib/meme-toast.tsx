import { toast } from 'sonner';

type Meme = { quote: string; char: string; img: string };

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Image paths — unchanged, add these files under /public/memes/ ──
const M = {
  // The Office
  gangster: '/memes/gangster_michael.webp',
  surprised: '/memes/surprised_in_a_goodway_micheal.webp',
  doubtful: '/memes/doubtful_micheal.webp',
  noGod: '/memes/no_god_michael.webp',
  dwight: '/memes/stone_faced_dwight.webp',
  jim: '/memes/looking_at_camera_jim.webp',

  // Breaking Bad
  heisenberg: '/memes/heisenberg_hat.webp',
  jesse: '/memes/jesse_yeah_science.webp',
  saul: '/memes/saul_better_call.webp',

  // Rick and Morty
  rick: '/memes/rick_smirk.webp',
  morty: '/memes/morty_panic.webp',

  // The Matrix
  morpheus: '/memes/morpheus_what_if_i_told_you.webp',
  neo: '/memes/neo_whoa.webp',

  // Avengers / Marvel
  thanos: '/memes/thanos_inevitable.webp',
  stark: '/memes/stark_genius.webp',
  cap: '/memes/cap_i_can_do_this_all_day.webp',

  // GOT
  tyrion: '/memes/tyrion_drink_know_things.webp',
  ned: '/memes/ned_stark_serious.webp',

  // Wolf of Wall Street
  belfort: '/memes/belfort_chest_thump.webp',
  belfortPen: '/memes/belfort_sell_me_this_pen.webp',

  // Fight Club
  tyler: '/memes/tyler_durden_smirk.webp',

  // Pulp Fiction
  jules: '/memes/jules_intense_stare.webp',
  vincent: '/memes/vincent_confused.webp',

  // Scarface
  montana: '/memes/tony_montana_gun.webp',

  // The Godfather
  corleone: '/memes/vito_corleone_offer.webp',

  // The Dark Knight
  joker: '/memes/joker_why_so_serious.webp',
  batman: '/memes/batman_stare.webp',

  // Interstellar
  cooper: '/memes/cooper_docking.webp',

  // Brooklyn 99
  jake: '/memes/jake_peralta_cool.webp',
  holt: '/memes/holt_deadpan.webp',

  // How I Met Your Mother
  barney: '/memes/barney_suit_up.webp',
} as const;

// ── Event pools — same image set as before, more quotes per section ──

const WORD_SAVED: Meme[] = [
  { quote: "You miss 100% of the words you don't learn. — Wayne Gretzky", char: "Michael Scott", img: M.gangster },
  { quote: "I am the one who vocabs.", char: "Walter White", img: M.heisenberg },
  { quote: "Yeah, science! Also, words.", char: "Jesse Pinkman", img: M.jesse },
  { quote: "Sell me this word.", char: "Jordan Belfort", img: M.belfortPen },
  { quote: "This word. I have foreseen it. Inevitable.", char: "Thanos", img: M.thanos },
  { quote: "Say hello to your new little word.", char: "Tony Montana", img: M.montana },
  { quote: "I'm gonna make this word an offer it can't refuse.", char: "Vito Corleone", img: M.corleone },
  { quote: "Wubba lubba word grab, Morty!", char: "Rick Sanchez", img: M.rick },
  { quote: "A word saved is a word never forgotten. Probably.", char: "Tyrion Lannister", img: M.tyrion },
  { quote: "This word transcends dimensions. And your vocabulary.", char: "Cooper", img: M.cooper },
  { quote: "Legendary word acquisition. Suit up.", char: "Barney Stinson", img: M.barney },
  { quote: "One does not simply forget a saved word.", char: "Ned Stark", img: M.ned },
];

const WORD_CONQUERED: Meme[] = [
  { quote: "BOOM. Roasted. The word never stood a chance.", char: "Michael Scott", img: M.gangster },
  { quote: "Say its name. You conquered it.", char: "Walter White", img: M.heisenberg },
  { quote: "What if I told you... you just learned a word.", char: "Morpheus", img: M.morpheus },
  { quote: "This word bows to no one. Except you now.", char: "Ned Stark", img: M.ned },
  { quote: "Word defeated. I can do this all day.", char: "Captain America", img: M.cap },
  { quote: "First rule of vocabulary club: you don't skip vocabulary club.", char: "Tyler Durden", img: M.tyler },
  { quote: "Why so serious? The word already lost.", char: "Joker", img: M.joker },
  { quote: "Cool cool cool cool, word crushed, no doubt, no doubt.", char: "Jake Peralta", img: M.jake },
  { quote: "The word never saw it coming. Neither did the pen.", char: "Jordan Belfort", img: M.belfort },
  { quote: "English. Do you speak it? Not anymore, because it's conquered.", char: "Jules Winnfield", img: M.jules },
  { quote: "I know things. And now, so do you.", char: "Tyrion Lannister", img: M.tyrion },
];

const DAILY_COMPLETE: Meme[] = [
  { quote: "Today I have achieved everything I set out to do. Also it is 9 AM.", char: "Michael Scott", img: M.surprised },
  { quote: "Balance. I restored it. To your vocabulary.", char: "Thanos", img: M.thanos },
  { quote: "Genius, billionaire, word list — finished.", char: "Tony Stark", img: M.stark },
  { quote: "A person who has done today's words never truly fails.", char: "Tyrion Lannister", img: M.tyrion },
  { quote: "The name's Belfort. And I just closed today's list.", char: "Jordan Belfort", img: M.belfort },
  { quote: "Love isn't the only thing that transcends time. This streak does too.", char: "Cooper", img: M.cooper },
  { quote: "Legend — wait for it — dary. List complete.", char: "Barney Stinson", img: M.barney },
  { quote: "The world is yours. Also, the list is done.", char: "Tony Montana", img: M.montana },
  { quote: "An offer this list couldn't refuse: completion.", char: "Vito Corleone", img: M.corleone },
  { quote: "Detective work complete. Case closed, list finished.", char: "Captain Holt", img: M.holt },
];

const DEFINITION_GENERATED: Meme[] = [
  { quote: "Wikipedia says... close enough. Good enough for me.", char: "Michael Scott", img: M.doubtful },
  { quote: "I know things. Also, definitions.", char: "Tyrion Lannister", img: M.tyrion },
  { quote: "Better call Saul. Or just read this definition.", char: "Saul Goodman", img: M.saul },
  { quote: "English. Do you speak it?", char: "Jules Winnfield", img: M.jules },
  { quote: "I'm the definition. I'm the guy who reads the definition.", char: "Tony Montana", img: M.montana },
  { quote: "Fact: definition acquired without a single wormhole.", char: "Rick Sanchez", img: M.rick },
  { quote: "An offer of clarity you couldn't refuse.", char: "Vito Corleone", img: M.corleone },
  { quote: "Whoa. That's the definition.", char: "Neo", img: M.neo },
];

const EXAMPLE_GENERATED: Meme[] = [
  { quote: "And that is how I used it in a sentence. Nobody left.", char: "Michael Scott", img: M.surprised },
  { quote: "Whoa. Context.", char: "Neo", img: M.neo },
  { quote: "Is that context in the room with us right now?", char: "Vincent Vega", img: M.vincent },
  { quote: "Detective, I've deduced the perfect example sentence.", char: "Captain Holt", img: M.holt },
  { quote: "Yeah, science! That's a real sentence now.", char: "Jesse Pinkman", img: M.jesse },
  { quote: "A sentence this good, it's almost legendary.", char: "Barney Stinson", img: M.barney },
  { quote: "One sentence. Infinite swagger.", char: "Tony Montana", img: M.montana },
];

const SYNONYMS_GENERATED: Meme[] = [
  { quote: "Variety is the spice of life. Also of vocabulary.", char: "Michael Scott", img: M.surprised },
  { quote: "Interesting. More words for the same thing.", char: "Rick Sanchez", img: M.rick },
  { quote: "A person who has many synonyms owes no one an explanation.", char: "Tyrion Lannister", img: M.tyrion },
  { quote: "Why so serious? Just pick a synonym.", char: "Joker", img: M.joker },
  { quote: "Cool cool cool, synonyms loaded, no doubt.", char: "Jake Peralta", img: M.jake },
  { quote: "An offer of extra words you can't refuse.", char: "Vito Corleone", img: M.corleone },
];

const COLLOCATIONS_GENERATED: Meme[] = [
  { quote: "Words that go together like Michael and bad decisions.", char: "Jim Halpert", img: M.jim },
  { quote: "Two words, one destiny.", char: "Ned Stark", img: M.ned },
  { quote: "Keep your friends close, and these word pairs closer.", char: "Vito Corleone", img: M.corleone },
  { quote: "These words fit like a suit. Suit up.", char: "Barney Stinson", img: M.barney },
  { quote: "Some words just belong together. Inevitable, really.", char: "Thanos", img: M.thanos },
  { quote: "Detective-grade word pairing. Case closed.", char: "Captain Holt", img: M.holt },
];

const MEMORY_TRICK: Meme[] = [
  { quote: "The human brain is like a piñata. Sometimes you have to hit it.", char: "Michael Scott", img: M.noGod },
  { quote: "Morty, memory tricks are basically a wormhole for your brain.", char: "Rick Sanchez", img: M.rick },
  { quote: "I have a bad feeling this trick will actually work.", char: "Morty", img: M.morty },
  { quote: "Time is relative. So is remembering this word tomorrow.", char: "Cooper", img: M.cooper },
  { quote: "Yeah, science! That's basically what memory is.", char: "Jesse Pinkman", img: M.jesse },
  { quote: "A trick this good deserves a suit-up moment.", char: "Barney Stinson", img: M.barney },
];

const AUTOFILL: Meme[] = [
  { quote: "I am a machine. A word machine. You're welcome.", char: "Michael Scott", img: M.gangster },
  { quote: "I am inevitable. So is this autofill.", char: "Thanos", img: M.thanos },
  { quote: "Genius move. Didn't even break a sweat.", char: "Tony Stark", img: M.stark },
  { quote: "The world is yours. Also, all fields are filled.", char: "Tony Montana", img: M.montana },
  { quote: "An offer of zero effort you can't refuse.", char: "Vito Corleone", img: M.corleone },
  { quote: "Whoa. Everything's just... filled.", char: "Neo", img: M.neo },
];

const WORD_SUGGESTED: Meme[] = [
  { quote: "You're going to want to write that down.", char: "Michael Scott", img: M.gangster },
  { quote: "Suit up. This word is legendary.", char: "Barney Stinson", img: M.barney },
  { quote: "Fact: I chose this word with purpose and authority.", char: "Dwight Schrute", img: M.dwight },
  { quote: "This word? Chef's kiss. Inevitable, even.", char: "Thanos", img: M.thanos },
  { quote: "Detective-approved word suggestion. No notes.", char: "Captain Holt", img: M.holt },
  { quote: "An offer of vocabulary you can't refuse.", char: "Vito Corleone", img: M.corleone },
];

const WORD_DELETED: Meme[] = [
  { quote: "You fired that word. But you can't fire the memories.", char: "Michael Scott", img: M.noGod },
  { quote: "Say goodbye to this word.", char: "Walter White", img: M.heisenberg },
  { quote: "On a long enough timeline, every word's survival rate drops to zero.", char: "Tyler Durden", img: M.tyler },
  { quote: "Why so serious about deleting one word?", char: "Joker", img: M.joker },
  { quote: "Cut. Clean. No regrets.", char: "Tony Montana", img: M.montana },
  { quote: "The word is gone. I know things, and that's one less.", char: "Tyrion Lannister", img: M.tyrion },
];

const WORD_UPDATED: Meme[] = [
  { quote: "You updated it. That is called growth. I have grown too.", char: "Michael Scott", img: M.surprised },
  { quote: "Even Saul reinvents himself. So can your word.", char: "Saul Goodman", img: M.saul },
  { quote: "Fact: revision is the mark of a disciplined mind.", char: "Dwight Schrute", img: M.dwight },
  { quote: "Change is inevitable. So is this word getting better.", char: "Thanos", img: M.thanos },
  { quote: "An offer of improvement you can't refuse.", char: "Vito Corleone", img: M.corleone },
  { quote: "Detective work: word updated, case improved.", char: "Captain Holt", img: M.holt },
  { quote: "Legendary edit. Suit up.", char: "Barney Stinson", img: M.barney },
  { quote: "Whoa. The word just leveled up.", char: "Neo", img: M.neo },
];

const SIGN_IN: Meme[] = [
  { quote: "I am Beyoncé, always. Welcome back.", char: "Michael Scott", img: M.gangster },
  { quote: "There is no spoon. There is only you, signed in.", char: "Neo", img: M.neo },
  { quote: "The North remembers. So do we.", char: "Ned Stark", img: M.ned },
  { quote: "I am the night. Also, welcome back.", char: "Batman", img: M.batman },
  { quote: "Identity confirmed. You are not a threat. Proceed.", char: "Dwight Schrute", img: M.dwight },
  { quote: "Welcome back. The world is still yours.", char: "Tony Montana", img: M.montana },
];

const SIGN_OUT: Meme[] = [
  { quote: "See you tomorrow. Or never. I don't know your life.", char: "Michael Scott", img: M.doubtful },
  { quote: "Every hero needs a good exit line. This is mine.", char: "Batman", img: M.batman },
  { quote: "Logging off. Maintaining perimeter security.", char: "Dwight Schrute", img: M.dwight },
  { quote: "Detective's out. Case reopens tomorrow.", char: "Captain Holt", img: M.holt },
];

const SETTINGS_SAVED: Meme[] = [
  { quote: "Preferences noted. I will act accordingly and not ask questions.", char: "Dwight Schrute", img: M.dwight },
  { quote: "The things you own end up owning your settings. Not this time.", char: "Tyler Durden", img: M.tyler },
  { quote: "An offer these settings couldn't refuse.", char: "Vito Corleone", img: M.corleone },
  { quote: "Settings saved. This is a perfect set of settings.", char: "Michael Scott", img: M.gangster },
  { quote: "Fact: this configuration is inevitable now.", char: "Thanos", img: M.thanos },
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
  definitionGenerated() { show('Definition generated!', pick(DEFINITION_GENERATED)); },
  exampleGenerated() { show('Example generated!', pick(EXAMPLE_GENERATED)); },
  synonymsGenerated() { show('Synonyms generated!', pick(SYNONYMS_GENERATED)); },
  collocationsGenerated() { show('Collocations generated!', pick(COLLOCATIONS_GENERATED)); },
  memoryTrickGenerated() { show('Memory trick generated!', pick(MEMORY_TRICK)); },
  autofillComplete() { show('All fields filled!', pick(AUTOFILL)); },
  wordSuggested() { show('Word suggested!', pick(WORD_SUGGESTED)); },
  wordDeleted() { show('Word deleted', pick(WORD_DELETED)); },
  wordUpdated() { show('Word updated', pick(WORD_UPDATED)); },
  signIn() { show('Welcome back!', pick(SIGN_IN)); },
  signOut() { show('Signed out', pick(SIGN_OUT)); },
  settingsSaved() { show('Settings saved', pick(SETTINGS_SAVED)); },
};