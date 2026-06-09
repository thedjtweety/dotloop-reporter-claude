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
  isAuthenticated: boolean;
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

  // Fetch tenant info from our backend after Supabase auth succeeds.
  // accessToken must be passed in — the session state may not be updated yet when this runs.
  const loadUserProfile = useCallback(async (supabaseUser: User, accessToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
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
        // 404 = profile not set up yet (new user who hasn't completed setup-tenant)
        // 401 = token invalid
        console.warn('[AuthContext] /api/auth/me returned', res.status);
        setUser({
          id:            supabaseUser.id,
          email:         supabaseUser.email ?? '',
          tenantId:      null,
          brokerageName: null,
        });
      }
    } catch (err) {
      console.error('[AuthContext] /api/auth/me fetch error:', err);
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
      if (s?.user && s.access_token) {
        loadUserProfile(s.user, s.access_token).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s);
        if (s?.user && s.access_token) {
          loadUserProfile(s.user, s.access_token);
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
    console.log('[signUp] Starting Supabase signUp for:', email);
    const { data, error } = await supabase.auth.signUp({ email, password });
    console.log('[signUp] Supabase signUp result:', { userId: data?.user?.id, error });
    if (error || !data.user) return { error: error ?? new Error('Sign up failed') };

    // Create tenant + user rows on our backend
    try {
      console.log('[signUp] Calling /api/auth/setup-tenant with userId:', data.user.id, 'brokerage:', brokerageName);
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
      console.log('[signUp] setup-tenant response status:', res.status);
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        console.error('[signUp] setup-tenant error body:', body);
        return { error: new Error(body.error ?? `Server error ${res.status}: Failed to create tenant`) };
      }
      const successBody = await res.json() as { tenantId?: string; created?: boolean };
      console.log('[signUp] setup-tenant success:', successBody);
    } catch (err) {
      console.error('[signUp] setup-tenant fetch threw:', err);
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
    <AuthContext.Provider value={{ user, session, loading, isAuthenticated: !!session, signUp, signIn, signOut }}>
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
