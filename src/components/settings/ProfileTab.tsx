import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Briefcase, Check, ChevronRight, Coffee, Flame, GraduationCap, KeyRound, Languages, LogOut, Mail, PenLine, Sparkles, Target, Trophy, UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useWords, useWordStats, useReviewSessions, useReviewEvents, useUserPreferences } from '@/hooks/useWords';
import { useDailyClears } from '@/hooks/useDailyClears';
import { clearStreaks } from '@/lib/daily-clears';
import { calculateStreak } from '@/lib/streak';
import { getIdentity } from '@/lib/identity';
import { memeToast } from '@/lib/meme-toast';

/** Profile fields live in the auth user's metadata, so no table is needed. */
export interface ProfileMeta {
  display_name?: string;
  avatar_color?: string;
  native_language?: string;
  goal?: string;
  target_band?: number;
}

const AVATAR_COLORS = [
  { id: 'mint', bg: 'linear-gradient(135deg,#00FFC8,#7dd3fc)', fg: '#04110d', glow: 'rgba(0,255,200,0.35)' },
  { id: 'violet', bg: 'linear-gradient(135deg,#c4b5fd,#7c3aed)', fg: '#fff', glow: 'rgba(124,58,237,0.45)' },
  { id: 'gold', bg: 'linear-gradient(135deg,#f6dc94,#c8922a)', fg: '#3a2606', glow: 'rgba(240,201,106,0.4)' },
  { id: 'rose', bg: 'linear-gradient(135deg,#fda4af,#e11d48)', fg: '#fff', glow: 'rgba(225,29,72,0.4)' },
  { id: 'sky', bg: 'linear-gradient(135deg,#bae6fd,#0284c7)', fg: '#04131d', glow: 'rgba(2,132,199,0.4)' },
  { id: 'ember', bg: 'linear-gradient(135deg,#fdba74,#ea580c)', fg: '#2a0f02', glow: 'rgba(234,88,12,0.4)' },
];

const GOALS = [
  { id: 'IELTS', icon: GraduationCap, hint: 'Band score' },
  { id: 'Academic', icon: BookOpen, hint: 'Papers & lectures' },
  { id: 'Work', icon: Briefcase, hint: 'Emails & meetings' },
  { id: 'Everyday', icon: Coffee, hint: 'Talk like a native' },
];
const BANDS = [6, 6.5, 7, 7.5, 8, 8.5, 9];

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

const display = { fontFamily: "'Space Grotesk', sans-serif" };

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">{children}</p>
);

export function ProfileTab() {
  const { user, signOut } = useAuth();
  const meta = (user?.user_metadata ?? {}) as ProfileMeta;
  const email = user?.email ?? '';

  const [name, setName] = useState(meta.display_name ?? '');
  const [color, setColor] = useState(meta.avatar_color ?? 'mint');
  const [nativeLang, setNativeLang] = useState(meta.native_language ?? '');
  const [goal, setGoal] = useState(meta.goal);
  const [band, setBand] = useState(meta.target_band);
  const [saving, setSaving] = useState(false);

  const [pwOpen, setPwOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  const reset = () => {
    setName(meta.display_name ?? '');
    setColor(meta.avatar_color ?? 'mint');
    setNativeLang(meta.native_language ?? '');
    setGoal(meta.goal);
    setBand(meta.target_band);
  };
  // Re-sync when the user object refreshes (e.g. after a save)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(reset, [user?.user_metadata]);

  const dirty =
    name.trim() !== (meta.display_name ?? '') ||
    color !== (meta.avatar_color ?? 'mint') ||
    nativeLang.trim() !== (meta.native_language ?? '') ||
    goal !== meta.goal ||
    (goal === 'IELTS' && band !== meta.target_band);

  /* ── Stats ─────────────────────────────────────────────────────── */
  const { data: words = [] } = useWords();
  const { data: wordStats = [] } = useWordStats();
  const { data: reviewSessions = [] } = useReviewSessions();
  const { data: reviewEvents = [] } = useReviewEvents();
  const { data: prefs } = useUserPreferences();
  const { data: clears = [] } = useDailyClears();

  const { streak } = useMemo(
    () => calculateStreak(
      [...reviewSessions.map(s => s.started_at), ...reviewEvents.map(e => e.reviewed_at)],
      prefs?.streak_recovery_date ?? null,
    ),
    [reviewSessions, reviewEvents, prefs?.streak_recovery_date],
  );
  const mastered = wordStats.filter(s => s.state === 2 && s.stability >= 21).length;
  const { best: bestRun } = useMemo(() => clearStreaks(clears.map(c => c.day)), [clears]);
  // Same rule as the dashboard: the title follows the current streak
  const identity = getIdentity(Math.max(1, streak));
  const daysToNext = identity.next ? identity.next.from - identity.daysIn : 0;
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : '—';

  const avatar = AVATAR_COLORS.find(c => c.id === color) ?? AVATAR_COLORS[0];
  const shownName = name.trim();
  const nameRef = useRef<HTMLInputElement>(null);
  const focusName = () => {
    nameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => nameRef.current?.focus({ preventScroll: true }), 350);
  };

  const handleSave = async () => {
    setSaving(true);
    const data: ProfileMeta = {
      display_name: name.trim(),
      avatar_color: color,
      native_language: nativeLang.trim(),
      goal,
      target_band: goal === 'IELTS' ? band : undefined,
    };
    const { error } = await supabase.auth.updateUser({ data });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success('Profile saved');
  };

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error('Use at least 6 characters');
    if (password !== confirm) return toast.error("Passwords don't match");
    setChangingPw(true);
    const { error } = await supabase.auth.updateUser({ password });
    setChangingPw(false);
    if (error) return toast.error(error.message);
    setPassword('');
    setConfirm('');
    setPwOpen(false);
    toast.success('Password updated');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      memeToast.signOut();
    } catch {
      toast.error('Failed to sign out');
    }
  };

  const stats = [
    { icon: Flame, label: 'Day streak', value: streak, color: '#f97316' },
    { icon: Sparkles, label: 'Words', value: words.length, color: '#00FFC8' },
    { icon: Target, label: 'Mastered', value: mastered, color: '#7dd3fc' },
    { icon: Trophy, label: 'Trophies', value: clears.length, color: '#f0c96a' },
    { icon: Check, label: 'Best run', value: bestRun, color: '#c4b5fd' },
  ];

  const goalMeta = GOALS.find(g => g.id === goal);
  const tags = [
    goalMeta && { icon: goalMeta.icon, text: goal === 'IELTS' && band ? `IELTS · Band ${band.toFixed(1)}` : goalMeta.id },
    nativeLang.trim() && { icon: Languages, text: nativeLang.trim() },
  ].filter(Boolean) as { icon: typeof Flame; text: string }[];

  return (
    <div className="space-y-5 pb-20">
      <style>{`
        .pf-shell {
          background:
            radial-gradient(ellipse 70% 80% at 100% 0%, rgba(240,201,106,0.13) 0%, transparent 55%),
            radial-gradient(ellipse 70% 70% at 0% 100%, rgba(124,58,237,0.16) 0%, transparent 60%),
            linear-gradient(135deg, #0b0a10 0%, #07060a 55%, #0d0a07 100%);
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 24px 64px rgba(0,0,0,0.45);
        }
        .pf-card {
          background: linear-gradient(180deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.015) 100%), #0a090d;
          border: 1px solid rgba(255,255,255,0.07);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 16px 48px rgba(0,0,0,0.35);
        }
        .pf-gold { background: linear-gradient(120deg,#c8922a 0%,#f0c96a 55%,#c08828 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
        .pf-input {
          width: 100%; height: 46px; padding: 0 14px; border-radius: 14px; font-size: 14px; color: #fff;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
          transition: border-color .15s, box-shadow .15s, background .15s;
        }
        .pf-input::placeholder { color: #52525b; }
        .pf-input:focus { outline: none; background: rgba(0,255,200,0.03); border-color: rgba(0,255,200,0.45); box-shadow: 0 0 0 4px rgba(0,255,200,0.08); }
        @keyframes pf-spin { to { transform: rotate(360deg); } }
        .pf-orbit { border: 1px dashed rgba(240,201,106,0.2); animation: pf-spin 60s linear infinite; }
        .pf-orbit-2 { border-color: rgba(0,255,200,0.14); animation-duration: 40s; animation-direction: reverse; }
        @media (prefers-reduced-motion: reduce) { .pf-orbit { animation: none; } }
      `}</style>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <motion.section variants={item} className="pf-shell relative overflow-hidden rounded-[2rem]">
        <div className="relative grid md:grid-cols-[1fr_220px] items-center gap-6 p-6 sm:p-8">
          <div className="min-w-0">
            <div className="flex items-center gap-5">
              <motion.div
                key={color}
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                className="grid h-20 w-20 sm:h-24 sm:w-24 shrink-0 place-items-center rounded-[1.6rem] text-2xl sm:text-3xl font-bold"
                style={{ ...display, background: avatar.bg, color: avatar.fg, boxShadow: `0 12px 40px ${avatar.glow}, inset 0 1px 0 rgba(255,255,255,0.4)` }}
              >
                {initials(name) || <UserRound className="h-9 w-9" strokeWidth={1.75} />}
              </motion.div>
              <div className="min-w-0">
                <Label>Profile</Label>
                {shownName ? (
                  <h2 className="mt-1 truncate text-2xl sm:text-[2rem] font-bold leading-tight text-white" style={display}>{shownName}</h2>
                ) : (
                  <button type="button" onClick={focusName}
                    className="mt-1 flex items-center gap-2 text-2xl sm:text-[2rem] font-bold leading-tight text-zinc-600 hover:text-zinc-400 transition-colors" style={display}>
                    Add your name <PenLine className="h-5 w-5" />
                  </button>
                )}
                <p className="mt-1 text-sm">
                  <span className="pf-gold font-semibold">{identity.current.name}</span>
                  <span className="text-zinc-600"> · </span>
                  <span className="text-zinc-500">since {memberSince}</span>
                </p>
              </div>
            </div>

            {tags.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {tags.map(t => (
                  <span key={t.text} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-zinc-300 bg-white/[0.04] ring-1 ring-inset ring-white/[0.09]">
                    <t.icon className="h-3.5 w-3.5 text-[#00FFC8]" /> {t.text}
                  </span>
                ))}
              </div>
            )}

            {/* Journey to next title */}
            <div className="mt-6 max-w-md">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-zinc-400">{identity.next ? <>Next title: <span className="font-semibold text-white">{identity.next.name}</span></> : 'Highest title reached'}</span>
                {identity.next && <span className="tabular-nums text-zinc-500">{daysToNext} day{daysToNext === 1 ? '' : 's'} to go</span>}
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg,#c8922a,#f0c96a)', boxShadow: '0 0 10px rgba(210,155,50,0.45)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round(identity.progress * 100)}%` }}
                  transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </div>
          </div>

          {/* Title on its pedestal */}
          <div className="relative hidden md:grid h-[220px] w-[220px] place-items-center">
            <div className="pf-orbit absolute inset-0 rounded-full" aria-hidden />
            <div className="pf-orbit pf-orbit-2 absolute inset-[14%] rounded-full" aria-hidden />
            <div className="absolute bottom-5 h-10 w-36 rounded-[50%]" style={{ background: 'radial-gradient(ellipse, rgba(240,201,106,0.4) 0%, transparent 70%)', filter: 'blur(4px)' }} aria-hidden />
            <img src={identity.current.image} alt={identity.current.name} className="relative h-[160px] w-auto object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.6)]" />
          </div>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-5 divide-x divide-white/[0.06] border-t border-white/[0.06]">
          {stats.map(s => (
            <div key={s.label} className="px-2 sm:px-5 py-4 sm:py-5 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] text-zinc-500">
                <s.icon className="h-3.5 w-3.5 shrink-0" style={{ color: s.color }} />
                <span className="whitespace-nowrap">{s.label}</span>
              </div>
              <p className="mt-1 text-xl sm:text-2xl font-bold tabular-nums text-white" style={display}>{s.value}</p>
            </div>
          ))}
        </div>
      </motion.section>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr] items-start">
        {/* ── About you ──────────────────────────────────────────── */}
        <motion.section variants={item} className="pf-card rounded-[1.75rem] p-6 sm:p-7 space-y-7">
          <div>
            <h3 className="text-lg font-bold text-white" style={display}>About you</h3>
            <p className="mt-0.5 text-sm text-zinc-500">How LexCore knows you and what you're aiming for.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block space-y-2">
              <Label>Display name</Label>
              <input ref={nameRef} className="pf-input" value={name} maxLength={40} autoComplete="name" placeholder="Your name" onChange={e => setName(e.target.value)} />
            </label>
            <label className="block space-y-2">
              <Label>Native language</Label>
              <input className="pf-input" value={nativeLang} maxLength={40} placeholder="e.g. Bengali" onChange={e => setNativeLang(e.target.value)} />
            </label>
          </div>

          <div className="space-y-3">
            <Label>Avatar</Label>
            <div className="flex flex-wrap gap-3">
              {AVATAR_COLORS.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.id)}
                  aria-label={`${c.id} avatar`}
                  aria-pressed={color === c.id}
                  className="relative grid h-10 w-10 place-items-center rounded-xl transition-transform hover:scale-110"
                  style={{ background: c.bg, boxShadow: color === c.id ? `0 0 0 2px #07060a, 0 0 0 4px rgba(255,255,255,0.85), 0 6px 20px ${c.glow}` : undefined }}
                >
                  {color === c.id && <Check className="h-4 w-4" style={{ color: c.fg }} strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Learning goal</Label>
            <div className="grid grid-cols-2 gap-2.5">
              {GOALS.map(g => {
                const on = goal === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGoal(on ? undefined : g.id)}
                    aria-pressed={on}
                    className="flex items-center gap-3 rounded-2xl p-3.5 text-left transition-colors"
                    style={on
                      ? { background: 'rgba(0,255,200,0.06)', border: '1px solid rgba(0,255,200,0.4)', boxShadow: '0 0 24px rgba(0,255,200,0.08)' }
                      : { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: on ? 'rgba(0,255,200,0.12)' : 'rgba(255,255,255,0.04)' }}>
                      <g.icon className="h-4 w-4" style={{ color: on ? '#00FFC8' : '#a1a1aa' }} />
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-sm font-semibold ${on ? 'text-white' : 'text-zinc-300'}`}>{g.id}</span>
                      <span className="block truncate text-[11px] text-zinc-500">{g.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <AnimatePresence initial={false}>
              {goal === 'IELTS' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="pt-3 space-y-3">
                    <Label>Target band</Label>
                    <div className="grid grid-cols-7 gap-1.5">
                      {BANDS.map(b => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setBand(b)}
                          className={`h-10 rounded-xl text-sm font-bold tabular-nums transition-colors ${band === b ? 'text-[#04110d]' : 'text-zinc-400 hover:text-white bg-white/[0.03] ring-1 ring-inset ring-white/[0.07]'}`}
                          style={band === b ? { background: '#00FFC8', boxShadow: '0 6px 20px rgba(0,255,200,0.3)' } : undefined}
                        >
                          {b.toFixed(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.section>

        {/* ── Account ────────────────────────────────────────────── */}
        <motion.section variants={item} className="pf-card rounded-[1.75rem] p-2">
          <div className="px-5 pt-5 pb-3">
            <h3 className="text-lg font-bold text-white" style={display}>Account</h3>
          </div>

          <div className="flex items-center gap-3 rounded-2xl px-4 py-3.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.04]"><Mail className="h-4 w-4 text-zinc-400" /></span>
            <span className="min-w-0">
              <span className="block text-[11px] text-zinc-500">Email</span>
              <span className="block truncate text-sm text-white">{email}</span>
            </span>
          </div>

          <div className="rounded-2xl transition-colors" style={pwOpen ? { background: 'rgba(255,255,255,0.025)' } : undefined}>
            <button type="button" onClick={() => setPwOpen(v => !v)} aria-expanded={pwOpen}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left hover:bg-white/[0.03] transition-colors">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.04]"><KeyRound className="h-4 w-4 text-zinc-400" /></span>
              <span className="flex-1 text-sm text-white">Change password</span>
              <ChevronRight className={`h-4 w-4 text-zinc-600 transition-transform ${pwOpen ? 'rotate-90' : ''}`} />
            </button>
            <AnimatePresence initial={false}>
              {pwOpen && (
                <motion.form
                  onSubmit={handlePassword}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2.5 px-4 pb-4">
                    <input className="pf-input" type="password" autoComplete="new-password" placeholder="New password" value={password} onChange={e => setPassword(e.target.value)} />
                    <input className="pf-input" type="password" autoComplete="new-password" placeholder="Confirm new password" value={confirm} onChange={e => setConfirm(e.target.value)} />
                    <button type="submit" disabled={!password || !confirm || changingPw}
                      className="w-full h-11 rounded-xl text-sm font-bold text-[#04110d] bg-[#00FFC8] hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity">
                      {changingPw ? 'Updating…' : 'Update password'}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          <div className="mx-4 my-1 h-px bg-white/[0.06]" />

          <button type="button" onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left hover:bg-red-500/[0.06] transition-colors">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-red-500/[0.08]"><LogOut className="h-4 w-4 text-red-400" /></span>
            <span className="flex-1 text-sm font-medium text-red-400">Sign out</span>
          </button>
        </motion.section>
      </div>

      {/* ── Floating save bar: only while there are unsaved edits ── */}
      <AnimatePresence>
        {dirty && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 flex items-center gap-2 rounded-2xl p-2 pl-5 bg-[#0d0c12]/90 backdrop-blur-2xl ring-1 ring-white/[0.1] shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
          >
            <span className="mr-2 whitespace-nowrap text-sm text-zinc-300">Unsaved changes</span>
            <button type="button" onClick={reset} className="h-10 px-4 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors">
              Discard
            </button>
            <button type="button" onClick={handleSave} disabled={saving}
              className="h-10 px-5 rounded-xl text-sm font-bold text-[#04110d] bg-[#00FFC8] shadow-[0_6px_20px_rgba(0,255,200,0.3)] hover:opacity-90 disabled:opacity-60 transition-opacity">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
