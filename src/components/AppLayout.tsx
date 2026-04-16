import { ReactNode } from 'react';
import { LogOut } from 'lucide-react';
import { BottomNav } from './BottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function AppLayout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Signed out');
    } catch {
      toast.error('Failed to sign out');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="fixed top-0 right-0 z-50 p-3">
        <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Sign out">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
      {children}
      <BottomNav />
    </div>
  );
}
