/**
 * Dotloop Token Service
 *
 * Manages the full OAuth token lifecycle for all tenants:
 *  - Fetch encrypted tokens from dotloop_connections (Supabase)
 *  - Decrypt via token-encryption
 *  - Auto-refresh when within 30 minutes of expiry
 *  - Write new encrypted tokens back to DB
 *  - Revoke tokens and clean up on disconnect
 */

import { getSupabaseAdmin } from './supabase';
import { encryptToken, decryptToken } from './token-encryption';

const DOTLOOP_TOKEN_URL = 'https://auth.dotloop.com/oauth/token';
const DOTLOOP_REVOKE_URL = 'https://auth.dotloop.com/oauth/token/revoke';
const REFRESH_BUFFER_MS = 30 * 60 * 1000; // 30 minutes

function getDotloopCredentials() {
  const clientId = process.env.DOTLOOP_CLIENT_ID;
  const clientSecret = process.env.DOTLOOP_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      'DOTLOOP_CLIENT_ID and DOTLOOP_CLIENT_SECRET must be set to use OAuth token refresh.'
    );
  }
  return { clientId, clientSecret };
}

function basicAuthHeader(clientId: string, clientSecret: string): string {
  return 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Return a guaranteed-valid (non-expired) Dotloop access token for the tenant.
 * Automatically refreshes if the token is within 30 minutes of expiry.
 * Throws if the connection record is missing or refresh fails.
 */
export async function getValidToken(tenantId: string): Promise<string> {
  const db = getSupabaseAdmin();

  const { data: conn, error } = await db
    .from('dotloop_connections')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) throw new Error(`DB error fetching dotloop_connections: ${error.message}`);
  if (!conn) throw new Error(`No Dotloop connection found for tenant ${tenantId}`);

  const accessToken = decryptToken(conn.encrypted_access_token);

  // Check if the token needs refreshing
  const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at) : null;
  const needsRefresh = !expiresAt || expiresAt.getTime() - Date.now() < REFRESH_BUFFER_MS;

  if (!needsRefresh) {
    return accessToken;
  }

  // Refresh
  try {
    const { accessToken: newAccess, refreshToken: newRefresh, expiresAt: newExpiry } =
      await refreshToken(conn.encrypted_refresh_token, tenantId);

    return newAccess;
  } catch (err) {
    // Mark the connection as errored so the UI can prompt re-auth
    await db
      .from('dotloop_connections')
      .update({ sync_status: 'error', updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId);

    throw new Error(
      `Dotloop token refresh failed for tenant ${tenantId}: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}

/**
 * Refresh a Dotloop access token using the stored refresh token.
 * Encrypts the new tokens and writes them back to dotloop_connections.
 */
export async function refreshToken(
  encryptedRefreshToken: string,
  tenantId: string
): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
  const { clientId, clientSecret } = getDotloopCredentials();
  const plainRefresh = decryptToken(encryptedRefreshToken);

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: plainRefresh,
  });

  const res = await fetch(DOTLOOP_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: basicAuthHeader(clientId, clientSecret),
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Dotloop token refresh HTTP ${res.status}: ${body}`);
  }

  const json = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  const expiresAt = new Date(Date.now() + json.expires_in * 1000);

  // Persist encrypted tokens
  const db = getSupabaseAdmin();
  await db
    .from('dotloop_connections')
    .update({
      encrypted_access_token: encryptToken(json.access_token),
      encrypted_refresh_token: encryptToken(json.refresh_token),
      token_expires_at: expiresAt.toISOString(),
      sync_status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId);

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt,
  };
}

/**
 * Revoke the Dotloop token for a tenant, delete the connection record,
 * and write an audit log entry.
 */
export async function revokeToken(tenantId: string): Promise<void> {
  const db = getSupabaseAdmin();

  const { data: conn } = await db
    .from('dotloop_connections')
    .select('encrypted_access_token, user_id')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (conn?.encrypted_access_token) {
    try {
      const { clientId, clientSecret } = getDotloopCredentials();
      const token = decryptToken(conn.encrypted_access_token);
      const params = new URLSearchParams({ token });

      await fetch(DOTLOOP_REVOKE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: basicAuthHeader(clientId, clientSecret),
        },
        body: params.toString(),
      });
    } catch {
      // Best-effort revoke — continue to delete the record even if revoke fails
    }
  }

  await db.from('dotloop_connections').delete().eq('tenant_id', tenantId);

  await db.from('audit_log').insert({
    tenant_id: tenantId,
    user_id: conn?.user_id ?? null,
    action: 'dotloop_disconnected',
    resource_type: 'dotloop_connection',
    created_at: new Date().toISOString(),
  });
}
