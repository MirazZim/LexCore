import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { dateKey } from '@/lib/streak';
import type { DailyClear } from '@/lib/daily-clears';

// Month view of the trophy shelf: a gold trophy on every cleared day, a gold
// band joining back-to-back clears, and a faint dot on days studied without
// clearing. Relies on the page's .ach-card / .section-label styles.

const GOLD = '#f0c96a';
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface TrophyCalendarProps {
  clears: DailyClear[];
  // Local YYYY-MM-DD keys of days with any review activity
  studiedDays: Set<string>;
  onSelect: (day: string) => void;
}

const monthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);

export function TrophyCalendar({ clears, studiedDays, onSelect }: TrophyCalendarProps) {
  const byDay = useMemo(() => new Map(clears.map(c => [c.day, c])), [clears]);
  const today = new Date();
  const todayKey = dateKey(today);

  // Navigable from the first month with any activity up to this month
  const earliest = useMemo(() => {
    const keys = [...byDay.keys(), ...studiedDays].sort();
    return keys.length > 0 ? monthStart(new Date(`${keys[0]}T00:00:00`)) : monthStart(today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byDay, studiedDays]);
  const [offset, setOffset] = useState(0); // months back from the current one
  const shown = new Date(today.getFullYear(), today.getMonth() - offset, 1);
  const canGoBack = shown > earliest;

  const cells = useMemo(() => {
    const year = shown.getFullYear();
    const month = shown.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const lead = new Date(year, month, 1).getDay();
    const out: (null | { day: number; key: string; col: number })[] = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= days; d++) {
      const date = new Date(year, month, d);
      out.push({ day: d, key: dateKey(date), col: date.getDay() });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown.getFullYear(), shown.getMonth()]);

  const monthTrophies = cells.filter(c => c && byDay.has(c.key)).length;
  const neighbour = (key: string, delta: number) => {
    const d = new Date(`${key}T00:00:00`);
    d.setDate(d.getDate() + delta);
    return dateKey(d);
  };

  return (
    <div className="ach-card rounded-[1.5rem] p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: 'rgba(240,201,106,0.1)' }}>
          <Trophy className="h-3.5 w-3.5" style={{ color: GOLD }} />
        </div>
        <div className="min-w-0">
          <p className="section-label">Trophy calendar</p>
          <p className="text-white font-bold mt-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {shown.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
            <span className="ml-2 text-xs font-semibold" style={{ color: monthTrophies > 0 ? '#c8922a' : '#52525b' }}>
              {monthTrophies} troph{monthTrophies === 1 ? 'y' : 'ies'}
            </span>
          </p>
        </div>
        <div className="ml-auto flex gap-1.5">
          <button
            type="button"
            onClick={() => setOffset(o => o + 1)}
            disabled={!canGoBack}
            aria-label="Previous month"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-400 border border-white/10 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-25 disabled:pointer-events-none"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setOffset(o => Math.max(0, o - 1))}
            disabled={offset === 0}
            aria-label="Next month"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-400 border border-white/10 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-25 disabled:pointer-events-none"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-2">
        {WEEKDAYS.map((w, i) => (
          <p key={i} className="text-center text-[10px] font-bold text-zinc-600">{w}</p>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${shown.getFullYear()}-${shown.getMonth()}`}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2 }}
          className="grid grid-cols-7 gap-y-1.5"
        >
          {cells.map((c, i) => {
            if (!c) return <div key={`pad-${i}`} />;
            const clear = byDay.get(c.key);
            const isToday = c.key === todayKey;
            const isFuture = c.key > todayKey;
            const studied = !clear && studiedDays.has(c.key);
            // Gold band joins back-to-back clears within the same week row
            const joinLeft = !!clear && c.col > 0 && byDay.has(neighbour(c.key, -1));
            const joinRight = !!clear && c.col < 6 && byDay.has(neighbour(c.key, 1));

            const cell = (
              <div className="relative h-11 flex items-center justify-center">
                {(joinLeft || joinRight) && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-7"
                    style={{
                      left: joinLeft ? 0 : '50%',
                      right: joinRight ? 0 : '50%',
                      background: 'linear-gradient(90deg, rgba(200,146,42,0.28), rgba(240,201,106,0.28))',
                    }}
                    aria-hidden
                  />
                )}
                {clear ? (
                  <button
                    type="button"
                    onClick={() => onSelect(c.key)}
                    className="relative w-10 h-10 rounded-xl flex flex-col items-center justify-center transition-transform hover:scale-110"
                    style={{
                      background: 'radial-gradient(circle at 50% 35%, rgba(240,201,106,0.35), rgba(200,146,42,0.12) 70%)',
                      border: `1px solid rgba(240,201,106,${isToday ? 0.9 : 0.45})`,
                      boxShadow: '0 0 14px rgba(240,201,106,0.25)',
                    }}
                    aria-label={`Trophy on ${c.key}`}
                  >
                    <Trophy className="h-3.5 w-3.5" style={{ color: GOLD, filter: 'drop-shadow(0 0 4px rgba(240,201,106,0.6))' }} />
                    <span className="text-[9px] font-bold tabular-nums leading-none mt-0.5 text-[#fff3c4]">{c.day}</span>
                  </button>
                ) : (
                  <div
                    className="relative w-10 h-10 rounded-xl flex flex-col items-center justify-center"
                    style={isToday ? { border: '1px dashed rgba(240,201,106,0.5)' } : undefined}
                  >
                    <span className={`text-xs tabular-nums ${isFuture ? 'text-zinc-700' : isToday ? 'text-[#f0c96a] font-bold' : 'text-zinc-400'}`}>
                      {c.day}
                    </span>
                    {studied && <span className="w-1 h-1 rounded-full mt-1 bg-zinc-500" />}
                  </div>
                )}
              </div>
            );

            return clear ? (
              <Tooltip key={c.key}>
                <TooltipTrigger asChild>{cell}</TooltipTrigger>
                <TooltipContent>
                  {new Date(`${c.key}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  {' · '}{clear.words_cleared} words · {clear.accuracy}% accuracy
                </TooltipContent>
              </Tooltip>
            ) : (
              <div key={c.key}>{cell}</div>
            );
          })}
        </motion.div>
      </AnimatePresence>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-5 text-[11px] text-zinc-500">
        <span className="inline-flex items-center gap-1.5"><Trophy className="h-3 w-3" style={{ color: GOLD }} /> Day cleared</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-5 h-2 rounded-full" style={{ background: 'rgba(240,201,106,0.3)' }} /> Run of clears
        </span>
        <span className="inline-flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-zinc-500" /> Studied, not cleared</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-[4px]" style={{ border: '1px dashed rgba(240,201,106,0.5)' }} /> Today
        </span>
      </div>
    </div>
  );
}
