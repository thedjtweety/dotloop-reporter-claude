/**
 * Dotloop OAuth Callback Route
 * 
 * Handles the OAuth 2.0 callback from Dotloop
 * Exchanges authorization code for access/refresh tokens
 * Sets up user session and redirects to dashboard
 */

import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { oauthTokens, users } from '../../drizzle/schema';
import { tokenEncryption } from '../lib/token-encryption';
import { getTenantId } from '../lib/tenant-context';
import { getSessionCookieOptions } from '../_core/cookies';
import { SignJWT } from 'jose';

const DOTLOOP_TOKEN_URL = 'https://auth.dotloop.com/oauth/token';
const DOTLOOP_API_BASE = 'https://api-gateway.dotloop.com/public/v2';
const COOKIE_NAME = 'session';
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Create HTTP Basic Authorization header
 */
function createBasicAuthHeader(clientId: string, clientSecret: string): string {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  return `Basic ${credentials}`;
}

/**
 * Get Dotloop OAuth credentials from environment
 */
function getDotloopCredentials() {
  const clientId = process.env.DOTLOOP_CLIENT_ID;
  const clientSecret = process.env.DOTLOOP_CLIENT_SECRET;
  const redirectUri = process.env.DOTLOOP_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      'Dotloop OAuth credentials not configured. ' +
      'Please set DOTLOOP_CLIENT_ID, DOTLOOP_CLIENT_SECRET, and DOTLOOP_REDIRECT_URI'
    );
  }

  return { clientId, clientSecret, redirectUri };
}

/**
 * Create a simple JWT session token for Dotloop
 */
async function createSessionToken(userId: number, email: string): Promise<string> {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret');
  
  const token = await new SignJWT({
    userId,
    email,
    provider: 'dotloop',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('365d')
    .sign(secret);

  return token;
}

export const dotloopOAuthCallbackRouter = Router();

/**
 * Dotloop OAuth Callback Handler
 * GET /api/dotloop-oauth/callback?code=...&state=...
 */
dotloopOAuthCallbackRouter.get('/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const state = req.query.state as string;

  if (!code || !state) {
    return res.status(400).json({
      error: 'Missing authorization code or state parameter',
    });
  }

  try {
    const db = await getDb();
    if (!db) {
      throw new Error('Database connection failed');
    }

    const { clientId, clientSecret, redirectUri } = getDotloopCredentials();

    // Step 1: Exchange authorization code for tokens
    console.log('[Dotloop OAuth] Exchanging authorization code for tokens...');

    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });

    const tokenResponse = await fetch(DOTLOOP_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Authorization': createBasicAuthHeader(clientId, clientSecret),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      let errorDetails = '';
      try {
        const errorJson = await tokenResponse.json();
        errorDetails = JSON.stringify(errorJson);
      } catch {
        errorDetails = await tokenResponse.text();
      }

      console.error('[Dotloop OAuth] Token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: errorDetails,
      });

      return res.status(400).json({
        error: 'Failed to exchange authorization code for tokens',
        details: errorDetails,
      });
    }

    const tokenData = await tokenResponse.json();

    // Step 2: Fetch user profile from Dotloop API
    console.log('[Dotloop OAuth] Fetching user profile from Dotloop API...');

    const profileResponse = await fetch(`${DOTLOOP_API_BASE}/profile`, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!profileResponse.ok) {
      console.error('[Dotloop OAuth] Failed to fetch profile:', profileResponse.status);
      return res.status(400).json({
        error: 'Failed to fetch user profile from Dotloop',
      });
    }

    const profileData = await profileResponse.json();
    const userEmail = profileData.data?.email || `dotloop-user-${Date.now()}`;
    const userName = profileData.data?.name || userEmail.split('@')[0];

    // Step 3: Get or create user in our system
    console.log('[Dotloop OAuth] Creating/updating user in database...');

    const tenantId = await getTenantId();

    // Get or create user
    const existingUsers = await db.select().from(users).limit(1);
    let userId = existingUsers[0]?.id || 1;

    if (existingUsers.length === 0) {
      // Create new user - use 'agent' role which is a valid enum value
      await db.insert(users).values({
        tenantId,
        email: userEmail,
        name: userName,
        role: 'agent',
      });
      // Get the newly created user
      const newUser = await db.select().from(users).limit(1);
      userId = newUser[0]?.id || 1;
    }

    // Encrypt tokens before storage
    const encryptedAccessToken = tokenEncryption.encrypt(tokenData.access_token);
    const encryptedRefreshToken = tokenEncryption.encrypt(tokenData.refresh_token);
    const tokenHash = tokenEncryption.hashToken(tokenData.access_token);

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();

    // Store Dotloop OAuth token
    await db.insert(oauthTokens).values({
      tenantId,
      userId,
      provider: 'dotloop',
      encryptedAccessToken,
      encryptedRefreshToken,
      tokenExpiresAt: expiresAt,
      encryptionKeyVersion: tokenEncryption.getCurrentKeyVersion(),
      tokenHash,
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent'),
      isPrimary: 1,
      isActive: 1,
    });

    // Step 4: Create session token
    console.log('[Dotloop OAuth] Creating session token...');

    const sessionToken = await createSessionToken(userId, userEmail);

    // Set session cookie
    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, sessionToken, {
      ...cookieOptions,
      maxAge: ONE_YEAR_MS,
    });

    console.log('[Dotloop OAuth] OAuth flow completed successfully');

    // Redirect to dashboard on dotloopreport.com
    const redirectUrl = process.env.DOTLOOP_REDIRECT_URI?.replace('/api/dotloop-oauth/callback', '') || '/';
    res.redirect(302, redirectUrl);
  } catch (error) {
    console.error('[Dotloop OAuth] Callback error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      error: 'OAuth callback failed',
      message: errorMessage,
    });
  }
});
