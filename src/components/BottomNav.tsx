import { Home, PlusCircle, BookOpen, TrendingUp, BookText } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/add', icon: PlusCircle, label: 'Add' },
  { path: '/library', icon: BookOpen, label: 'Library' },
  { path: '/progress', icon: TrendingUp, label: 'Progress' },
  { path: '/grammar', icon: BookText, label: 'Grammar' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  // Hide nav during review
  if (location.pathname === '/review' || location.pathname === '/auth') return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg safe-area-bottom">
      <div className="flex items-center justify-around py-2">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
