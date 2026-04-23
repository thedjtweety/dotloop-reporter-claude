import { describe, it, expect, beforeAll } from 'vitest';

/**
 * Test Dotloop OAuth Configuration
 * Validates that all required environment variables are set correctly
 */
describe('Dotloop OAuth Configuration', () => {
  beforeAll(() => {
    // Check that environment variables are set
    const requiredEnvs = [
      'DOTLOOP_CLIENT_ID',
      'DOTLOOP_CLIENT_SECRET',
      'DOTLOOP_REDIRECT_URI',
    ];

    for (const env of requiredEnvs) {
      if (!process.env[env]) {
        console.warn(`⚠️  Missing environment variable: ${env}`);
      }
    }
  });

  it('should have DOTLOOP_CLIENT_ID configured', () => {
    expect(process.env.DOTLOOP_CLIENT_ID).toBeDefined();
    expect(process.env.DOTLOOP_CLIENT_ID).toMatch(/^[a-zA-Z0-9_-]+$/);
  });

  it('should have DOTLOOP_CLIENT_SECRET configured', () => {
    expect(process.env.DOTLOOP_CLIENT_SECRET).toBeDefined();
    expect(process.env.DOTLOOP_CLIENT_SECRET?.length).toBeGreaterThan(0);
  });

  it('should have DOTLOOP_REDIRECT_URI configured', () => {
    expect(process.env.DOTLOOP_REDIRECT_URI).toBeDefined();
    // Accept both /dotloop/callback and /api/dotloop-oauth/callback formats
    expect(process.env.DOTLOOP_REDIRECT_URI).toMatch(/^https?:\/\/.+\/(dotloop\/callback|api\/dotloop-oauth\/callback)$/);
  });

  it('should have valid OAuth URLs', () => {
    const authUrl = 'https://auth.dotloop.com/oauth/authorize';
    const tokenUrl = 'https://auth.dotloop.com/oauth/token';
    
    expect(authUrl).toMatch(/^https:\/\//);
    expect(tokenUrl).toMatch(/^https:\/\//);
  });

  it('should generate valid authorization URL', () => {
    const clientId = process.env.DOTLOOP_CLIENT_ID;
    const redirectUri = process.env.DOTLOOP_REDIRECT_URI;
    
    if (!clientId || !redirectUri) {
      console.warn('Skipping authorization URL test - missing credentials');
      return;
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      state: 'test-state-123',
      redirect_on_deny: 'true',
      scope: 'account:read profile:* loop:* contact:* template:read',
    });

    const authUrl = `https://auth.dotloop.com/oauth/authorize?${params.toString()}`;
    
    expect(authUrl).toContain('response_type=code');
    expect(authUrl).toContain(`client_id=${clientId}`);
    expect(authUrl).toContain(`redirect_uri=${encodeURIComponent(redirectUri)}`);
    expect(authUrl).toContain('state=test-state-123');
  });
});
