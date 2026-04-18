import { useRef, useEffect, useLayoutEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, PlusCircle, BookOpen, TrendingUp, BookText, Menu, X, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/add', icon: PlusCircle, label: 'Add' },
  { path: '/library', icon: BookOpen, label: 'Library' },
  { path: '/progress', icon: TrendingUp, label: 'Progress' },
  { path: '/grammar', icon: BookText, label: 'Grammar' },
];

type BoxStyle = { left: number; top: number; width: number; height: number };

const glassPill =
  'bg-white/[0.06] rounded-2xl ring-1 ring-inset ring-white/[0.08] backdrop-blur-2xl shadow-lg shadow-black/20';

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [box, setBox] = useState<BoxStyle | null>(null);
  const [ready, setReady] = useState(false);
  const linkRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useLayoutEffect(() => {
    const measure = () => {
      const activeIndex = navItems.findIndex(item => item.path === location.pathname);
      const el = linkRefs.current[activeIndex];
      if (!el) return;
      setBox({ left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [location.pathname]);

  useEffect(() => {
    if (box && !ready) {
      const id = requestAnimationFrame(() => setReady(true));
      return () => cancelAnimationFrame(id);
    }
  }, [box, ready]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  if (location.pathname === '/review' || location.pathname === '/auth') return null;

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Signed out');
    } catch {
      toast.error('Failed to sign out');
    }
  };

  return (
    <>
      {/* ── Floating top bar: three glass pills ── */}
      <header className="fixed top-4 left-4 right-4 z-50 flex items-center justify-between gap-3">

        {/* Logo pill */}
        <button
          onClick={() => navigate('/')}
          className={cn('flex items-center h-12 px-5', glassPill, 'hover:bg-white/[0.08] transition-colors')}
        >
          <span className="font-bold text-lg tracking-tight text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Lex<span className="text-primary">Core</span>
          </span>
        </button>

        {/* Center nav pill (desktop) */}
        <nav className={cn('hidden md:flex items-center relative p-2', glassPill)}>
          {navItems.map(({ path, label }, i) => {
            const isActive = location.pathname === path;
            return (
              <button
                key={path}
                ref={el => { linkRefs.current[i] = el; }}
                onClick={() => navigate(path)}
                className={cn(
                  'relative z-10 grid items-center h-9 px-5 text-sm font-medium tracking-wide rounded-xl transition-colors duration-300',
                  isActive ? 'text-zinc-900' : 'text-white/50 hover:text-white'
                )}
              >
                {label}
              </button>
            );
          })}
          {/* Sliding pill: outer slides smoothly, inner remounts per route for morph + shine */}
          {box && (
            <div
              className="absolute z-0 pointer-events-none"
              style={{
                left: box.left,
                top: box.top,
                width: box.width,
                height: box.height,
                transition: ready
                  ? 'left 550ms cubic-bezier(0.34, 1.56, 0.64, 1), top 550ms cubic-bezier(0.34, 1.56, 0.64, 1), width 550ms cubic-bezier(0.34, 1.56, 0.64, 1), height 550ms cubic-bezier(0.34, 1.56, 0.64, 1)'
                  : 'none',
              }}
            >
              <div
                key={location.pathname}
                className={cn(
                  'relative w-full h-full bg-white rounded-xl overflow-hidden',
                  'shadow-[0_0_24px_2px_rgba(255,255,255,0.25),0_6px_22px_rgba(168,85,247,0.45)]',
                  ready && 'animate-pill-morph'
                )}
              >
                <span
                  className="absolute inset-y-0 -left-1/3 w-1/2 bg-gradient-to-r from-transparent via-white/80 to-transparent animate-pill-shine"
                />
              </div>
            </div>
          )}
        </nav>

        {/* Right CTA pill: Logout (desktop) / hamburger (mobile) */}
        <button
          onClick={handleLogout}
          className={cn(
            'hidden md:flex items-center gap-2 h-12 px-5 text-sm font-medium text-white/80 hover:text-white',
            glassPill,
            'hover:bg-white/[0.08] transition-colors'
          )}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>

        <button
          onClick={() => setMobileOpen(v => !v)}
          className={cn(
            'md:hidden flex items-center justify-center h-12 w-12 text-white/80 hover:text-white',
            glassPill,
            'hover:bg-white/[0.08] transition-colors'
          )}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* ── Mobile sidebar backdrop ── */}
      <div
        onClick={() => setMobileOpen(false)}
        className={cn(
          'fixed inset-0 z-40 bg-background/60 backdrop-blur-sm md:hidden transition-opacity duration-300',
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
      />

      {/* ── Mobile sidebar panel ── */}
      <aside
        className={cn(
          'fixed top-0 left-0 bottom-0 z-50 w-64 md:hidden flex flex-col bg-card/90 backdrop-blur-2xl border-r border-white/10 transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between h-16 px-5 border-b border-white/10 shrink-0">
          <span className="font-bold text-lg tracking-tight text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Lex<span className="text-primary">Core</span>
          </span>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-2 text-white/60 hover:text-white transition-colors rounded-xl hover:bg-white/10"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-col p-3 gap-1 flex-1">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={cn(
                  'flex items-center gap-3 px-4 h-11 w-full text-sm font-medium rounded-xl transition-colors duration-200',
                  isActive
                    ? 'bg-white text-zinc-900'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10 shrink-0">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 h-11 w-full text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-colors duration-200"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
