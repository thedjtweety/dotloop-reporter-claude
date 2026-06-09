/**
 * Supabase Client
 *
 * Two clients:
 *  - supabasePublic  — anon key, used for auth operations (sign-in, sign-up, session verify)
 *  - supabaseAdmin   — service_role key, bypasses RLS for server-side data operations
 *
 * Row Level Security is enforced at the DB level on every table (tenant_id isolation).
 * The admin client is used only in trusted server code, never exposed to the client.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
      `Add it to your .env file.`
    );
  }
  return val;
}

/**
 * Lazy singleton — clients are created on first access so missing env vars
 * only throw at call time, not at module import time (allows tests to stub).
 */
let _public: SupabaseClient | null = null;
let _admin: SupabaseClient | null = null;

export function getSupabasePublic(): SupabaseClient {
  if (!_public) {
    _public = createClient(
      requireEnv('SUPABASE_URL'),
      requireEnv('SUPABASE_ANON_KEY'),
      {
        auth: {
          persistSession: false,  // server-side — no browser storage
          autoRefreshToken: false,
        },
      }
    );
  }
  return _public;
}

export function getSupabaseAdmin(): SupabaseClient {
  if (!_admin) {
    _admin = createClient(
      requireEnv('SUPABASE_URL'),
      requireEnv('SUPABASE_SERVICE_KEY'),
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
  }
  return _admin;
}

// Named exports that create on demand — mirrors the spec's import style
export const supabasePublic = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabasePublic() as any)[prop];
  },
});

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabaseAdmin() as any)[prop];
  },
});
