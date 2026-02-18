/**
 * Cache Manager
 * Handles caching of extracted transaction data with timestamps and refresh logic
 */

const CACHE_KEY = 'dotloop_extracted_data';
const CACHE_TIMESTAMP_KEY = 'dotloop_cache_timestamp';
const CACHE_ACCOUNT_KEY = 'dotloop_cache_account';
const CACHE_EXPIRY_HOURS = 24; // Cache expires after 24 hours

/**
 * Save extracted data to cache
 */
export async function cacheData(data, accountId) {
  console.log('[Cache Manager] Caching', data.length, 'transactions for account', accountId);
  
  const cacheData = {
    transactions: data,
    timestamp: Date.now(),
    accountId: accountId,
    version: 1
  };
  
  await chrome.storage.local.set({
    [CACHE_KEY]: cacheData.transactions,
    [CACHE_TIMESTAMP_KEY]: cacheData.timestamp,
    [CACHE_ACCOUNT_KEY]: cacheData.accountId
  });
  
  console.log('[Cache Manager] Data cached successfully');
}

/**
 * Get cached data
 */
export async function getCachedData() {
  return new Promise((resolve) => {
    chrome.storage.local.get([CACHE_KEY, CACHE_TIMESTAMP_KEY, CACHE_ACCOUNT_KEY], (result) => {
      if (result[CACHE_KEY] && result[CACHE_TIMESTAMP_KEY]) {
        resolve({
          transactions: result[CACHE_KEY],
          timestamp: result[CACHE_TIMESTAMP_KEY],
          accountId: result[CACHE_ACCOUNT_KEY]
        });
      } else {
        resolve(null);
      }
    });
  });
}

/**
 * Check if cache is still valid
 */
export async function isCacheValid() {
  const cached = await getCachedData();
  
  if (!cached) {
    return false;
  }
  
  const ageHours = (Date.now() - cached.timestamp) / (1000 * 60 * 60);
  const isValid = ageHours < CACHE_EXPIRY_HOURS;
  
  console.log('[Cache Manager] Cache age:', ageHours.toFixed(1), 'hours, valid:', isValid);
  
  return isValid;
}

/**
 * Get cache age in minutes
 */
export async function getCacheAge() {
  const cached = await getCachedData();
  
  if (!cached) {
    return null;
  }
  
  const ageMinutes = Math.floor((Date.now() - cached.timestamp) / (1000 * 60));
  return ageMinutes;
}

/**
 * Format cache timestamp for display
 */
export async function getFormattedCacheTime() {
  const cached = await getCachedData();
  
  if (!cached) {
    return 'Never';
  }
  
  const date = new Date(cached.timestamp);
  const now = new Date();
  const diffMinutes = Math.floor((now - date) / (1000 * 60));
  
  if (diffMinutes < 1) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  } else if (diffMinutes < 1440) {
    const hours = Math.floor(diffMinutes / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffMinutes / 1440);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
}

/**
 * Clear cache
 */
export async function clearCache() {
  console.log('[Cache Manager] Clearing cache');
  
  await chrome.storage.local.remove([
    CACHE_KEY,
    CACHE_TIMESTAMP_KEY,
    CACHE_ACCOUNT_KEY
  ]);
}

/**
 * Get cache statistics
 */
export async function getCacheStats() {
  const cached = await getCachedData();
  
  if (!cached) {
    return null;
  }
  
  return {
    transactionCount: cached.transactions.length,
    timestamp: cached.timestamp,
    accountId: cached.accountId,
    formattedTime: await getFormattedCacheTime(),
    ageMinutes: Math.floor((Date.now() - cached.timestamp) / (1000 * 60)),
    isValid: await isCacheValid()
  };
}
