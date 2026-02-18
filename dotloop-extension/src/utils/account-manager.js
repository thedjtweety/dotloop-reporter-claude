/**
 * Account Manager
 * Manages multiple Dotloop OAuth accounts with secure token storage
 */

const ACCOUNTS_STORAGE_KEY = 'dotloop_accounts';
const CURRENT_ACCOUNT_KEY = 'dotloop_current_account';

/**
 * Get all stored accounts
 */
export async function getAllAccounts() {
  try {
    const { [ACCOUNTS_STORAGE_KEY]: accounts = {} } = await chrome.storage.local.get(ACCOUNTS_STORAGE_KEY);
    return Object.values(accounts);
  } catch (error) {
    console.error('[AccountManager] Error getting all accounts:', error);
    return [];
  }
}

/**
 * Get current active account
 */
export async function getCurrentAccount() {
  try {
    const { [CURRENT_ACCOUNT_KEY]: accountId } = await chrome.storage.local.get(CURRENT_ACCOUNT_KEY);
    const { [ACCOUNTS_STORAGE_KEY]: accounts = {} } = await chrome.storage.local.get(ACCOUNTS_STORAGE_KEY);
    
    if (accountId && accounts[accountId]) {
      return accounts[accountId];
    }
    
    // If no current account, return first available
    const allAccounts = Object.values(accounts);
    if (allAccounts.length > 0) {
      return allAccounts[0];
    }
    
    return null;
  } catch (error) {
    console.error('[AccountManager] Error getting current account:', error);
    return null;
  }
}

/**
 * Set current active account
 */
export async function setCurrentAccount(accountId) {
  try {
    await chrome.storage.local.set({ [CURRENT_ACCOUNT_KEY]: accountId });
    console.log('[AccountManager] Current account set to:', accountId);
  } catch (error) {
    console.error('[AccountManager] Error setting current account:', error);
  }
}

/**
 * Add or update account
 */
export async function saveAccount(account) {
  try {
    const { [ACCOUNTS_STORAGE_KEY]: accounts = {} } = await chrome.storage.local.get(ACCOUNTS_STORAGE_KEY);
    
    // Generate account ID from email if not provided
    const accountId = account.id || generateAccountId(account.email);
    
    const updatedAccount = {
      ...account,
      id: accountId,
      createdAt: account.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    accounts[accountId] = updatedAccount;
    
    await chrome.storage.local.set({ [ACCOUNTS_STORAGE_KEY]: accounts });
    
    // Set as current account if it's the first one
    const allAccounts = Object.keys(accounts);
    if (allAccounts.length === 1) {
      await setCurrentAccount(accountId);
    }
    
    console.log('[AccountManager] Account saved:', accountId);
    return updatedAccount;
  } catch (error) {
    console.error('[AccountManager] Error saving account:', error);
    throw error;
  }
}

/**
 * Remove account and revoke token
 */
export async function removeAccount(accountId) {
  try {
    const { [ACCOUNTS_STORAGE_KEY]: accounts = {} } = await chrome.storage.local.get(ACCOUNTS_STORAGE_KEY);
    const account = accounts[accountId];
    
    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }
    
    // Revoke token if available
    if (account.refreshToken) {
      await revokeToken(account.refreshToken);
    }
    
    // Remove account
    delete accounts[accountId];
    await chrome.storage.local.set({ [ACCOUNTS_STORAGE_KEY]: accounts });
    
    // If this was the current account, switch to another
    const { [CURRENT_ACCOUNT_KEY]: currentId } = await chrome.storage.local.get(CURRENT_ACCOUNT_KEY);
    if (currentId === accountId) {
      const remainingAccounts = Object.keys(accounts);
      if (remainingAccounts.length > 0) {
        await setCurrentAccount(remainingAccounts[0]);
      } else {
        await chrome.storage.local.remove(CURRENT_ACCOUNT_KEY);
      }
    }
    
    console.log('[AccountManager] Account removed:', accountId);
  } catch (error) {
    console.error('[AccountManager] Error removing account:', error);
    throw error;
  }
}

/**
 * Get account by ID
 */
export async function getAccount(accountId) {
  try {
    const { [ACCOUNTS_STORAGE_KEY]: accounts = {} } = await chrome.storage.local.get(ACCOUNTS_STORAGE_KEY);
    return accounts[accountId] || null;
  } catch (error) {
    console.error('[AccountManager] Error getting account:', error);
    return null;
  }
}

/**
 * Check if account exists
 */
export async function accountExists(accountId) {
  const account = await getAccount(accountId);
  return account !== null;
}

/**
 * Get account count
 */
export async function getAccountCount() {
  const accounts = await getAllAccounts();
  return accounts.length;
}

/**
 * Clear all accounts
 */
export async function clearAllAccounts() {
  try {
    await chrome.storage.local.remove([ACCOUNTS_STORAGE_KEY, CURRENT_ACCOUNT_KEY]);
    console.log('[AccountManager] All accounts cleared');
  } catch (error) {
    console.error('[AccountManager] Error clearing accounts:', error);
  }
}

/**
 * Revoke token on Dotloop server
 */
async function revokeToken(refreshToken) {
  try {
    const response = await fetch('https://auth.dotloop.com/oauth/token/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        token: refreshToken,
        client_id: 'fb051fb6-07e4-4dbb-8d8a-1b5a858e74c3',
        client_secret: '05db2ac3-4b65-4a48-9370-a66c28c048ce',
      }),
    });
    
    if (response.ok) {
      console.log('[AccountManager] Token revoked successfully');
    } else {
      console.warn('[AccountManager] Token revocation failed:', response.status);
    }
  } catch (error) {
    console.error('[AccountManager] Error revoking token:', error);
    // Don't throw - token revocation failure shouldn't block account removal
  }
}

/**
 * Generate account ID from email
 */
function generateAccountId(email) {
  // Use email hash as account ID
  return `account_${email.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
}

/**
 * Format account display name
 */
export function formatAccountName(account) {
  if (account.displayName) {
    return account.displayName;
  }
  
  if (account.email) {
    return account.email.split('@')[0];
  }
  
  return 'Unknown Account';
}

/**
 * Check if token is expired
 */
export function isTokenExpired(account) {
  if (!account.expiresAt) {
    return false;
  }
  
  const expirationTime = new Date(account.expiresAt).getTime();
  const currentTime = new Date().getTime();
  
  // Consider token expired if less than 5 minutes remaining
  return currentTime > expirationTime - (5 * 60 * 1000);
}

/**
 * Get token expiration status
 */
export function getTokenStatus(account) {
  if (!account.expiresAt) {
    return 'unknown';
  }
  
  const expirationTime = new Date(account.expiresAt).getTime();
  const currentTime = new Date().getTime();
  const timeRemaining = expirationTime - currentTime;
  
  if (timeRemaining < 0) {
    return 'expired';
  }
  
  if (timeRemaining < 5 * 60 * 1000) {
    return 'expiring_soon';
  }
  
  return 'valid';
}

/**
 * Format time remaining until expiration
 */
export function formatTimeRemaining(account) {
  if (!account.expiresAt) {
    return 'Unknown';
  }
  
  const expirationTime = new Date(account.expiresAt).getTime();
  const currentTime = new Date().getTime();
  const timeRemaining = expirationTime - currentTime;
  
  if (timeRemaining < 0) {
    return 'Expired';
  }
  
  const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
  const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  
  return `${minutes}m`;
}
