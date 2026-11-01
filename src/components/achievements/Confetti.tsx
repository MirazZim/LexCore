import { useEffect, useRef } from 'react';

const COLORS = ['#f0c96a', '#fff3c4', '#00FFC8', '#38bdf8', '#a78bfa', '#f472b6', '#fb923c'];
// Full: the Day Cleared celebration. Light: a quick pop when a set is done.
const MODES = {
  full:  { perCannon: 110, rain: 90, durationMs: 6500 },
  light: { perCannon: 28,  rain: 0,  durationMs: 3500 },
};

interface Piece {
  x: number; y: number; vx: number; vy: number;
  rot: number; vrot: number; tilt: number; vtilt: number;
  w: number; h: number; color: string; round: boolean; delay: number;
}

/** Full-screen confetti: two cannons from the bottom corners, then a gentle rain. */
export function Confetti({ variant = 'full' }: { variant?: keyof typeof MODES }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const { perCannon, rain, durationMs: DURATION_MS } = MODES[variant];
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const W = window.innerWidth;
    const H = window.innerHeight;
    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const piece = (x: number, y: number, vx: number, vy: number, delay: number): Piece => ({
      x, y, vx, vy, delay,
      rot: rand(0, Math.PI * 2), vrot: rand(-0.25, 0.25),
      tilt: rand(0, Math.PI * 2), vtilt: rand(0.05, 0.15),
      w: rand(6, 11), h: rand(8, 16),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      round: Math.random() < 0.25,
    });

    const pieces: Piece[] = [];
    const power = Math.max(H, 600) / 42;
    for (let i = 0; i < perCannon; i++) {
      pieces.push(piece(0, H, rand(4, 11), -rand(power * 0.7, power * 1.15), rand(0, 250)));
      pieces.push(piece(W, H, -rand(4, 11), -rand(power * 0.7, power * 1.15), rand(0, 250)));
    }
    for (let i = 0; i < rain; i++) {
      pieces.push(piece(rand(0, W), rand(-H * 0.4, -20), rand(-1, 1), rand(1, 3), rand(900, 2200)));
    }

    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = now - start;
      ctx.clearRect(0, 0, W, H);
      const fade = t > DURATION_MS - 1200 ? Math.max(0, (DURATION_MS - t) / 1200) : 1;
      for (const p of pieces) {
        if (t < p.delay) continue;
        p.vy = Math.min(p.vy + 0.22, 5.5);
        p.vx *= 0.985;
        p.x += p.vx + Math.sin(p.tilt) * 0.6;
        p.y += p.vy;
        p.rot += p.vrot;
        p.tilt += p.vtilt;
        if (p.y > H + 30) continue;
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(1, Math.cos(p.tilt)); // flutter
        ctx.fillStyle = p.color;
        if (p.round) {
          ctx.beginPath();
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }
        ctx.restore();
      }
      if (t < DURATION_MS) frame = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, W, H);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, [variant]);

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none z-[110]" aria-hidden />;
}
