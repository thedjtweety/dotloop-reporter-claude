/**
 * Dotloop Reporting Tool - Popup Script
 * Handles UI interactions and OAuth authentication
 */

console.log('[Dotloop Extension] Popup script loaded');

// Import OAuth and API modules
import { startOAuthFlow, isConnected, revokeToken, getValidAccessToken, getConnectionStatus, getConnectedAccounts, switchAccount, disconnectAccount } from '../oauth/oauth-handler.js';
import { fetchAllTransactions } from '../api/dotloop-api.js';
import { classifyError, getUserFriendlyMessage, getRecoverySuggestions, logErrorToDiagnostics } from '../utils/error-handler.js';
import { formatAccountName } from '../utils/account-manager.js';
import { cacheData, getCachedData, isCacheValid, getFormattedCacheTime, getCacheStats, clearCache } from '../utils/cache-manager.js';
import { requestNotificationPermission, areNotificationsEnabled, notifyExtractionComplete, notifyExtractionError, notifyAccountSwitched, notifyCacheRefreshed } from '../utils/notification-manager.js';

// DOM Elements
const connectBtn = document.getElementById('connect-btn');
const extractBtn = document.getElementById('extract-btn');
const downloadBtn = document.getElementById('download-btn');
const sendBtn = document.getElementById('send-btn');
const resetBtn = document.getElementById('reset-btn');
const disconnectBtn = document.getElementById('disconnect-btn');
const retryBtn = document.getElementById('retry-btn');
const errorResetBtn = document.getElementById('error-reset-btn');

const idleState = document.getElementById('idle-state');
const connectedState = document.getElementById('connected-state');
const loadingState = document.getElementById('loading-state');
const successState = document.getElementById('success-state');
const errorState = document.getElementById('error-state');

const transactionCount = document.getElementById('transaction-count');
const totalValue = document.getElementById('total-value');
const extractedTime = document.getElementById('extracted-time');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const loadingMessage = document.getElementById('loading-message');
const errorMessage = document.getElementById('error-message');
const connectionStatus = document.getElementById('connection-status');

// Cache and notification elements
const cacheStatus = document.getElementById('cache-status');
const cacheTimestamp = document.getElementById('cache-timestamp');
const refreshCacheBtn = document.getElementById('refresh-cache-btn');
const removeAccountBtn = document.getElementById('remove-account-btn');
const accountDropdown = document.getElementById('account-dropdown');

let extractedData = [];

// Event Listeners
if (connectBtn) connectBtn.addEventListener('click', handleConnect);
if (extractBtn) extractBtn.addEventListener('click', startExtraction);
if (downloadBtn) downloadBtn.addEventListener('click', downloadCSV);
if (sendBtn) sendBtn.addEventListener('click', sendToDashboard);
if (resetBtn) resetBtn.addEventListener('click', resetUI);
if (disconnectBtn) disconnectBtn.addEventListener('click', handleDisconnect);
if (retryBtn) retryBtn.addEventListener('click', startExtraction);
if (errorResetBtn) errorResetBtn.addEventListener('click', resetUI);
if (refreshCacheBtn) refreshCacheBtn.addEventListener('click', refreshCache);
if (removeAccountBtn) removeAccountBtn.addEventListener('click', handleRemoveAccount);

// Initialize on popup open
initializePopup();

/**
 * Initialize popup state
 */
async function initializePopup() {
  console.log('[Dotloop Extension] Initializing popup...');

  // Check connection status
  const connected = await isConnected();
  console.log('[Dotloop Extension] Connected:', connected);

  if (connected) {
    // Load saved data if available
    loadSavedData();
    showConnectedState();
  } else {
    showIdleState();
  }
}

/**
 * Show idle state (not connected)
 */
function showIdleState() {
  idleState.style.display = 'flex';
  connectedState.style.display = 'none';
  loadingState.style.display = 'none';
  successState.style.display = 'none';
  errorState.style.display = 'none';
}

/**
 * Show connected state
 */
async function showConnectedState() {
  idleState.style.display = 'none';
  connectedState.style.display = 'flex';
  loadingState.style.display = 'none';
  successState.style.display = 'none';
  errorState.style.display = 'none';

  if (connectionStatus) {
    connectionStatus.textContent = '✓ Connected to Dotloop';
  }
  
  await updateAccountSelector();
}

/**
 * Handle OAuth connection with error handling
 */
async function handleConnect() {
  console.log('[Dotloop Extension] Starting OAuth connection...');
  showLoadingState('Connecting to Dotloop...');

  try {
    const token = await startOAuthFlow();
    console.log('[Dotloop Extension] OAuth successful');
    
    // Verify connection status
    const status = await getConnectionStatus();
    if (status.connected) {
      showConnectedState();
    } else {
      throw new Error('Connection verification failed');
    }
  } catch (error) {
    console.error('[Dotloop Extension] OAuth error:', error);
    await logErrorToDiagnostics(error, 'handleConnect');
    showErrorState(error);
  }
}

/**
 * Handle disconnection with error handling
 */
async function handleDisconnect() {
  console.log('[Dotloop Extension] Disconnecting...');

  try {
    await revokeToken();
    extractedData = [];
    await chrome.storage.local.remove('extractedData');
    await chrome.storage.local.remove('diagnostics');
    showIdleState();
  } catch (error) {
    console.error('[Dotloop Extension] Disconnect error:', error);
    await logErrorToDiagnostics(error, 'handleDisconnect');
    showErrorState(error);
  }
}

/**
 * Load previously extracted data
 */
function loadSavedData() {
  chrome.storage.local.get(['extractedData', 'extractedAt'], (result) => {
    if (result.extractedData && result.extractedData.length > 0) {
      extractedData = result.extractedData;
      showSuccessState(result.extractedAt);
    }
  });
}

/**
 * Start extraction from Dotloop API with retry logic
 */
async function startExtraction() {
  console.log('[Dotloop Extension] Starting API extraction...');
  showLoadingState('Fetching transactions from Dotloop...');

  try {
    // Check connection status first
    const status = await getConnectionStatus();
    if (!status.connected) {
      throw new Error('Not connected to Dotloop. Please reconnect.');
    }

    const accessToken = await getValidAccessToken();
    const transactions = await fetchAllTransactions(accessToken);

    if (!transactions || transactions.length === 0) {
      throw new Error('No transactions found. Check your Dotloop account.');
    }

    extractedData = transactions;
    console.log(`[Dotloop Extension] Extraction successful: ${extractedData.length} transactions`);

    // Save to storage and cache
    const currentAccount = await getConnectionStatus();
    chrome.storage.local.set({
      extractedData: extractedData,
      extractedAt: new Date().toISOString()
    });
    
    // Cache the data
    await cacheData(extractedData, currentAccount.accountId);
    
    // Request notification permission on first extraction
    await requestNotifications();
    
    // Show success notification
    const totalValue = extractedData.reduce((sum, t) => sum + (t.salePrice || t.price || 0), 0);
    await notifyExtractionComplete(extractedData.length, totalValue);

    showSuccessState();
    await updateCacheStatus();
  } catch (error) {
    console.error('[Dotloop Extension] Extraction error:', error);
    await logErrorToDiagnostics(error, 'startExtraction');
    showErrorState(error);
  }
}

/**
 * Show loading state
 */
function showLoadingState(message = 'Loading...') {
  idleState.style.display = 'none';
  connectedState.style.display = 'none';
  successState.style.display = 'none';
  errorState.style.display = 'none';
  loadingState.style.display = 'flex';

  if (loadingMessage) {
    loadingMessage.textContent = message;
  }

  progressFill.style.width = '0%';
  progressText.textContent = '0%';

  // Simulate progress
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 30;
    if (progress > 90) progress = 90;
    progressFill.style.width = progress + '%';
    progressText.textContent = Math.round(progress) + '%';

    if (progress >= 90) clearInterval(interval);
  }, 500);
}

/**
 * Show success state
 */
function showSuccessState(extractedAt) {
  idleState.style.display = 'none';
  connectedState.style.display = 'none';
  loadingState.style.display = 'none';
  errorState.style.display = 'none';
  successState.style.display = 'flex';

  // Update results
  transactionCount.textContent = extractedData.length.toLocaleString();

  const totalVal = extractedData.reduce((sum, t) => {
    return sum + (t.salePrice || t.price || 0);
  }, 0);
  totalValue.textContent = '$' + totalVal.toLocaleString('en-US', { maximumFractionDigits: 0 });

  if (extractedAt) {
    const date = new Date(extractedAt);
    extractedTime.textContent = date.toLocaleTimeString();
  } else {
    extractedTime.textContent = 'Just now';
  }

  // Complete progress
  progressFill.style.width = '100%';
  progressText.textContent = '100%';
}

/**
 * Show error state with recovery suggestions
 */
function showErrorState(error) {
  idleState.style.display = 'none';
  connectedState.style.display = 'none';
  loadingState.style.display = 'none';
  successState.style.display = 'none';
  errorState.style.display = 'flex';

  // Classify error and get user-friendly message
  const errorType = classifyError(error);
  const userMessage = getUserFriendlyMessage(errorType);
  const suggestions = getRecoverySuggestions(errorType);

  // Display error message
  errorMessage.innerHTML = `
    <div style="margin-bottom: 12px;">
      <strong>${userMessage}</strong>
    </div>
    <div style="font-size: 12px; color: #999; margin-bottom: 12px;">
      <strong>What you can try:</strong>
      <ul style="margin: 8px 0 0 20px; padding: 0;">
        ${suggestions.map(s => `<li>${s}</li>`).join('')}
      </ul>
    </div>
    ${error?.message ? `<div style="font-size: 11px; color: #666; margin-top: 12px; padding-top: 12px; border-top: 1px solid #ddd;">Technical details: ${error.message}</div>` : ''}
  `;

  // Log error for diagnostics
  logErrorToDiagnostics(error, 'popup-error');
}

/**
 * Reset UI to connected state
 */
function resetUI() {
  loadSavedData();
}

/**
 * Download CSV file
 */
function downloadCSV() {
  if (extractedData.length === 0) {
    alert('No data to download');
    return;
  }

  // Convert to CSV
  const headers = Object.keys(extractedData[0]);
  const csvContent = [
    headers.join(','),
    ...extractedData.map(row =>
      headers.map(header => {
        const value = row[header];
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `dotloop-transactions-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  console.log('[Dotloop Extension] CSV downloaded');
}

/**
 * Send data to Reporting Tool dashboard
 */
function sendToDashboard() {
  if (extractedData.length === 0) {
    alert('No data to send');
    return;
  }

  try {
    // Prepare data payload
    const dataToSend = {
      transactions: extractedData,
      extractedAt: new Date().toISOString(),
      source: 'extension'
    };

    // Convert to base64 for URL transmission
    const jsonString = JSON.stringify(dataToSend);
    const base64Data = btoa(unescape(encodeURIComponent(jsonString)));

    // Open dashboard with data in URL hash (hash is not sent to server)
    const dashboardUrl = `https://dotloopreport.com?source=extension#data=${base64Data}`;

    chrome.tabs.create({ url: dashboardUrl });

    console.log('[Dotloop Extension] Opening dashboard with', extractedData.length, 'transactions');
  } catch (error) {
    console.error('[Dotloop Extension] Error sending to dashboard:', error);
    showErrorState('Failed to open dashboard: ' + error.message);
  }
}


/**
 * Update account dropdown with connected accounts
 */
async function updateAccountSelector() {
  const accountDropdown = document.getElementById('account-dropdown');
  const accountSelector = document.getElementById('account-selector');
  const addAccountBtn = document.getElementById('add-account-btn');
  
  if (!accountDropdown || !accountSelector) return;
  
  try {
    const accounts = await getConnectedAccounts();
    
    if (accounts.length <= 1) {
      accountSelector.style.display = 'none';
      return;
    }
    
    accountSelector.style.display = 'block';
    
    accountDropdown.innerHTML = '';
    accounts.forEach(account => {
      const option = document.createElement('option');
      option.value = account.id;
      option.textContent = formatAccountName(account);
      accountDropdown.appendChild(option);
    });
    
    accountDropdown.addEventListener('change', async (e) => {
      await switchAccount(e.target.value);
      console.log('[Popup] Switched to account:', e.target.value);
    });
    
    if (addAccountBtn) {
      addAccountBtn.addEventListener('click', handleConnect);
    }
  } catch (error) {
    console.error('[Popup] Error updating account selector:', error);
  }
}


/**
 * Refresh cached data from Dotloop API
 */
async function refreshCache() {
  console.log('[Popup] Refreshing cache...');
  showLoadingState('Refreshing data...');
  
  try {
    await startExtraction();
  } catch (error) {
    console.error('[Popup] Error refreshing cache:', error);
    showErrorState(error);
  }
}

/**
 * Handle account removal
 */
async function handleRemoveAccount() {
  if (!accountDropdown || !accountDropdown.value) {
    alert('No account selected');
    return;
  }
  
  const confirmed = confirm('Are you sure you want to remove this account? This action cannot be undone.');
  if (!confirmed) {
    return;
  }
  
  try {
    const accountId = accountDropdown.value;
    console.log('[Popup] Removing account:', accountId);
    
    await disconnectAccount(accountId);
    
    // Refresh account selector
    await updateAccountSelector();
    
    // Show notification if enabled
    if (areNotificationsEnabled()) {
      await notifyAccountSwitched('Account removed');
    }
    
    console.log('[Popup] Account removed successfully');
  } catch (error) {
    console.error('[Popup] Error removing account:', error);
    showErrorState(error);
  }
}

/**
 * Update cache status display
 */
async function updateCacheStatus() {
  const stats = await getCacheStats();
  
  if (!stats || !stats.isValid) {
    if (cacheStatus) {
      cacheStatus.style.display = 'none';
    }
    return;
  }
  
  if (cacheStatus) {
    cacheStatus.style.display = 'block';
    if (cacheTimestamp) {
      cacheTimestamp.textContent = stats.formattedTime;
    }
  }
}

/**
 * Request notification permission on first extraction
 */
async function requestNotifications() {
  try {
    const granted = await requestNotificationPermission();
    if (granted) {
      console.log('[Popup] Notification permission granted');
    }
  } catch (error) {
    console.error('[Popup] Error requesting notification permission:', error);
  }
}


/**
 * Get connected accounts from storage
 */
async function getConnectedAccounts() {
  try {
    const result = await chrome.storage.local.get('connectedAccounts');
    return result.connectedAccounts || [];
  } catch (error) {
    console.error('[Popup] Error getting connected accounts:', error);
    return [];
  }
}

/**
 * Save connected accounts to storage
 */
async function saveConnectedAccounts(accounts) {
  try {
    await chrome.storage.local.set({ connectedAccounts: accounts });
    console.log('[Popup] Saved', accounts.length, 'connected accounts');
  } catch (error) {
    console.error('[Popup] Error saving connected accounts:', error);
  }
}

/**
 * Switch to a different account
 */
async function switchAccount(accountId) {
  try {
    const accounts = await getConnectedAccounts();
    const account = accounts.find(a => a.id === accountId);
    
    if (!account) {
      throw new Error('Account not found');
    }
    
    await chrome.storage.local.set({ activeAccount: account });
    console.log('[Popup] Switched to account:', account.name);
    await loadSavedData();
  } catch (error) {
    console.error('[Popup] Error switching account:', error);
    showErrorState(error);
  }
}

/**
 * Disconnect an account
 */
async function disconnectAccount(accountId) {
  try {
    const accounts = await getConnectedAccounts();
    const updated = accounts.filter(a => a.id !== accountId);
    await saveConnectedAccounts(updated);
    
    const active = await chrome.storage.local.get('activeAccount');
    if (active.activeAccount?.id === accountId) {
      if (updated.length > 0) {
        await switchAccount(updated[0].id);
      } else {
        await chrome.storage.local.set({ activeAccount: null });
      }
    }
    
    console.log('[Popup] Disconnected account:', accountId);
  } catch (error) {
    console.error('[Popup] Error disconnecting account:', error);
    throw error;
  }
}

/**
 * Format account name for display
 */
function formatAccountName(account) {
  if (!account) return 'Unknown Account';
  return account.name || account.email || 'Unknown Account';
}

/**
 * Open extension settings page
 */
function openSettings() {
  chrome.runtime.openOptionsPage();
}

console.log('[Popup] Multi-account functions loaded');
