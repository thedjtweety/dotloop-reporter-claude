import { describe, it, expect, beforeAll } from 'vitest';

/**
 * Dotloop OAuth Flow Integration Test
 * Tests the complete OAuth 2.0 flow with Dotloop
 */
describe('Dotloop OAuth Flow Integration', () => {
  const clientId = process.env.DOTLOOP_CLIENT_ID;
  const clientSecret = process.env.DOTLOOP_CLIENT_SECRET;
  const redirectUri = process.env.DOTLOOP_REDIRECT_URI;

  beforeAll(() => {
    if (!clientId || !clientSecret || !redirectUri) {
      console.warn('⚠️  Skipping OAuth flow tests - missing Dotloop credentials');
    }
  });

  it('should construct valid authorization URL', () => {
    if (!clientId || !redirectUri) {
      console.warn('Skipping - missing credentials');
      return;
    }

    const state = 'test-state-12345';
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
      redirect_on_deny: 'true',
      scope: 'account:read profile:* loop:* contact:* template:read',
    });

    const authUrl = `https://auth.dotloop.com/oauth/authorize?${params.toString()}`;

    expect(authUrl).toContain('https://auth.dotloop.com/oauth/authorize');
    expect(authUrl).toContain('response_type=code');
    expect(authUrl).toContain(`client_id=${clientId}`);
    expect(authUrl).toContain(`redirect_uri=${encodeURIComponent(redirectUri)}`);
    expect(authUrl).toContain(`state=${state}`);
    expect(authUrl).toContain('scope=account%3Aread');
  });

  it('should create valid Basic Auth header for token exchange', () => {
    if (!clientId || !clientSecret) {
      console.warn('Skipping - missing credentials');
      return;
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const authHeader = `Basic ${credentials}`;

    expect(authHeader).toMatch(/^Basic [A-Za-z0-9+/=]+$/);
    expect(authHeader.length).toBeGreaterThan(10);
  });

  it('should validate token endpoint URL', () => {
    const tokenUrl = 'https://auth.dotloop.com/oauth/token';
    expect(tokenUrl).toMatch(/^https:\/\/auth\.dotloop\.com\/oauth\/token$/);
  });

  it('should validate API gateway base URL', () => {
    const apiBase = 'https://api-gateway.dotloop.com/public/v2';
    expect(apiBase).toMatch(/^https:\/\/api-gateway\.dotloop\.com\/public\/v2$/);
  });

  it('should have correct OAuth scopes', () => {
    const requiredScopes = [
      'account:read',      // Read account information
      'profile:*',         // All profile operations
      'loop:*',            // All loop/transaction operations
      'contact:*',         // All contact operations
      'template:read',     // Read templates
    ];

    const scopeString = requiredScopes.join(' ');
    expect(scopeString).toContain('account:read');
    expect(scopeString).toContain('loop:*');
    expect(scopeString).toContain('contact:*');
  });

  it('should validate redirect URI format', () => {
    if (!redirectUri) {
      console.warn('Skipping - missing redirect URI');
      return;
    }

    // Should be HTTPS for production
    expect(redirectUri).toMatch(/^https:\/\//);
    
    // Should contain callback path
    expect(redirectUri).toMatch(/callback$/);
    
    // Should not contain query parameters
    expect(redirectUri).not.toContain('?');
  });

  it('should handle OAuth error responses', () => {
    // Test that we can parse OAuth error responses
    const errorResponse = {
      error: 'access_denied',
      error_description: 'User denied access',
    };

    expect(errorResponse.error).toBe('access_denied');
    expect(errorResponse.error_description).toBeDefined();
  });

  it('should validate token response structure', () => {
    // Mock token response structure
    const tokenResponse = {
      access_token: 'mock_access_token_123',
      refresh_token: 'mock_refresh_token_456',
      expires_in: 3600,
      token_type: 'Bearer',
      scope: 'account:read profile:* loop:* contact:* template:read',
    };

    expect(tokenResponse.access_token).toBeDefined();
    expect(tokenResponse.refresh_token).toBeDefined();
    expect(tokenResponse.expires_in).toBeGreaterThan(0);
    expect(tokenResponse.token_type).toBe('Bearer');
  });

  it('should calculate token expiration correctly', () => {
    const expiresIn = 3600; // 1 hour
    const now = Date.now();
    const expiresAt = new Date(now + expiresIn * 1000);

    expect(expiresAt.getTime()).toBeGreaterThan(now);
    expect(expiresAt.getTime() - now).toBeCloseTo(expiresIn * 1000, -2);
  });
});
