/**
 * Dotloop OAuth Handler
 * Manages OAuth 2.0 flow for extension
 */

const DOTLOOP_AUTH_URL = 'https://auth.dotloop.com/oauth/authorize';
const DOTLOOP_TOKEN_URL = 'https://auth.dotloop.com/oauth/token';
const DOTLOOP_REVOKE_URL = 'https://auth.dotloop.com/oauth/token/revoke';

const CLIENT_ID = 'fb051fb6-07e4-4dbb-8d8a-1b5a858e74c3';
const CLIENT_SECRET = '05db2ac3-4b65-4a48-9370-a66c28c048ce';
const REDIRECT_URI = 'https://dotloopreport.com/api/dotloop/callback';

/**
 * Start OAuth flow
 */
export async function startOAuthFlow() {
  console.log('[Dotloop Extension] Starting OAuth flow...');

  const state = generateRandomState();
  const scope = 'loops:read loops:write profile email';

  // Store state for verification
  await chrome.storage.local.set({ oauth_state: state });

  const authUrl = new URL(DOTLOOP_AUTH_URL);
  authUrl.searchParams.set('client_id', CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('state', state);

  // Open OAuth window
  const authWindow = window.open(authUrl.toString(), 'dotloop-oauth', 'width=600,height=700');

  if (!authWindow) {
    throw new Error('Failed to open OAuth window. Please check if popups are blocked.');
  }

  // Wait for OAuth callback
  return new Promise((resolve, reject) => {
    const checkInterval = setInterval(() => {
      try {
        if (authWindow.closed) {
          clearInterval(checkInterval);
          reject(new Error('OAuth window was closed'));
          return;
        }
      } catch (e) {
        // Ignore cross-origin errors
      }
    }, 500);

    // Listen for message from callback
    const messageHandler = async (request, sender, sendResponse) => {
      if (request.type === 'OAUTH_CALLBACK') {
        clearInterval(checkInterval);
        chrome.runtime.onMessage.removeListener(messageHandler);

        try {
          if (request.error) {
            reject(new Error(request.error));
          } else {
            const token = await exchangeCodeForToken(request.code);
            resolve(token);
          }
        } catch (error) {
          reject(error);
        }
      }
    };

    chrome.runtime.onMessage.addListener(messageHandler);

    // Timeout after 5 minutes
    setTimeout(() => {
      clearInterval(checkInterval);
      chrome.runtime.onMessage.removeListener(messageHandler);
      reject(new Error('OAuth flow timeout'));
    }, 5 * 60 * 1000);
  });
}

/**
 * Exchange authorization code for access token
 */
async function exchangeCodeForToken(code) {
  console.log('[Dotloop Extension] Exchanging code for token...');

  const response = await fetch(DOTLOOP_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
  }

  const tokenData = await response.json();

  // Store token
  const tokenInfo = {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_at: Date.now() + (tokenData.expires_in * 1000),
    token_type: tokenData.token_type,
  };

  await chrome.storage.local.set({ dotloop_token: tokenInfo });

  console.log('[Dotloop Extension] Token stored successfully');
  return tokenInfo;
}

/**
 * Get valid access token (refresh if needed)
 */
export async function getValidAccessToken() {
  const result = await chrome.storage.local.get('dotloop_token');
  const tokenInfo = result.dotloop_token;

  if (!tokenInfo) {
    throw new Error('No token found. Please connect to Dotloop first.');
  }

  // Check if token is expired
  if (Date.now() >= tokenInfo.expires_at) {
    console.log('[Dotloop Extension] Token expired, refreshing...');
    return await refreshAccessToken(tokenInfo.refresh_token);
  }

  return tokenInfo.access_token;
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(refreshToken) {
  const response = await fetch(DOTLOOP_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  const tokenData = await response.json();

  const tokenInfo = {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token || refreshToken,
    expires_at: Date.now() + (tokenData.expires_in * 1000),
    token_type: tokenData.token_type,
  };

  await chrome.storage.local.set({ dotloop_token: tokenInfo });
  return tokenInfo.access_token;
}

/**
 * Get connection status with details
 */
export async function getConnectionStatus() {
  try {
    const { dotloop_token } = await chrome.storage.local.get('dotloop_token');

    if (!dotloop_token) {
      return {
        connected: false,
        status: 'disconnected',
        message: 'Not connected to Dotloop',
      };
    }

    const timeUntilExpiry = dotloop_token.expires_at - Date.now();
    const TOKEN_REFRESH_BUFFER = 5 * 60 * 1000; // 5 minutes

    if (timeUntilExpiry < 0) {
      return {
        connected: false,
        status: 'expired',
        message: 'Token has expired. Please reconnect.',
        expiresAt: new Date(dotloop_token.expires_at),
      };
    }

    if (timeUntilExpiry < TOKEN_REFRESH_BUFFER) {
      return {
        connected: true,
        status: 'expiring_soon',
        message: 'Token expiring soon. Will auto-refresh.',
        expiresAt: new Date(dotloop_token.expires_at),
        timeUntilExpiry,
      };
    }

    return {
      connected: true,
      status: 'connected',
      message: 'Connected to Dotloop',
      expiresAt: new Date(dotloop_token.expires_at),
      timeUntilExpiry,
    };
  } catch (error) {
    console.error('[OAuth] Error getting connection status:', error);
    return {
      connected: false,
      status: 'error',
      message: 'Error checking connection status',
    };
  }
}

/**
 * Setup token refresh interval
 */
export function setupTokenRefreshInterval() {
  const TOKEN_REFRESH_BUFFER = 5 * 60 * 1000; // 5 minutes
  
  // Check token every 30 seconds
  const intervalId = setInterval(async () => {
    try {
      const status = await getConnectionStatus();
      
      if (status.status === 'expiring_soon') {
        console.log('[OAuth] Auto-refreshing token...');
        const { dotloop_token } = await chrome.storage.local.get('dotloop_token');
        if (dotloop_token && dotloop_token.refresh_token) {
          await refreshAccessToken(dotloop_token.refresh_token);
        }
      }
    } catch (error) {
      console.error('[OAuth] Auto-refresh failed:', error);
    }
  }, 30000);

  return intervalId;
}

/**
 * Clear token refresh interval
 */
export function clearTokenRefreshInterval(intervalId) {
  if (intervalId) {
    clearInterval(intervalId);
    console.log('[OAuth] Token refresh interval cleared');
  }
}

/**
 * Revoke token and disconnect
 */
export async function revokeToken() {
  const result = await chrome.storage.local.get('dotloop_token');
  const tokenInfo = result.dotloop_token;

  if (tokenInfo && tokenInfo.access_token) {
    try {
      await fetch(DOTLOOP_REVOKE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`,
        },
        body: new URLSearchParams({
          token: tokenInfo.access_token,
        }),
      });
    } catch (error) {
      console.error('[Dotloop Extension] Error revoking token:', error);
    }
  }

  // Clear stored token
  await chrome.storage.local.remove('dotloop_token');
  console.log('[Dotloop Extension] Token revoked and cleared');
}

/**
 * Check if user is connected
 */
export async function isConnected() {
  const result = await chrome.storage.local.get('dotloop_token');
  return !!result.dotloop_token;
}

/**
 * Generate random state for OAuth
 */
function generateRandomState() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let state = '';
  for (let i = 0; i < 32; i++) {
    state += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return state;
}
