import { useRef, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, BarChart3, Brain, Eye, EyeOff, Hammer, Layers, Moon, PenLine, PlusCircle, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { memeToast } from '@/lib/meme-toast';
import { TITLES } from '@/lib/identity';
import { Phone, MissionScreen, ReviewScreen, ForgeScreen, CoachScreen, JourneyScreen, PressScreen, ProgressScreen } from '@/components/landing/Mockups';
import { FeatureAccordion } from '@/components/landing/FeatureAccordion';

// Seeding happens on the dashboard (Index) after the words query settles —
// seeding here too raced it and could insert the starter words twice.

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

/** Fades a section in once as it scrolls into view. */
function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** A heading word set in a mint glass pill, like a highlighted dictionary entry. */
const Mark = ({ children }: { children: ReactNode }) => (
  <span className="land-mark relative inline-block px-[0.22em] mx-[0.04em] rounded-[0.3em]">
    <span className="land-mint-text">{children}</span>
  </span>
);

const SectionEyebrow = ({ children }: { children: ReactNode }) => (
  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#c8922a]">{children}</p>
);

/* ─── Auth card ─────────────────────────────────────────────────── */
function AuthCard({ emailRef }: { emailRef: React.RefObject<HTMLInputElement> }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
        memeToast.signIn();
      } else {
        await signUp(email, password);
        toast.success('Account created! Check your email to confirm.');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth" className="land-glass relative w-full max-w-[420px] rounded-[2rem] p-6 sm:p-7 scroll-mt-28">
      {/* Mode switch: sliding white pill, same as the app nav */}
      <div className="relative grid grid-cols-2 p-1 rounded-2xl bg-white/[0.04] ring-1 ring-inset ring-white/[0.07]">
        <motion.span
          className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-xl bg-white shadow-[0_0_20px_rgba(255,255,255,0.18),0_6px_20px_rgba(168,85,247,0.4)]"
          animate={{ x: isLogin ? '0%' : '100%' }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        />
        {(['Sign in', 'Create account'] as const).map((label, i) => {
          const active = (i === 0) === isLogin;
          return (
            <button
              key={label}
              type="button"
              onClick={() => setIsLogin(i === 0)}
              className={`relative z-10 h-9 text-sm font-medium rounded-xl transition-colors ${active ? 'text-zinc-900' : 'text-white/50 hover:text-white'}`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={isLogin ? 'in' : 'up'}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="mt-6"
        >
          <h2 className="font-display text-2xl font-bold text-white tracking-tight">
            {isLogin ? 'Welcome back.' : 'Start your lexicon.'}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {isLogin ? "Today's words are waiting for you." : 'Your first trophy is one set away.'}
          </p>
        </motion.div>
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Email</span>
          <input
            ref={emailRef}
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="land-input mt-2"
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Password</span>
          <span className="relative mt-2 block">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="land-input pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </span>
        </label>

        <button type="submit" disabled={loading} className="land-cta group w-full h-12 rounded-2xl text-sm font-bold text-[#04110d] disabled:opacity-60">
          <span className="flex items-center justify-center gap-2">
            {loading ? 'One moment…' : isLogin ? 'Sign in' : 'Create account'}
            {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
          </span>
        </button>
      </form>

      <p className="mt-5 text-center text-xs text-zinc-500">
        {isLogin ? 'New to LexCore? ' : 'Already have an account? '}
        <button type="button" onClick={() => setIsLogin(!isLogin)} className="font-semibold text-[#00FFC8] hover:underline underline-offset-4">
          {isLogin ? 'Create an account' : 'Sign in'}
        </button>
      </p>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */
const SHOWCASE = [
  { label: "Today's mission", screen: <MissionScreen /> },
  { label: 'Recall & rate', screen: <ReviewScreen /> },
  { label: 'Collocation Forge', screen: <ForgeScreen /> },
  { label: 'AI writing coach', screen: <CoachScreen /> },
  { label: 'Identity journey', screen: <JourneyScreen /> },
];

const FEATURES = [
  { icon: Brain, title: 'Spaced repetition that adapts', body: 'Every rating reschedules the word. Strong words drift away, shaky ones come back tomorrow.' },
  { icon: Layers, title: 'Small sets, not walls', body: 'Today’s reviews arrive in short sets. Finish one, breathe, take the next.' },
  { icon: Sparkles, title: 'AI fills the entry', body: 'Press a word and get its definition, examples, synonyms, collocations and a memory trick.' },
];

const STEPS = [
  { n: '01', title: 'Recall', body: 'See the word, pull the meaning out of memory, then rate how it felt.' },
  { n: '02', title: 'Context', body: 'Meet it again in real sentences and close dialogues.' },
  { n: '03', title: 'Forge', body: 'Pick the verbs and nouns natives actually pair it with.' },
  { n: '04', title: 'Produce', body: 'Write your own sentence and let the coach correct it.' },
];

export default function AuthPage() {
  const emailRef = useRef<HTMLInputElement>(null);

  const goToAuth = () => {
    document.getElementById('auth')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => emailRef.current?.focus({ preventScroll: true }), 450);
  };

  return (
    <div className="land-root relative min-h-screen overflow-x-hidden text-white">
      <style>{`
        .land-root { background: #07060a; }
        .land-mint-text {
          background: linear-gradient(110deg, #00FFC8 0%, #7dd3fc 50%, #c4b5fd 100%);
          -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
        }
        .land-gold-text {
          background: linear-gradient(120deg, #c8922a 0%, #f0c96a 55%, #c08828 100%);
          -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
        }
        .land-mark {
          background: rgba(0,255,200,0.06);
          box-shadow: inset 0 0 0 1px rgba(0,255,200,0.28), 0 0 28px rgba(0,255,200,0.12);
        }
        .land-grid {
          background-image:
            linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
          background-size: 56px 56px;
          mask-image: radial-gradient(ellipse 70% 60% at 50% 30%, #000 30%, transparent 75%);
          -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 30%, #000 30%, transparent 75%);
        }
        .land-glass {
          background: linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%), rgba(10,9,13,0.72);
          border: 1px solid rgba(255,255,255,0.09);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 30px 80px rgba(0,0,0,0.55), 0 0 80px rgba(124,58,237,0.12);
          backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
        }
        .land-card {
          background: linear-gradient(180deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.015) 100%), #0a090d;
          border: 1px solid rgba(255,255,255,0.07);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
        }
        .land-input {
          display: block; width: 100%; height: 48px; padding: 0 16px;
          border-radius: 14px; font-size: 14px; color: #fff;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
        }
        .land-input::placeholder { color: #52525b; }
        .land-input:focus {
          outline: none; background: rgba(0,255,200,0.03);
          border-color: rgba(0,255,200,0.45);
          box-shadow: 0 0 0 4px rgba(0,255,200,0.08);
        }
        .land-cta {
          position: relative; overflow: hidden;
          background: linear-gradient(110deg, #00FFC8 0%, #5eead4 60%, #7dd3fc 100%);
          box-shadow: 0 10px 30px rgba(0,255,200,0.25), inset 0 1px 0 rgba(255,255,255,0.5);
          transition: transform 0.15s, box-shadow 0.2s;
        }
        .land-cta:not(:disabled):hover { transform: translateY(-1px); box-shadow: 0 14px 40px rgba(0,255,200,0.35), inset 0 1px 0 rgba(255,255,255,0.5); }
        .land-cta::after {
          content: ''; position: absolute; inset: 0; width: 40%; left: -60%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
          transform: skewX(-20deg);
          animation: land-shine 3.6s ease-in-out infinite;
        }
        .land-cta > * { position: relative; z-index: 1; }
        @keyframes land-shine { 0%, 60% { left: -60%; } 100% { left: 140%; } }
        .land-ghost {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
          transition: background 0.15s, border-color 0.15s;
        }
        .land-ghost:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.18); }
        .land-phone {
          background: linear-gradient(160deg, #3a3842 0%, #15141a 40%, #2a2930 100%);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.12), 0 40px 80px rgba(0,0,0,0.6), 0 0 60px rgba(124,58,237,0.08);
        }
        @keyframes land-spin { to { transform: rotate(360deg); } }
        .land-spin { animation: land-spin 40s linear infinite; }
        .land-spin-rev { animation: land-spin 28s linear infinite reverse; }
        @keyframes land-marquee { to { transform: translateX(-50%); } }
        .land-marquee { animation: land-marquee 40s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .land-spin, .land-spin-rev, .land-marquee, .land-cta::after { animation: none; }
        }
      `}</style>

      {/* Ambient glows */}
      <div className="land-grid pointer-events-none absolute inset-x-0 top-0 h-[900px]" aria-hidden />
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[700px] w-[1100px] max-w-none"
        style={{ background: 'radial-gradient(ellipse at center, rgba(124,58,237,0.22) 0%, transparent 60%)' }} aria-hidden />
      <div className="pointer-events-none absolute top-[420px] -left-40 h-[520px] w-[520px]"
        style={{ background: 'radial-gradient(circle, rgba(0,255,200,0.1) 0%, transparent 62%)' }} aria-hidden />

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <header className="fixed top-4 left-4 right-4 z-50 flex items-center justify-between gap-3">
        <a href="#top" className="flex items-center h-12 px-5 bg-white/[0.06] rounded-2xl ring-1 ring-inset ring-white/[0.08] backdrop-blur-2xl">
          <span className="font-display font-bold text-lg tracking-tight">Lex<span className="text-primary">Core</span></span>
        </a>
        <nav className="hidden md:flex items-center gap-1 h-12 px-2 bg-white/[0.06] rounded-2xl ring-1 ring-inset ring-white/[0.08] backdrop-blur-2xl">
          {[['Features', '#features'], ['Tour', '#tour'], ['Method', '#method'], ['Journey', '#journey']].map(([label, href]) => (
            <a key={href} href={href} className="h-9 px-5 grid items-center text-sm font-medium text-white/55 hover:text-white rounded-xl transition-colors">{label}</a>
          ))}
        </nav>
        <button onClick={goToAuth} className="h-12 px-5 text-sm font-semibold text-zinc-900 bg-white rounded-2xl shadow-[0_0_24px_rgba(255,255,255,0.18),0_6px_22px_rgba(168,85,247,0.4)] hover:opacity-90 transition-opacity">
          Sign in
        </button>
      </header>

      <main id="top" className="relative">
        {/* ── Hero ──────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-32 sm:pt-36 lg:pt-40 grid lg:grid-cols-[1fr_420px] gap-12 lg:gap-16 items-center">
          <div className="text-center lg:text-left">
            <motion.span
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-semibold text-zinc-300 bg-white/[0.04] ring-1 ring-inset ring-white/[0.09]"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#00FFC8] animate-pulse" />
              Vocabulary, wired into your brain
            </motion.span>
            <motion.h1
              initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.8, delay: 0.1, ease: EASE }}
              className="mt-6 font-display text-[2.6rem] sm:text-6xl lg:text-[4.2rem] font-bold leading-[1.02] tracking-tight"
            >
              Learn a word <Mark>once</Mark>.<br />
              Keep it <span className="land-gold-text">for life</span>.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.35 }}
              className="mt-6 mx-auto lg:mx-0 max-w-lg text-base sm:text-lg leading-relaxed text-zinc-400"
            >
              LexCore turns every new word into a short daily ritual — recall, context, collocations and your own
              sentences — scheduled right before you&apos;d forget it.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}
              className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-3 text-xs text-zinc-500"
            >
              {['Spaced repetition', 'AI-built entries', 'A trophy every day'].map(t => (
                <span key={t} className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-[#c8922a]" />{t}</span>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: EASE }}
            className="flex justify-center lg:justify-end"
          >
            <AuthCard emailRef={emailRef} />
          </motion.div>
        </section>

        {/* ── Phone showcase ────────────────────────────────────────── */}
        <section className="relative mt-24 sm:mt-28">
          <div className="flex justify-center gap-5 sm:gap-7 px-4 overflow-x-auto lg:overflow-visible snap-x snap-mandatory pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SHOWCASE.map((s, i) => {
              const offset = Math.abs(i - 2);
              return (
                <motion.figure
                  key={s.label}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: offset * 28 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.1 + offset * 0.1, ease: EASE }}
                  className={`snap-center shrink-0 ${offset === 2 ? 'hidden xl:block' : offset === 1 ? 'hidden md:block' : ''}`}
                >
                  <Phone className={offset === 0 ? 'scale-105' : ''}>{s.screen}</Phone>
                  <figcaption className="mt-5 text-center text-xs font-medium text-zinc-500">{s.label}</figcaption>
                </motion.figure>
              );
            })}
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#07060a] to-transparent" aria-hidden />
        </section>

        {/* ── Features ──────────────────────────────────────────────── */}
        <section id="features" className="mx-auto max-w-6xl px-4 sm:px-6 pt-20 scroll-mt-24">
          <Reveal className="text-center">
            <SectionEyebrow>Built for retention</SectionEyebrow>
            <h2 className="mt-3 font-display text-3xl sm:text-5xl font-bold tracking-tight">
              Everything you need to <Mark>remember</Mark>
            </h2>
            <p className="mt-4 mx-auto max-w-xl text-zinc-400">Not another flashcard deck. A full workshop for every word you care about.</p>
          </Reveal>
          <div className="mt-12 grid md:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.08}>
                <div className="land-card h-full rounded-[1.75rem] p-7 transition-colors hover:border-[#00FFC8]/25">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#00FFC8]/10 ring-1 ring-inset ring-[#00FFC8]/25">
                    <f.icon className="h-5 w-5 text-[#00FFC8]" />
                  </span>
                  <h3 className="mt-6 font-display text-lg font-bold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── Tour: every room in the app ───────────────────────────── */}
        <section id="tour" className="mx-auto max-w-6xl px-4 sm:px-6 pt-32 scroll-mt-24">
          <Reveal className="text-center">
            <SectionEyebrow>Inside LexCore</SectionEyebrow>
            <h2 className="mt-3 font-display text-3xl sm:text-5xl font-bold tracking-tight">
              One app. <Mark>Every</Mark> room you need.
            </h2>
            <p className="mt-4 mx-auto max-w-xl text-zinc-400">From the first time you meet a word to the day you use it without thinking.</p>
          </Reveal>
          <Reveal delay={0.1} className="mt-8">
            <FeatureAccordion />
          </Reveal>
        </section>

        {/* ── Method ────────────────────────────────────────────────── */}
        <section id="method" className="mx-auto max-w-6xl px-4 sm:px-6 pt-32 scroll-mt-24">
          <div className="land-card relative overflow-hidden rounded-[2.5rem] p-7 sm:p-12 grid lg:grid-cols-[1fr_auto] gap-12 items-center">
            <div className="pointer-events-none absolute -bottom-40 -left-24 h-[420px] w-[420px]"
              style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 62%)' }} aria-hidden />
            <Reveal className="relative">
              <SectionEyebrow>The method</SectionEyebrow>
              <h2 className="mt-3 font-display text-4xl sm:text-5xl font-bold tracking-tight leading-[1.05]">
                Recall. Forge.<br /><span className="land-mint-text">Repeat.</span>
              </h2>
              <ol className="mt-10 space-y-6">
                {STEPS.map(s => (
                  <li key={s.n} className="flex gap-5">
                    <span className="font-display text-sm font-bold text-[#c8922a] tabular-nums pt-0.5">{s.n}</span>
                    <div className="border-l border-white/[0.08] pl-5">
                      <p className="font-display font-bold">{s.title}</p>
                      <p className="mt-1 text-sm text-zinc-400 leading-relaxed">{s.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <button onClick={goToAuth} className="land-cta group mt-10 h-12 px-6 rounded-2xl text-sm font-bold text-[#04110d]">
                <span className="flex items-center gap-2">Start your first set <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span>
              </button>
            </Reveal>
            <Reveal delay={0.15} className="relative hidden sm:flex justify-center">
              <Phone><ReviewScreen /></Phone>
            </Reveal>
          </div>
        </section>

        {/* ── Feature rows ──────────────────────────────────────────── */}
        {[
          {
            icon: PlusCircle, eyebrow: 'The Press', screen: <PressScreen />,
            title: <>Type a word. Get a <Mark>whole entry</Mark>.</>,
            body: 'Pick a register — formal, casual, literary or slang — and AI sets the definition, examples, synonyms, collocations and a memory trick. Edit anything, then press it into your library.',
          },
          {
            icon: Hammer, eyebrow: 'Collocation Forge', screen: <ForgeScreen />,
            title: <>Sound <Mark>native</Mark>, not just correct</>,
            body: 'Knowing a word isn’t enough — you need its partners. The Forge drills the verbs, nouns and prepositions that naturally travel with each word.',
          },
          {
            icon: PenLine, eyebrow: 'Writing Lab', screen: <CoachScreen />,
            title: <>A coach that <Mark>remembers</Mark> you</>,
            body: 'Write with your new words and get line-by-line feedback. The coach keeps notes on your recurring slips, so its advice gets sharper every session.',
          },
          {
            icon: Moon, eyebrow: 'Sleep prep', screen: <MissionScreen />,
            title: <>Review at <Mark>night</Mark>, wake up fluent</>,
            body: 'An evening window nudges a final pass before bed, when memories consolidate best. Clear the day and the trophy is yours.',
          },
          {
            icon: BarChart3, eyebrow: 'Progress', screen: <ProgressScreen />,
            title: <>Watch words go from <Mark>shaky</Mark> to sure</>,
            body: 'Your study calendar, mastered count, answer breakdown and upcoming reviews in one place — plus the handful of words that keep slipping, so you know where to push.',
          },
        ].map((row, i) => (
          <section key={row.eyebrow} className="mx-auto max-w-5xl px-4 sm:px-6 pt-28">
            <div className={`grid md:grid-cols-2 gap-12 items-center ${i % 2 ? 'md:[&>*:first-child]:order-2' : ''}`}>
              <Reveal className="flex justify-center"><Phone>{row.screen}</Phone></Reveal>
              <Reveal delay={0.1} className="text-center md:text-left">
                <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-400">
                  <row.icon className="h-3.5 w-3.5 text-[#00FFC8]" /> {row.eyebrow}
                </span>
                <h3 className="mt-4 font-display text-3xl sm:text-4xl font-bold tracking-tight leading-[1.1]">{row.title}</h3>
                <p className="mt-4 max-w-md mx-auto md:mx-0 text-zinc-400 leading-relaxed">{row.body}</p>
              </Reveal>
            </div>
          </section>
        ))}

        {/* ── Journey ───────────────────────────────────────────────── */}
        <section id="journey" className="pt-32 scroll-mt-24">
          <Reveal className="text-center px-4">
            <SectionEyebrow>Your identity</SectionEyebrow>
            <h2 className="mt-3 font-display text-3xl sm:text-5xl font-bold tracking-tight">
              From Apprentice to <span className="land-gold-text">Polymath</span>
            </h2>
            <p className="mt-4 mx-auto max-w-xl text-zinc-400">Every day you show up moves you up the ladder. Eight titles, one for each stage of mastery.</p>
          </Reveal>
          <div className="relative mt-12 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
            <div className="land-marquee flex w-max gap-4">
              {[...TITLES, ...TITLES].map((t, i) => (
                <div key={i} className="w-[180px] shrink-0 rounded-[1.5rem] p-4 text-center"
                  style={{ background: 'linear-gradient(180deg,#0d0a07,#110e0a)', border: '1px solid rgba(180,140,55,0.22)' }}>
                  <img src={t.image} alt="" className="mx-auto h-[130px] w-auto object-contain" loading="lazy" />
                  <p className="mt-2 font-display font-bold land-gold-text">{t.name}</p>
                  <p className="text-[11px] text-zinc-500">Day {t.from}{t.to ? `–${t.to}` : '+'}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Stats band ────────────────────────────────────────────── */}
        <section className="mx-auto max-w-5xl px-4 sm:px-6 pt-28">
          <Reveal>
            <div className="grid grid-cols-3 divide-x divide-white/[0.07] land-card rounded-[2rem] py-8">
              {[
                { n: '4', l: 'step method' },
                { n: '8', l: 'titles to earn' },
                { n: '1', l: 'trophy every day' },
              ].map(s => (
                <div key={s.l} className="text-center px-2">
                  <p className="font-display text-4xl sm:text-5xl font-bold land-mint-text">{s.n}</p>
                  <p className="mt-2 text-[11px] sm:text-xs text-zinc-500">{s.l}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ── Final CTA ─────────────────────────────────────────────── */}
        <section className="relative mx-auto max-w-4xl px-4 sm:px-6 pt-32 pb-24 text-center">
          <div className="pointer-events-none absolute inset-x-0 top-16 mx-auto h-[360px] max-w-2xl"
            style={{ background: 'radial-gradient(ellipse at center, rgba(0,255,200,0.12) 0%, transparent 65%)' }} aria-hidden />
          <Reveal className="relative">
            <h2 className="font-display text-4xl sm:text-6xl font-bold tracking-tight leading-[1.05]">
              Your next word<br />is <Mark>waiting</Mark>.
            </h2>
            <p className="mt-5 text-zinc-400">Five minutes a day. A vocabulary that stays.</p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <button onClick={goToAuth} className="land-cta group h-12 px-7 rounded-2xl text-sm font-bold text-[#04110d]">
                <span className="flex items-center gap-2">Get started free <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span>
              </button>
              <button onClick={goToAuth} className="land-ghost h-12 px-7 rounded-2xl text-sm font-semibold text-white">I already have an account</button>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-white/[0.06] py-8 px-4 text-center text-xs text-zinc-600">
        <span className="font-display font-bold text-zinc-400">Lex<span className="text-primary">Core</span></span>
        <span className="mx-2">·</span>Vocabulary, wired into your brain.
      </footer>
    </div>
  );
}
