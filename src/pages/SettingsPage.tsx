import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Brain, Calendar, Layers, ChevronUp, ChevronDown } from 'lucide-react';
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
  // Relative to 90% baseline — higher retention means shorter intervals = more reviews
  const factor = Math.log(retention) / Math.log(0.90);
  return Math.max(1, Math.round(base * 0.12 * factor));
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

          {/* Retention target */}
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-white/80">Retention Target</span>
              <div className="text-right">
                <span className="text-lg font-bold text-primary">{retentionPct}%</span>
                <span className="text-xs text-white/30 ml-2">~{dailyEst} reviews / 100 cards</span>
              </div>
            </div>
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
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    Math.abs(retention - p.value) < 0.005
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

          {/* Max interval */}
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-white/80">Max Interval</span>
              <span className="text-lg font-bold text-primary">
                {maxInterval >= 365 ? `${(maxInterval / 365).toFixed(maxInterval % 365 === 0 ? 0 : 1)} yr` : `${maxInterval} d`}
              </span>
            </div>
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
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    maxInterval === p.value
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

        {/* Daily limits section */}
        <motion.div variants={item} className="bg-white/[0.04] rounded-2xl ring-1 ring-white/[0.08] p-5">
          <SectionHeader icon={Layers} title="Daily Limits" subtitle="How many new words to introduce each day" />

          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-white/80">New Cards / Day</span>
              <p className="text-xs text-white/30 mt-1">
                {newCardsPerDay > 20
                  ? 'High load — expect heavy reviews in 2–3 weeks.'
                  : newCardsPerDay <= 5
                  ? 'Gentle pace — good for consolidation periods.'
                  : 'Steady pace — sustainable long-term.'}
              </p>
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
        </motion.div>

        {/* Schedule hint */}
        <motion.div variants={item} className="bg-white/[0.04] rounded-2xl ring-1 ring-white/[0.08] p-5">
          <SectionHeader icon={Calendar} title="When Changes Take Effect" subtitle="How settings affect your existing cards" />
          <p className="text-xs text-white/40 leading-relaxed">
            Retention and interval changes apply from your <span className="text-white/70">next review session</span> onward.
            Already-scheduled cards keep their current due dates; only future scheduling uses the new parameters.
            New cards / day takes effect immediately on the next session.
          </p>
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
