/**
 * AuthContext
 *
 * Wraps Supabase Auth for the whole app.  Provides:
 *   - user / session / loading state
 *   - signUp / signIn / signOut helpers
 *   - tenantId derived from the server /api/auth/me endpoint
 *
 * The service_role key NEVER comes here — all frontend auth uses the anon key.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import supabase from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthUser {
  id: string;
  email: string;
  tenantId: string | null;
  brokerageName: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    brokerageName: string
  ) => Promise<{ error: AuthError | Error | null }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: AuthError | Error | null }>;
  signOut: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch tenant info from our backend after Supabase auth succeeds
  const loadUserProfile = useCallback(async (supabaseUser: User) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (res.ok) {
        const profile = await res.json() as {
          tenantId?: string;
          brokerageName?: string;
        };
        setUser({
          id:            supabaseUser.id,
          email:         supabaseUser.email ?? '',
          tenantId:      profile.tenantId ?? null,
          brokerageName: profile.brokerageName ?? null,
        });
      } else {
        // Profile not set up yet — might be new user
        setUser({
          id:            supabaseUser.id,
          email:         supabaseUser.email ?? '',
          tenantId:      null,
          brokerageName: null,
        });
      }
    } catch {
      // Network error — still set basic user info
      setUser({
        id:            supabaseUser.id,
        email:         supabaseUser.email ?? '',
        tenantId:      null,
        brokerageName: null,
      });
    }
  }, []);

  // Subscribe to auth state changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) {
        loadUserProfile(s.user).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s);
        if (s?.user) {
          loadUserProfile(s.user);
        } else {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [loadUserProfile]);

  // ── signUp ────────────────────────────────────────────────────────────────

  const signUp = useCallback(async (
    email: string,
    password: string,
    brokerageName: string
  ): Promise<{ error: AuthError | Error | null }> => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error || !data.user) return { error: error ?? new Error('Sign up failed') };

    // Create tenant + user rows on our backend
    try {
      const res = await fetch('/api/auth/setup-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId:        data.user.id,
          email,
          brokerageName,
        }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        return { error: new Error(body.error ?? 'Failed to create tenant') };
      }
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Network error') };
    }

    return { error: null };
  }, []);

  // ── signIn ────────────────────────────────────────────────────────────────

  const signIn = useCallback(async (
    email: string,
    password: string
  ): Promise<{ error: AuthError | Error | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ?? null };
  }, []);

  // ── signOut ───────────────────────────────────────────────────────────────

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
