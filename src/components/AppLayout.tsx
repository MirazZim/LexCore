import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background pt-24">
      <BottomNav />
      {children}
    </div>
  );
}
