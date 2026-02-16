/**
 * Error Handler Utilities
 * Provides comprehensive error handling, retry logic, and user-friendly messages
 */

// Error types
export const ErrorTypes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  API_ERROR: 'API_ERROR',
  RATE_LIMIT: 'RATE_LIMIT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};

// User-friendly error messages
export const ErrorMessages = {
  NETWORK_ERROR: 'Network connection failed. Please check your internet connection and try again.',
  AUTH_ERROR: 'Authentication failed. Please reconnect to Dotloop.',
  TOKEN_EXPIRED: 'Your session has expired. Please reconnect to Dotloop.',
  API_ERROR: 'Failed to fetch data from Dotloop. Please try again.',
  RATE_LIMIT: 'Too many requests. Please wait a moment and try again.',
  VALIDATION_ERROR: 'Invalid data received. Please try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
};

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000, // ms
  maxDelay: 10000, // ms
  backoffMultiplier: 2,
  retryableErrors: ['NETWORK_ERROR', 'RATE_LIMIT', 'API_ERROR'],
};

/**
 * Classify error into error type
 */
export function classifyError(error) {
  if (!error) return ErrorTypes.UNKNOWN_ERROR;

  // Network errors
  if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
    return ErrorTypes.NETWORK_ERROR;
  }

  // Auth errors
  if (error.status === 401 || error.message?.includes('Unauthorized')) {
    return ErrorTypes.AUTH_ERROR;
  }

  // Token expired
  if (error.status === 401 && error.message?.includes('expired')) {
    return ErrorTypes.TOKEN_EXPIRED;
  }

  // Rate limit
  if (error.status === 429) {
    return ErrorTypes.RATE_LIMIT;
  }

  // API errors
  if (error.status >= 400 && error.status < 500) {
    return ErrorTypes.API_ERROR;
  }

  // Server errors (5xx)
  if (error.status >= 500) {
    return ErrorTypes.API_ERROR;
  }

  // Validation errors
  if (error.message?.includes('validation') || error.message?.includes('invalid')) {
    return ErrorTypes.VALIDATION_ERROR;
  }

  return ErrorTypes.UNKNOWN_ERROR;
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(errorType) {
  return ErrorMessages[errorType] || ErrorMessages.UNKNOWN_ERROR;
}

/**
 * Get recovery suggestions based on error type
 */
export function getRecoverySuggestions(errorType) {
  const suggestions = {
    NETWORK_ERROR: [
      'Check your internet connection',
      'Disable VPN if you\'re using one',
      'Try again in a few moments',
    ],
    AUTH_ERROR: [
      'Click "Disconnect" and reconnect to Dotloop',
      'Make sure your Dotloop account is active',
      'Check that you\'re using the correct account',
    ],
    TOKEN_EXPIRED: [
      'Click "Reconnect" to log in again',
      'Your session will be refreshed automatically',
    ],
    API_ERROR: [
      'Try again in a few moments',
      'Check if Dotloop service is operational',
      'Contact support if the issue persists',
    ],
    RATE_LIMIT: [
      'Wait a few seconds before trying again',
      'Reduce the number of requests',
      'Try again with fewer transactions',
    ],
    VALIDATION_ERROR: [
      'Check your data format',
      'Try extracting again',
      'Contact support if the issue persists',
    ],
    UNKNOWN_ERROR: [
      'Try again',
      'Refresh the page',
      'Contact support if the issue persists',
    ],
  };

  return suggestions[errorType] || suggestions.UNKNOWN_ERROR;
}

/**
 * Retry logic with exponential backoff
 */
export async function retryWithBackoff(fn, options = {}) {
  const config = { ...RETRY_CONFIG, ...options };
  let lastError;
  let delay = config.initialDelay;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const errorType = classifyError(error);

      // Don't retry non-retryable errors
      if (!config.retryableErrors.includes(errorType)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === config.maxRetries) {
        throw error;
      }

      // Wait before retrying
      console.log(`[Retry] Attempt ${attempt + 1}/${config.maxRetries}, waiting ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));

      // Increase delay for next attempt (exponential backoff)
      delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
    }
  }

  throw lastError;
}

/**
 * Format error for logging
 */
export function formatErrorForLogging(error, context = '') {
  return {
    timestamp: new Date().toISOString(),
    context,
    errorType: classifyError(error),
    message: error?.message || 'Unknown error',
    status: error?.status,
    stack: error?.stack,
  };
}

/**
 * Log error to storage for diagnostics
 */
export async function logErrorToDiagnostics(error, context = '') {
  try {
    const errorLog = formatErrorForLogging(error, context);
    const { diagnostics = [] } = await chrome.storage.local.get('diagnostics');

    // Keep only last 50 errors
    const updatedLogs = [errorLog, ...diagnostics].slice(0, 50);

    await chrome.storage.local.set({ diagnostics: updatedLogs });
    console.log('[Diagnostics] Error logged:', errorLog);
  } catch (e) {
    console.error('[Diagnostics] Failed to log error:', e);
  }
}

/**
 * Get diagnostic logs
 */
export async function getDiagnosticLogs() {
  try {
    const { diagnostics = [] } = await chrome.storage.local.get('diagnostics');
    return diagnostics;
  } catch (e) {
    console.error('[Diagnostics] Failed to retrieve logs:', e);
    return [];
  }
}

/**
 * Clear diagnostic logs
 */
export async function clearDiagnosticLogs() {
  try {
    await chrome.storage.local.set({ diagnostics: [] });
    console.log('[Diagnostics] Logs cleared');
  } catch (e) {
    console.error('[Diagnostics] Failed to clear logs:', e);
  }
}
