/**
 * Dotloop OAuth Handler
 * Manages OAuth 2.0 flow for extension with multi-account support
 */

import { saveAccount, getCurrentAccount, removeAccount, getAllAccounts, setCurrentAccount } from '../utils/account-manager.js';

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

  await chrome.storage.local.set({ oauth_state: state });

  const authUrl = new URL(DOTLOOP_AUTH_URL);
  authUrl.searchParams.set('client_id', CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('prompt', 'login');

  const authWindow = window.open(authUrl.toString(), 'dotloop-oauth', 'width=600,height=700');

  if (!authWindow) {
    throw new Error('Failed to open OAuth window. Please check if popups are blocked.');
  }

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

    const messageHandler = async (request, sender, sendResponse) => {
      if (request.type === 'OAUTH_CALLBACK') {
        clearInterval(checkInterval);
        chrome.runtime.onMessage.removeListener(messageHandler);

        try {
          if (request.error) {
            reject(new Error(request.error));
          } else {
            const account = await exchangeCodeForToken(request.code);
            const savedAccount = await saveAccount(account);
            resolve(savedAccount);
          }
        } catch (error) {
          reject(error);
        }
      }
    };

    chrome.runtime.onMessage.addListener(messageHandler);

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
export async function exchangeCodeForToken(code) {
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

  const userProfile = await fetchUserProfile(tokenData.access_token);

  const account = {
    email: userProfile.email,
    displayName: userProfile.displayName || userProfile.email,
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
    tokenType: tokenData.token_type,
  };

  console.log('[Dotloop Extension] Token obtained for:', account.email);
  return account;
}

/**
 * Fetch user profile from Dotloop API
 */
async function fetchUserProfile(accessToken) {
  try {
    const response = await fetch('https://api.dotloop.com/v1/profile', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user profile');
    }

    const profile = await response.json();
    return {
      email: profile.email || profile.emailAddress || 'unknown@dotloop.com',
      displayName: profile.displayName || profile.name || profile.email,
    };
  } catch (error) {
    console.error('[Dotloop Extension] Error fetching user profile:', error);
    return {
      email: 'unknown@dotloop.com',
      displayName: 'Unknown User',
    };
  }
}

/**
 * Get valid access token (refresh if needed)
 */
export async function getValidAccessToken() {
  const account = await getCurrentAccount();

  if (!account) {
    throw new Error('No account connected. Please connect to Dotloop first.');
  }

  const expiresAt = new Date(account.expiresAt).getTime();
  if (Date.now() >= expiresAt) {
    console.log('[Dotloop Extension] Token expired, refreshing...');
    return await refreshAccessToken(account.refreshToken);
  }

  return account.accessToken;
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken) {
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

  const account = await getCurrentAccount();
  if (account) {
    const updatedAccount = {
      ...account,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || account.refreshToken,
      expiresAt: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
    };
    await saveAccount(updatedAccount);
    return tokenData.access_token;
  }

  throw new Error('No account found to refresh');
}

/**
 * Get connection status with details
 */
export async function getConnectionStatus() {
  try {
    const account = await getCurrentAccount();

    if (!account) {
      return {
        connected: false,
        status: 'disconnected',
        message: 'Not connected to Dotloop',
      };
    }

    const expiresAt = new Date(account.expiresAt).getTime();
    const timeUntilExpiry = expiresAt - Date.now();
    const TOKEN_REFRESH_BUFFER = 5 * 60 * 1000;

    if (timeUntilExpiry < 0) {
      return {
        connected: false,
        status: 'expired',
        message: 'Token has expired. Please reconnect.',
        expiresAt: new Date(expiresAt),
        account: account.email,
      };
    }

    if (timeUntilExpiry < TOKEN_REFRESH_BUFFER) {
      return {
        connected: true,
        status: 'expiring_soon',
        message: 'Token expiring soon. Will auto-refresh.',
        expiresAt: new Date(expiresAt),
        timeUntilExpiry,
        account: account.email,
      };
    }

    return {
      connected: true,
      status: 'connected',
      message: 'Connected to Dotloop',
      expiresAt: new Date(expiresAt),
      timeUntilExpiry,
      account: account.email,
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
  const intervalId = setInterval(async () => {
    try {
      const status = await getConnectionStatus();

      if (status.status === 'expiring_soon') {
        console.log('[OAuth] Auto-refreshing token...');
        const account = await getCurrentAccount();
        if (account && account.refreshToken) {
          await refreshAccessToken(account.refreshToken);
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
export async function revokeToken(accountId) {
  const { dotloop_accounts = {} } = await chrome.storage.local.get('dotloop_accounts');
  const account = accountId ? dotloop_accounts[accountId] : await getCurrentAccount();

  if (account && account.accessToken) {
    try {
      await fetch(DOTLOOP_REVOKE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`,
        },
        body: new URLSearchParams({
          token: account.accessToken,
        }),
      });
    } catch (error) {
      console.error('[Dotloop Extension] Error revoking token:', error);
    }
  }

  console.log('[Dotloop Extension] Token revoked');
}

/**
 * Check if user is connected
 */
export async function isConnected() {
  const account = await getCurrentAccount();
  return !!account;
}

/**
 * Get all connected accounts
 */
export async function getConnectedAccounts() {
  return await getAllAccounts();
}

/**
 * Switch to different account
 */
export async function switchAccount(accountId) {
  await setCurrentAccount(accountId);
  console.log('[OAuth] Switched to account:', accountId);
}

/**
 * Disconnect account
 */
export async function disconnectAccount(accountId) {
  await removeAccount(accountId);
  console.log('[OAuth] Account disconnected:', accountId);
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
