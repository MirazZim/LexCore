import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Brain, Layers, ChevronUp, ChevronDown, HelpCircle, ChevronDown as ExpandIcon } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { useUserPreferences, useUpdateUserPreferences } from '@/hooks/useWords';
import { toast } from 'sonner';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

const RETENTION_PRESETS = [
  { label: 'Relaxed', value: 0.80 },
  { label: 'Standard', value: 0.90 },
  { label: 'Focused', value: 0.95 },
];

const INTERVAL_PRESETS = [
  { label: '3 mo', value: 90 },
  { label: '6 mo', value: 180 },
  { label: '1 yr', value: 365 },
  { label: '2 yr', value: 730 },
];

function estimateDailyReviews(retention: number, base = 100): number {
  const factor = Math.log(retention) / Math.log(0.90);
  return Math.max(1, Math.round(base * 0.12 * factor));
}

function HowItWorksToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-1 text-xs font-medium text-orange-700 hover:text-primary transition-colors"
    >
      <HelpCircle className="w-3 h-3" />
      How it works
      <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
        <ExpandIcon className="w-3 h-3" />
      </motion.span>
    </button>
  );
}

function HelpRow({ children, icon }: { children: React.ReactNode; icon: string }) {
  return (
    <div className="flex gap-2.5">
      <span className="text-base shrink-0 mt-0.5">{icon}</span>
      <p className="text-xs text-white/50 leading-relaxed">{children}</p>
    </div>
  );
}

function HelpExample({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-primary/5 border border-primary/15 rounded-xl p-3 space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-primary/50">Example</p>
      {children}
    </div>
  );
}

function HelpPanel({ children }: { children: React.ReactNode }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="overflow-hidden"
      >
        <div className="mt-4 bg-white/[0.03] rounded-xl ring-1 ring-white/[0.07] p-4 space-y-3">
          {children}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 ring-1 ring-primary/20 shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <p className="text-xs text-white/40 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { data: prefs, isLoading } = useUserPreferences();
  const updatePrefs = useUpdateUserPreferences();

  const [retention, setRetention] = useState(0.90);
  const [maxInterval, setMaxInterval] = useState(365);
  const [newCardsPerDay, setNewCardsPerDay] = useState(10);
  const [dirty, setDirty] = useState(false);

  const [showRetentionHelp, setShowRetentionHelp] = useState(false);
  const [showIntervalHelp, setShowIntervalHelp] = useState(false);
  const [showNewCardsHelp, setShowNewCardsHelp] = useState(false);

  useEffect(() => {
    if (prefs) {
      setRetention(prefs.request_retention);
      setMaxInterval(prefs.maximum_interval);
      setNewCardsPerDay(prefs.new_cards_per_day);
      setDirty(false);
    }
  }, [prefs]);

  const handleSave = () => {
    updatePrefs.mutate(
      { request_retention: retention, maximum_interval: maxInterval, new_cards_per_day: newCardsPerDay },
      {
        onSuccess: () => { toast.success('Settings saved'); setDirty(false); },
        onError: () => toast.error('Failed to save settings'),
      }
    );
  };

  const retentionPct = Math.round(retention * 100);
  const dailyEst = estimateDailyReviews(retention);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <motion.div
        className="max-w-lg mx-auto px-4 pt-24 pb-16 space-y-6"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Header */}
        <motion.div variants={item} className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Settings</h1>
            <p className="text-xs text-white/40">Tune your learning algorithm</p>
          </div>
        </motion.div>

        {/* Algorithm section */}
        <motion.div variants={item} className="bg-white/[0.04] rounded-2xl ring-1 ring-white/[0.08] p-5 space-y-8">
          <SectionHeader icon={Brain} title="Algorithm" subtitle="Controls how FSRS schedules your reviews" />

          {/* ── Retention Target ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white/80">Retention Target</span>
              <div className="flex items-center gap-3">
                <HowItWorksToggle open={showRetentionHelp} onToggle={() => setShowRetentionHelp(v => !v)} />
                <div className="text-right">
                  <span className="text-lg font-bold text-primary">{retentionPct}%</span>
                  <span className="text-xs text-white/30 ml-2">~{dailyEst} / 100 cards</span>
                </div>
              </div>
            </div>

            {showRetentionHelp && (
              <HelpPanel>
                <HelpRow icon="🧠">
                  Imagine you have <strong className="text-white/80">10 vocabulary words</strong> to remember. The Retention Target tells the app: <strong className="text-white/80">"how many of those 10 should I still know when it tests me?"</strong>
                </HelpRow>
                <HelpExample>
                  <p className="text-xs text-white/60">
                    <span className="text-primary font-semibold">80%</span> — You remember <strong>8 out of 10</strong> words. The app reviews less often. Easy schedule, but 2 words might slip away.
                  </p>
                  <p className="text-xs text-white/60">
                    <span className="text-primary font-semibold">90%</span> — You remember <strong>9 out of 10</strong>. This is the sweet spot. Balanced reviews, solid memory.
                  </p>
                  <p className="text-xs text-white/60">
                    <span className="text-primary font-semibold">95%</span> — You remember <strong>almost all 10</strong>. The app checks in very frequently. Near-perfect, but more work.
                  </p>
                </HelpExample>
                <HelpRow icon="💡">
                  Higher % = the app reminds you more often = you forget less. Lower % = fewer reminders = lighter workload, but some words will fade. <strong className="text-white/70">Most people do great at 90%.</strong>
                </HelpRow>
              </HelpPanel>
            )}

            <Slider
              min={70} max={97} step={1}
              value={[retentionPct]}
              onValueChange={([v]) => { setRetention(v / 100); setDirty(true); }}
              className="w-full"
            />
            <div className="flex gap-2 pt-1">
              {RETENTION_PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => { setRetention(p.value); setDirty(true); }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${Math.abs(retention - p.value) < 0.005
                    ? 'bg-primary text-zinc-900'
                    : 'bg-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.10]'
                    }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-white/30 leading-relaxed">
              {retention >= 0.95
                ? 'High retention — cards revisited frequently for near-perfect recall.'
                : retention >= 0.88
                  ? 'Balanced — solid recall with a manageable review load.'
                  : 'Light load — expect some forgetting between sessions.'}
            </p>
          </div>

          {/* ── Max Interval ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white/80">Max Interval</span>
              <div className="flex items-center gap-3">
                <HowItWorksToggle open={showIntervalHelp} onToggle={() => setShowIntervalHelp(v => !v)} />
                <span className="text-lg font-bold text-primary">
                  {maxInterval >= 365 ? `${(maxInterval / 365).toFixed(maxInterval % 365 === 0 ? 0 : 1)} yr` : `${maxInterval} d`}
                </span>
              </div>
            </div>

            {showIntervalHelp && (
              <HelpPanel>
                <HelpRow icon="📅">
                  Every time you get a word right, the app waits <strong className="text-white/80">longer and longer</strong> before showing it again — because your memory is getting stronger. The Max Interval is the <strong className="text-white/80">longest gap it will ever create.</strong>
                </HelpRow>
                <HelpExample>
                  <p className="text-xs text-white/60">
                    You've mastered the word <span className="text-primary font-semibold">"enormous"</span>. Without a limit, the app might say <em>"see you in 10 years!"</em>
                  </p>
                  <p className="text-xs text-white/60 mt-1">
                    <span className="text-primary font-semibold">3 months</span> → Even perfect words come back every 3 months. Nothing gets rusty.
                  </p>
                  <p className="text-xs text-white/60">
                    <span className="text-primary font-semibold">1 year</span> → Like a yearly health check for your vocabulary. Light and easy.
                  </p>
                  <p className="text-xs text-white/60">
                    <span className="text-primary font-semibold">2 years</span> → Rock-solid words almost disappear from your queue. Very low maintenance.
                  </p>
                </HelpExample>
                <HelpRow icon="💡">
                  Shorter max interval = words come back more often, nothing gets forgotten. Longer = fewer reviews, but you're trusting your long-term memory more. <strong className="text-white/70">1 year is a great default.</strong>
                </HelpRow>
              </HelpPanel>
            )}

            <Slider
              min={30} max={730} step={10}
              value={[maxInterval]}
              onValueChange={([v]) => { setMaxInterval(v); setDirty(true); }}
              className="w-full"
            />
            <div className="flex gap-2 pt-1">
              {INTERVAL_PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => { setMaxInterval(p.value); setDirty(true); }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${maxInterval === p.value
                    ? 'bg-primary text-zinc-900'
                    : 'bg-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.10]'
                    }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-white/30">
              Well-learned words won't be scheduled further out than this.
            </p>
          </div>
        </motion.div>

        {/* Daily Limits section */}
        <motion.div variants={item} className="bg-white/[0.04] rounded-2xl ring-1 ring-white/[0.08] p-5">
          <SectionHeader icon={Layers} title="Daily Limits" subtitle="How many new words to introduce each day" />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-sm font-medium text-white/80">New Cards / Day</span>
                <div>
                  <HowItWorksToggle open={showNewCardsHelp} onToggle={() => setShowNewCardsHelp(v => !v)} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setNewCardsPerDay(v => Math.max(1, v - 1)); setDirty(true); }}
                  className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white/60 hover:text-white transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <span className="text-2xl font-bold text-primary w-10 text-center tabular-nums">{newCardsPerDay}</span>
                <button
                  onClick={() => { setNewCardsPerDay(v => Math.min(30, v + 1)); setDirty(true); }}
                  className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white/60 hover:text-white transition-colors"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
              </div>
            </div>

            {showNewCardsHelp && (
              <HelpPanel>
                <HelpRow icon="🃏">
                  Think of your vocabulary as a deck of cards. Every day, the app pulls <strong className="text-white/80">this many brand-new cards</strong> from the deck and introduces them to you for the very first time.
                </HelpRow>
                <HelpExample>
                  <p className="text-xs text-white/60">
                    <span className="text-primary font-semibold">5 / day</span> → 35 new words per week. After 1 month: ~150 new words. Very manageable, great for busy people.
                  </p>
                  <p className="text-xs text-white/60">
                    <span className="text-primary font-semibold">10 / day</span> → 70 new words per week. A popular, solid pace for serious learners.
                  </p>
                  <p className="text-xs text-white/60">
                    <span className="text-primary font-semibold">20 / day</span> → 140 new words per week. Intense! Your review sessions will get much longer within 2–3 weeks.
                  </p>
                </HelpExample>
                <HelpRow icon="⚠️">
                  New words need a lot of practice early on — so the more you add today, the more reviews pile up later. <strong className="text-white/70">Start small and increase when it feels easy.</strong>
                </HelpRow>
              </HelpPanel>
            )}

            <p className="text-xs text-white/30">
              {newCardsPerDay > 20
                ? 'High load — expect heavy reviews in 2–3 weeks.'
                : newCardsPerDay <= 5
                  ? 'Gentle pace — good for consolidation periods.'
                  : 'Steady pace — sustainable long-term.'}
            </p>
          </div>
        </motion.div>

        {/* Save */}
        <motion.div variants={item}>
          <Button
            onClick={handleSave}
            disabled={!dirty || updatePrefs.isPending}
            className="w-full h-12 font-semibold text-sm rounded-2xl bg-primary text-zinc-900 hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {updatePrefs.isPending ? 'Saving…' : dirty ? 'Save Settings' : 'No Changes'}
          </Button>
        </motion.div>
      </motion.div>
    </AppLayout>
  );
}
