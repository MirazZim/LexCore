import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Check, X, MapPin } from 'lucide-react';

const IDENTITIES = [
  { id: 'apprentice',    title: 'Apprentice',    dayStart: 1,   dayEnd: 7,   image: '/Apprentice.webp'      },
  { id: 'scribe',        title: 'Scribe',        dayStart: 8,   dayEnd: 20,  image: '/Scribe.webp'          },
  { id: 'scholar',       title: 'Scholar',       dayStart: 21,  dayEnd: 45,  image: '/Scholar.webp'         },
  { id: 'rhetorician',   title: 'Rhetorician',   dayStart: 46,  dayEnd: 75,  image: '/Rhetorician%20.webp'  },
  { id: 'lexicographer', title: 'Lexicographer', dayStart: 76,  dayEnd: 120, image: '/Lexicographer.webp'   },
  { id: 'philologist',   title: 'Philologist',   dayStart: 121, dayEnd: 200, image: '/Philologist.webp'     },
  { id: 'etymologist',   title: 'Etymologist',   dayStart: 201, dayEnd: 365, image: '/Etymologist.webp'     },
  { id: 'polymath',      title: 'Polymath',      dayStart: 366, dayEnd: null,image: '/Polymath.webp'        },
] as const;

interface Props {
  currentDay: number;
  onClose: () => void;
}

type Status = 'past' | 'current' | 'locked';

function getStatus(currentDay: number, dayStart: number, dayEnd: number | null): Status {
  if (dayEnd !== null && currentDay > dayEnd) return 'past';
  if (dayStart <= currentDay) return 'current';
  return 'locked';
}

const DASHED_GOLD = 'repeating-linear-gradient(to bottom,rgba(180,140,55,0.5) 0px,rgba(180,140,55,0.5) 5px,transparent 5px,transparent 11px)';
const DASHED_DIM  = 'repeating-linear-gradient(to bottom,rgba(255,255,255,0.1) 0px,rgba(255,255,255,0.1) 5px,transparent 5px,transparent 11px)';
const SOLID_MINT  = 'rgba(0,255,200,0.35)';

export function IdentityJourneyMap({ currentDay, onClose }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [shakingId,  setShakingId]  = useState<string | null>(null);
  const currentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() =>
      currentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 540);
    return () => clearTimeout(t);
  }, []);

  const shake = (id: string) => {
    setShakingId(id);
    setTimeout(() => setShakingId(null), 620);
  };

  const toggle = (id: string) =>
    setExpandedId(prev => (prev === id ? null : id));

  const currentTitle = IDENTITIES.find(
    i => getStatus(currentDay, i.dayStart, i.dayEnd) === 'current',
  )?.title ?? 'Polymath';

  return (
    <motion.div
      className="fixed inset-0 z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
      style={{ background: 'rgba(4,3,8,0.97)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
    >
      {/* Stop backdrop clicks from propagating through content */}
      <div className="flex flex-col h-full" onClick={e => e.stopPropagation()}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-6 py-5 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div>
            <h2
              className="text-white font-bold text-lg"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Identity Journey
            </h2>
            <p className="text-zinc-500 text-xs mt-0.5">
              Day {currentDay} · {currentTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
            style={{ border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        {/* ── Scroll area ────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-sm mx-auto px-4 py-10 relative">

            {/* Animated vertical timeline line */}
            <motion.div
              className="absolute"
              style={{
                left: '2rem',
                top: '2.5rem',
                bottom: '2.5rem',
                width: 1,
                zIndex: 0,
                background: DASHED_GOLD,
                transformOrigin: 'top',
              }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            />

            <div className="space-y-7 relative" style={{ zIndex: 1 }}>
              {IDENTITIES.map((identity, index) => {
                const status     = getStatus(currentDay, identity.dayStart, identity.dayEnd);
                const isPast     = status === 'past';
                const isCurrent  = status === 'current';
                const isLocked   = status === 'locked';
                const isExpanded = expandedId === identity.id;
                const isShaking  = shakingId  === identity.id;

                const nextIdentity = index < IDENTITIES.length - 1 ? IDENTITIES[index + 1] : null;
                const daysToNext   = nextIdentity ? nextIdentity.dayStart - currentDay : 0;
                const progress     = isCurrent && identity.dayEnd != null
                  ? Math.min((currentDay - identity.dayStart) / (identity.dayEnd - identity.dayStart + 1), 1)
                  : 0;

                // Timeline node appearance
                const nodeStyle: React.CSSProperties = isPast
                  ? { background: 'rgba(0,255,200,0.15)', border: '1.5px solid #00FFC8', boxShadow: '0 0 8px rgba(0,255,200,0.45)' }
                  : isCurrent
                  ? { background: 'linear-gradient(135deg,#c8922a,#f0c96a)', border: '2px solid rgba(255,210,100,0.5)' }
                  : { background: '#1a1a1e', border: '2px solid #2e2e34' };

                // Connector line between this node and next
                const connectorBg = isPast ? SOLID_MINT : isCurrent ? DASHED_GOLD : DASHED_DIM;

                return (
                  <div
                    key={identity.id}
                    ref={isCurrent ? currentRef : undefined}
                  >
                    <motion.div
                      className="flex gap-3 items-start"
                      initial={{ opacity: 0, y: 40 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 + index * 0.08 }}
                    >
                      {/* ── Timeline column ──────────────────────────── */}
                      <div
                        className="flex flex-col items-center shrink-0"
                        style={{ width: '2rem', paddingTop: '1.1rem', zIndex: 2 }}
                      >
                        {/* Node */}
                        {isCurrent ? (
                          <motion.div
                            className="w-4 h-4 rounded-full shrink-0"
                            style={nodeStyle}
                            animate={{ boxShadow: ['0 0 6px rgba(240,201,106,0.5)','0 0 20px rgba(240,201,106,0.9)','0 0 6px rgba(240,201,106,0.5)'] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                        ) : (
                          <div
                            className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center"
                            style={nodeStyle}
                          >
                            {isPast && <Check className="w-2.5 h-2.5" style={{ color: '#00FFC8' }} strokeWidth={3} />}
                          </div>
                        )}

                        {/* Connector to next card */}
                        {index < IDENTITIES.length - 1 && (
                          <div className="flex-1 mt-1" style={{ width: 1, minHeight: '2rem', background: connectorBg }} />
                        )}
                      </div>

                      {/* ── Card ─────────────────────────────────────── */}
                      <div className="flex-1 pb-0">
                        <motion.div
                          animate={isShaking
                            ? { x: [0,-11,11,-8,8,-4,4,0], transition: { duration: 0.5 } }
                            : { x: 0, transition: { duration: 0 } }}
                          onClick={() => {
                            if (isLocked)           shake(identity.id);
                            else if (isPast || isCurrent) toggle(identity.id);
                          }}
                          className="rounded-2xl overflow-hidden"
                          style={{
                            cursor: 'pointer',
                            transform: isCurrent ? 'scale(1.02)' : 'scale(1)',
                            transition: 'transform 0.25s',
                            ...(isCurrent ? {
                              background: 'linear-gradient(180deg,#0d0a07 0%,#110e0a 100%)',
                              boxShadow: '0 0 0 1.5px rgba(180,140,55,0.5), 0 0 32px rgba(150,110,30,0.22), inset 0 1px 0 rgba(255,210,100,0.07)',
                            } : isPast ? {
                              background: 'rgba(255,255,255,0.035)',
                              boxShadow: '0 0 0 1px rgba(0,255,200,0.15)',
                            } : {
                              background: 'rgba(255,255,255,0.02)',
                              boxShadow: '0 0 0 1px rgba(255,255,255,0.06)',
                            }),
                          }}
                        >
                          {/* ── Image ────────────────────────────────── */}
                          <div className="relative overflow-hidden" style={{ height: 220, background: '#0a0809' }}>
                            <img
                              src={identity.image}
                              alt={identity.title}
                              draggable={false}
                              className="w-full h-full select-none"
                              style={{
                                objectFit: 'cover',
                                objectPosition: 'center top',
                                opacity:   isLocked ? 0.28 : isPast ? 0.72 : 1,
                                filter:    isLocked ? 'blur(4px) saturate(0.15)' : 'none',
                                transform: isLocked ? 'scale(1.09)' : 'none',
                                transition: 'all 0.3s',
                              }}
                            />

                            {/* Locked overlay */}
                            {isLocked && (
                              <div
                                className="absolute inset-0 flex items-center justify-center"
                                style={{ background: 'rgba(0,0,0,0.5)' }}
                              >
                                <motion.div
                                  animate={isShaking
                                    ? { scale: [1,1.5,0.85,1.3,1], rotate: [0,-15,15,-8,0], transition: { duration: 0.5 } }
                                    : {}}
                                >
                                  <Lock
                                    className="w-9 h-9"
                                    style={{ color: 'rgba(255,255,255,0.3)', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.8))' }}
                                  />
                                </motion.div>
                              </div>
                            )}

                            {/* Past: checkmark badge */}
                            {isPast && (
                              <div
                                className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center"
                                style={{ background: 'rgba(0,255,200,0.12)', border: '1px solid rgba(0,255,200,0.32)', backdropFilter: 'blur(6px)' }}
                              >
                                <Check className="w-4 h-4" style={{ color: '#00FFC8' }} strokeWidth={2.5} />
                              </div>
                            )}

                            {/* Current: YOU ARE HERE badge */}
                            {isCurrent && (
                              <motion.div
                                className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
                                style={{
                                  background: 'rgba(240,201,106,0.12)',
                                  border: '1px solid rgba(240,201,106,0.3)',
                                  backdropFilter: 'blur(8px)',
                                  WebkitBackdropFilter: 'blur(8px)',
                                }}
                                animate={{ opacity: [0.65, 1, 0.65] }}
                                transition={{ duration: 2.6, repeat: Infinity }}
                              >
                                <MapPin className="w-3 h-3 shrink-0" style={{ color: '#f0c96a' }} />
                                <span
                                  className="text-[9px] font-bold uppercase tracking-[0.22em]"
                                  style={{ color: '#f0c96a' }}
                                >
                                  You are here
                                </span>
                              </motion.div>
                            )}
                          </div>

                          {/* ── Card body ────────────────────────────── */}
                          <div className="px-4 py-3.5">
                            <div className="flex items-baseline justify-between gap-2 mb-1">
                              <span
                                className="font-bold"
                                style={{
                                  fontFamily: "'Space Grotesk', sans-serif",
                                  fontSize: '0.95rem',
                                  color: isLocked ? 'rgba(255,255,255,0.38)' : isCurrent ? '#f0c96a' : '#e4e4e7',
                                }}
                              >
                                {identity.title}
                              </span>
                              <span
                                className="text-[10px] font-semibold tabular-nums shrink-0"
                                style={{
                                  color: isLocked
                                    ? 'rgba(255,255,255,0.22)'
                                    : isCurrent
                                    ? 'rgba(240,201,106,0.6)'
                                    : 'rgba(0,255,200,0.55)',
                                }}
                              >
                                {isLocked
                                  ? `Unlocks at Day ${identity.dayStart}`
                                  : isPast
                                  ? `Day ${identity.dayStart}–${identity.dayEnd} · Completed`
                                  : identity.dayEnd != null
                                  ? `Day ${identity.dayStart}–${identity.dayEnd}`
                                  : `Day ${identity.dayStart}+`}
                              </span>
                            </div>

                            {/* Current: progress bar */}
                            {isCurrent && (
                              <div className="mt-2.5">
                                <div
                                  className="h-[3px] w-full rounded-full overflow-hidden"
                                  style={{ background: 'rgba(255,255,255,0.07)' }}
                                >
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.round(progress * 100)}%` }}
                                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: index * 0.08 + 0.45 }}
                                    className="h-full rounded-full"
                                    style={{
                                      background: 'linear-gradient(90deg,#c8922a,#f0c96a)',
                                      boxShadow: '0 0 8px rgba(210,155,50,0.5)',
                                    }}
                                  />
                                </div>
                                <p className="text-[10px] mt-1.5" style={{ color: 'rgba(192,148,60,0.65)' }}>
                                  Day {currentDay} of {identity.dayEnd}
                                  {nextIdentity != null && daysToNext > 0
                                    ? ` · ${daysToNext} day${daysToNext !== 1 ? 's' : ''} to ${nextIdentity.title}`
                                    : ''}
                                </p>
                              </div>
                            )}

                            {/* Past: held days */}
                            {isPast && identity.dayEnd != null && (
                              <p className="text-[10px]" style={{ color: 'rgba(0,255,200,0.45)' }}>
                                Held {identity.dayEnd - identity.dayStart + 1} days · tap for details
                              </p>
                            )}

                            {/* Locked: days away */}
                            {isLocked && (
                              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                                {identity.dayStart - currentDay} day{identity.dayStart - currentDay !== 1 ? 's' : ''} away
                              </p>
                            )}
                          </div>

                          {/* ── Expand: current stats ─────────────────── */}
                          <AnimatePresence initial={false}>
                            {isCurrent && isExpanded && (
                              <motion.div
                                key="cur-expand"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                                className="overflow-hidden"
                              >
                                <div
                                  className="px-4 pt-1 pb-4 flex gap-2"
                                  style={{ borderTop: '1px solid rgba(180,140,55,0.13)' }}
                                >
                                  {[
                                    { label: 'Current Day', value: String(currentDay)                                              },
                                    { label: 'Days Left',   value: identity.dayEnd != null ? String(identity.dayEnd - currentDay) : '∞' },
                                    { label: 'Progress',    value: `${Math.round(progress * 100)}%`                                },
                                  ].map(({ label, value }) => (
                                    <div
                                      key={label}
                                      className="flex-1 flex flex-col items-center gap-0.5 py-2.5 rounded-xl"
                                      style={{ background: 'rgba(255,255,255,0.04)' }}
                                    >
                                      <span
                                        className="text-base font-bold"
                                        style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#f0c96a' }}
                                      >
                                        {value}
                                      </span>
                                      <span
                                        className="text-[8.5px] uppercase tracking-widest font-bold"
                                        style={{ color: 'rgba(255,255,255,0.28)' }}
                                      >
                                        {label}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* ── Expand: past details ──────────────────── */}
                          <AnimatePresence initial={false}>
                            {isPast && isExpanded && (
                              <motion.div
                                key="past-expand"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                                className="overflow-hidden"
                              >
                                <div
                                  className="px-4 pt-1 pb-4 flex gap-2"
                                  style={{ borderTop: '1px solid rgba(0,255,200,0.08)' }}
                                >
                                  {[
                                    { label: 'Earned',  value: `Day ${identity.dayStart}`                                                                      },
                                    { label: 'Left at', value: `Day ${identity.dayEnd}`                                                                        },
                                    { label: 'Held',    value: identity.dayEnd != null ? `${identity.dayEnd - identity.dayStart + 1}d` : '—'  },
                                  ].map(({ label, value }) => (
                                    <div
                                      key={label}
                                      className="flex-1 flex flex-col items-center gap-0.5 py-2.5 rounded-xl"
                                      style={{ background: 'rgba(255,255,255,0.04)' }}
                                    >
                                      <span
                                        className="text-base font-bold text-white"
                                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                                      >
                                        {value}
                                      </span>
                                      <span
                                        className="text-[8.5px] uppercase tracking-widest font-bold"
                                        style={{ color: 'rgba(255,255,255,0.28)' }}
                                      >
                                        {label}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      </div>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
