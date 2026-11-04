import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';

/**
 * An unseen visitor that walks across the Chronicle while the quill writes.
 * Its footprints wander on their own path, stop to read highlighted words
 * (any element with data-chronicle-keyword, announced by a bubbling
 * `chronicle:keyword` event), and leave before the letter is finished.
 */
export interface ChronicleVisitorProps {
  /** True while the quill is writing the letter */
  isWriting: boolean;
  /** The card the visitor walks on; its text is found via [data-ch] */
  containerRef: RefObject<HTMLElement>;
  /** Distance between steps along the path, in px */
  strideLength?: number;
  /** Prints older than this many newer ones fade out */
  maxVisible?: number;
  color?: string;
  /** Same seed, same path: makes the walk reproducible */
  seed?: number;
}

type Pt = { x: number; y: number };
type Line = { top: number; bottom: number; left: number; right: number };
type Step = { x: number; y: number; cx: number; cy: number; rot: number; side: 1 | -1; faint: boolean };
type Print = { id: number; x: number; y: number; rot: number; side: 1 | -1; faint: boolean; fading: boolean };

const STEP_MS = 500;          // ~2 steps a second
const PAUSE_MS = 1200;        // reading a keyword
const FADE_MS = 1500;
const FOOT_SPREAD = 6;        // sideways offset of each foot from the centre line
const LOOKAHEAD = 14;         // how far ahead a keyword pause may be placed

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uniform Catmull-Rom through every point, sampled densely. */
function catmullRom(points: Pt[], samples = 24): Pt[] {
  const p = [points[0], ...points, points[points.length - 1]];
  const out: Pt[] = [];
  for (let i = 1; i < p.length - 2; i++) {
    const [p0, p1, p2, p3] = [p[i - 1], p[i], p[i + 1], p[i + 2]];
    for (let s = 0; s < samples; s++) {
      const t = s / samples, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

/** The card's size and the boxes of its visible text lines, relative to the card. */
function measureLayout(container: HTMLElement) {
  const box = container.getBoundingClientRect();
  const buckets = new Map<number, Line>();
  container.querySelectorAll<HTMLElement>('[data-ch]').forEach(el => {
    if (el.closest('[data-inactive-leaf]')) return;
    const r = el.getBoundingClientRect();
    if (!r.width) return;
    const line = { top: r.top - box.top, bottom: r.bottom - box.top, left: r.left - box.left, right: r.right - box.left };
    const key = Math.round(line.top / 6);
    const prev = buckets.get(key);
    buckets.set(key, prev
      ? { top: Math.min(prev.top, line.top), bottom: Math.max(prev.bottom, line.bottom), left: Math.min(prev.left, line.left), right: Math.max(prev.right, line.right) }
      : line);
  });
  const lines = [...buckets.values()].sort((a, b) => a.top - b.top);
  return { w: box.width, h: box.height, lines };
}

function overText(lines: Line[], x: number, y: number) {
  return lines.some(l => y >= l.top - 2 && y <= l.bottom + 2 && x >= l.left - 4 && x <= l.right + 4);
}

/** Entry → 4–6 waypoints (margins and line gaps preferred) → exit, as footsteps. */
function buildSteps(rng: () => number, layout: ReturnType<typeof measureLayout>, stride: number): Step[] {
  const { w, h, lines } = layout;
  const tb = lines.length
    ? { left: Math.min(...lines.map(l => l.left)), right: Math.max(...lines.map(l => l.right)), top: Math.min(...lines.map(l => l.top)), bottom: Math.max(...lines.map(l => l.bottom)) }
    : { left: w * 0.15, right: w * 0.85, top: h * 0.3, bottom: h * 0.75 };
  const between = (a: number, b: number) => a + rng() * Math.max(0, b - a);

  // Margins around the text block, kept only when there's room to walk
  const zones: (() => Pt)[] = [];
  if (tb.left - 16 >= 10) zones.push(() => ({ x: between(10, tb.left - 6), y: between(tb.top, h - 14) }));
  if (w - 10 - (tb.right + 6) >= 10) zones.push(() => ({ x: between(tb.right + 6, w - 10), y: between(tb.top, h - 14) }));
  if (h - 14 - (tb.bottom + 8) >= 10) zones.push(() => ({ x: between(tb.left, tb.right), y: between(tb.bottom + 8, h - 14) }));
  // The gaps between written lines
  const gaps = lines.slice(0, -1).map((l, i) => (l.bottom + lines[i + 1].top) / 2);

  const count = 4 + Math.floor(rng() * 3);
  const waypoints: Pt[] = [];
  for (let i = 0; i < count; i++) {
    if ((rng() < 0.6 && zones.length) || !gaps.length) {
      waypoints.push(zones.length ? zones[Math.floor(rng() * zones.length)]() : { x: between(20, w - 20), y: between(20, h - 20) });
    } else {
      waypoints.push({ x: between(tb.left, tb.right), y: gaps[Math.floor(rng() * gaps.length)] });
    }
  }

  const edges = ['left', 'right', 'bottom'] as const;
  const entryEdge = edges[Math.floor(rng() * 3)];
  const others = edges.filter(e => e !== entryEdge);
  const exitEdge = others[Math.floor(rng() * others.length)];
  const edgePoint = (edge: typeof edges[number]): Pt =>
    edge === 'left' ? { x: -26, y: between(tb.top, h - 24) }
      : edge === 'right' ? { x: w + 26, y: between(tb.top, h - 24) }
        : { x: between(30, w - 30), y: h + 26 };
  const entry = edgePoint(entryEdge);
  const exit = edgePoint(exitEdge);

  // Visit waypoints nearest-first so the walk wanders instead of zig-zagging
  const ordered: Pt[] = [];
  let at = entry;
  const pool = [...waypoints];
  while (pool.length) {
    let best = 0;
    pool.forEach((p, i) => { if (Math.hypot(p.x - at.x, p.y - at.y) < Math.hypot(pool[best].x - at.x, pool[best].y - at.y)) best = i; });
    at = pool.splice(best, 1)[0];
    ordered.push(at);
  }

  const curve = catmullRom([entry, ...ordered, exit]);
  const cum = [0];
  for (let i = 1; i < curve.length; i++) cum.push(cum[i - 1] + Math.hypot(curve[i].x - curve[i - 1].x, curve[i].y - curve[i - 1].y));
  const total = cum[cum.length - 1];

  const steps: Step[] = [];
  let j = 0;
  for (let d = stride / 2, n = 0; d < total; d += stride, n++) {
    while (j < cum.length - 2 && cum[j + 1] < d) j++;
    const a = curve[j], b = curve[j + 1];
    const seg = cum[j + 1] - cum[j] || 1;
    const t = (d - cum[j]) / seg;
    const cx = a.x + (b.x - a.x) * t, cy = a.y + (b.y - a.y) * t;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const tx = (b.x - a.x) / len, ty = (b.y - a.y) / len;
    const side: 1 | -1 = n % 2 ? 1 : -1;
    const x = cx - ty * FOOT_SPREAD * side, y = cy + tx * FOOT_SPREAD * side;
    steps.push({ x, y, cx, cy, rot: (Math.atan2(ty, tx) * 180) / Math.PI + 90, side, faint: overText(lines, x, y) });
  }
  return steps;
}

/** One footprint, toes pointing up; the left foot is the right one mirrored. */
function Footprint({ color, left }: { color: string; left: boolean }) {
  return (
    <g fill={color} transform={left ? 'translate(10 0) scale(-1 1)' : undefined}>
      <path d="M5 6.4 C7.6 6.4 8.6 9 8.2 11.6 C7.8 14.3 6.6 15.7 5 15.7 C3.4 15.7 2.4 14.5 2.3 12.4 C2.1 9.6 2.6 6.4 5 6.4 Z" />
      <circle cx="2.6" cy="4.2" r="1.25" />
      <circle cx="4.4" cy="3" r="1" />
      <circle cx="6" cy="2.7" r="0.9" />
      <circle cx="7.4" cy="3.2" r="0.8" />
      <circle cx="8.5" cy="4.3" r="0.7" />
    </g>
  );
}

export function ChronicleVisitor({ isWriting, containerRef, strideLength = 22, maxVisible = 10, color = '#3b2a1a', seed = 1 }: ChronicleVisitorProps) {
  const reduce = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const [prints, setPrints] = useState<Print[]>([]);
  const [active, setActive] = useState(false);
  const writingRef = useRef(isWriting);
  writingRef.current = isWriting;

  // The visitor comes once per letter, when the writing first begins
  useEffect(() => {
    if (!reduce && isWriting) setActive(true);
  }, [isWriting, reduce]);

  useEffect(() => {
    const container = containerRef.current;
    if (!active || !container) return;
    const rng = mulberry32(seed);
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => { timers.push(window.setTimeout(fn, ms)); };
    let steps: Step[] = [];
    let lines: Line[] = [];
    let i = 0;
    let nextId = 0;
    let live: number[] = [];
    const pauses: { at: number; target: Pt }[] = [];

    // Keyword positions: read once after layout, again whenever the card resizes
    const keywords = new Map<Element, Pt>();
    const readKeywords = () => {
      const box = container.getBoundingClientRect();
      keywords.clear();
      container.querySelectorAll('[data-chronicle-keyword]').forEach(el => {
        const r = el.getBoundingClientRect();
        keywords.set(el, { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 });
      });
    };
    const ro = new ResizeObserver(readKeywords);
    ro.observe(container);

    const fade = (id: number) => {
      setPrints(prev => prev.map(p => (p.id === id ? { ...p, fading: true } : p)));
      later(() => setPrints(prev => prev.filter(p => p.id !== id)), FADE_MS + 100);
    };
    const place = (ps: Omit<Print, 'id' | 'fading'>[]) => {
      const fresh = ps.map(p => ({ ...p, id: nextId++, fading: false }));
      live.push(...fresh.map(p => p.id));
      setPrints(prev => [...prev, ...fresh]);
      while (live.length > maxVisible) fade(live.shift()!);
    };

    // A keyword was just written: stop at the nearest point ahead and read it
    const onKeyword = (e: Event) => {
      const el = (e as CustomEvent<{ element?: Element }>).detail?.element ?? (e.target as Element);
      const target = keywords.get(el);
      if (!target || i >= steps.length) return;
      let best = -1, bestD = Infinity;
      for (let k = i; k < Math.min(steps.length, i + LOOKAHEAD); k++) {
        const d = Math.hypot(steps[k].cx - target.x, steps[k].cy - target.y);
        if (d < bestD) { bestD = d; best = k; }
      }
      if (best >= 0) pauses.push({ at: best, target });
    };
    container.addEventListener('chronicle:keyword', onKeyword);

    const tick = () => {
      if (i >= steps.length) {
        // Gone: the last prints fade one by one, as if it kept walking off the page
        live.forEach((id, k) => later(() => fade(id), 350 * k));
        live = [];
        return;
      }
      const speed = writingRef.current ? 1 : 1.5; // hurry out once the letter is done
      const pause = pauses.findIndex(p => p.at <= i);
      if (pause >= 0) {
        // Both feet side by side, facing the word
        const { target } = pauses.splice(pause, 1)[0];
        const s = steps[i];
        const a = Math.atan2(target.y - s.cy, target.x - s.cx);
        const nx = -Math.sin(a) * (FOOT_SPREAD - 1), ny = Math.cos(a) * (FOOT_SPREAD - 1);
        const rot = (a * 180) / Math.PI + 90;
        place([
          { x: s.cx - nx, y: s.cy - ny, rot, side: -1, faint: overText(lines, s.cx - nx, s.cy - ny) },
          { x: s.cx + nx, y: s.cy + ny, rot, side: 1, faint: overText(lines, s.cx + nx, s.cy + ny) },
        ]);
        i++;
        later(tick, PAUSE_MS);
        return;
      }
      const s = steps[i++];
      place([{ x: s.x, y: s.y, rot: s.rot, side: s.side, faint: s.faint }]);
      later(tick, (STEP_MS * (1 + (rng() - 0.5) * 0.3)) / speed);
    };

    // Enter 1–2s after the first letter appears
    later(() => {
      readKeywords();
      const layout = measureLayout(container);
      lines = layout.lines;
      steps = buildSteps(rng, layout, strideLength);
      tick();
    }, 1000 + rng() * 1000);

    return () => {
      timers.forEach(clearTimeout);
      ro.disconnect();
      container.removeEventListener('chronicle:keyword', onKeyword);
      setPrints([]);
    };
  }, [active, containerRef, seed, strideLength, maxVisible]);

  if (reduce) return null;

  return (
    // No z-index, so the prints blend with the paper beneath instead of an empty layer
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <style>{`
        .cv-print { opacity: var(--cv-o); mix-blend-mode: multiply; transition: opacity ${FADE_MS}ms ease; animation: cv-in 250ms ease-out backwards; }
        .cv-print.cv-fading { opacity: 0; }
        @keyframes cv-in { from { opacity: 0; transform: scale(0.85); filter: blur(2px); } to { opacity: var(--cv-o); transform: scale(1); filter: blur(0); } }
      `}</style>
      {prints.map(p => (
        <div key={p.id} className="absolute h-4 w-2.5" style={{ left: p.x - 5, top: p.y - 8, transform: `rotate(${p.rot}deg)` }}>
          <svg viewBox="0 0 10 16" width={10} height={16} className={`cv-print ${p.fading ? 'cv-fading' : ''}`}
            style={{ ['--cv-o' as string]: p.faint ? 0.25 : 0.5 }}>
            <Footprint color={color} left={p.side === -1} />
          </svg>
        </div>
      ))}
    </div>
  );
}
