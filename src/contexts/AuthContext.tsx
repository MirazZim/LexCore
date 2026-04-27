import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Read the stored Supabase session synchronously from localStorage so the auth
// gate never blocks the first render for returning users.
function readStoredSession(): { session: Session | null; loading: boolean } {
  try {
    const projectRef = new URL(import.meta.env.VITE_SUPABASE_URL as string).hostname.split('.')[0];
    const raw = localStorage.getItem(`sb-${projectRef}-auth-token`);
    if (!raw) return { session: null, loading: false };
    const parsed = JSON.parse(raw);
    // supabase-js v2 stores the Session object directly; v1 used { currentSession }
    const session: Session = parsed?.currentSession ?? parsed;
    if (!session?.access_token) return { session: null, loading: false };
    // If expired, let the async refresh sort it out
    if (session.expires_at && session.expires_at < Date.now() / 1000) {
      return { session: null, loading: true };
    }
    return { session, loading: false };
  } catch {
    return { session: null, loading: true };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const initial = readStoredSession();
  const [session, setSession] = useState<Session | null>(initial.session);
  const [loading, setLoading] = useState(initial.loading);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
