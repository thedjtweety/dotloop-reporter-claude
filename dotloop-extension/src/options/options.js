/**
 * Dotloop Reporter - Options/Settings Page
 * Handles extension configuration and preferences
 */

console.log('[Options] Settings page loaded');

// Default settings
const DEFAULT_SETTINGS = {
  syncFrequency: 'disabled',
  syncLimit: 100,
  syncOnStartup: false,
  statusFilters: ['Active', 'Closed', 'Archived', 'Pending'],
  propertyFilters: ['Single Family', 'Condo', 'Townhouse', 'Multi-Family', 'Land'],
  minPrice: 0,
  maxPrice: 0,
  encryptCache: true,
  cacheRetention: 30,
  sendAnalytics: true,
  apiTimeout: 30,
  logLevel: 'warning',
};

// DOM Elements
const elements = {
  syncFrequency: document.getElementById('sync-frequency'),
  syncLimit: document.getElementById('sync-limit'),
  syncOnStartup: document.getElementById('sync-on-startup'),
  statusFilters: document.querySelectorAll('.status-filter'),
  propertyFilters: document.querySelectorAll('.property-filter'),
  minPrice: document.getElementById('min-price'),
  maxPrice: document.getElementById('max-price'),
  encryptCache: document.getElementById('encrypt-cache'),
  cacheRetention: document.getElementById('cache-retention'),
  sendAnalytics: document.getElementById('send-analytics'),
  apiTimeout: document.getElementById('api-timeout'),
  logLevel: document.getElementById('log-level'),
  clearCacheBtn: document.getElementById('clear-cache-btn'),
  exportSettingsBtn: document.getElementById('export-settings-btn'),
  importSettingsBtn: document.getElementById('import-settings-btn'),
  resetSettingsBtn: document.getElementById('reset-settings-btn'),
  manageAccountsBtn: document.getElementById('manage-accounts-btn'),
  accountsList: document.getElementById('accounts-list'),
  saveStatus: document.getElementById('save-status'),
  saveMessage: document.getElementById('save-message'),
  extensionVersion: document.getElementById('extension-version'),
  lastSync: document.getElementById('last-sync'),
  cachedCount: document.getElementById('cached-count'),
  cacheSize: document.getElementById('cache-size'),
  importFile: document.getElementById('import-file'),
};

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  console.log('[Options] Initializing settings page');
  loadSettings();
  setupEventListeners();
  updateExtensionInfo();
  loadConnectedAccounts();
});

/**
 * Load settings from Chrome storage
 */
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get('settings');
    const settings = result.settings || DEFAULT_SETTINGS;

    // Load sync settings
    elements.syncFrequency.value = settings.syncFrequency || DEFAULT_SETTINGS.syncFrequency;
    elements.syncLimit.value = settings.syncLimit || DEFAULT_SETTINGS.syncLimit;
    elements.syncOnStartup.checked = settings.syncOnStartup || false;

    // Load status filters
    elements.statusFilters.forEach(checkbox => {
      checkbox.checked = (settings.statusFilters || DEFAULT_SETTINGS.statusFilters).includes(checkbox.value);
    });

    // Load property filters
    elements.propertyFilters.forEach(checkbox => {
      checkbox.checked = (settings.propertyFilters || DEFAULT_SETTINGS.propertyFilters).includes(checkbox.value);
    });

    // Load price filters
    elements.minPrice.value = settings.minPrice || 0;
    elements.maxPrice.value = settings.maxPrice || 0;

    // Load data & privacy settings
    elements.encryptCache.checked = settings.encryptCache !== false;
    elements.cacheRetention.value = settings.cacheRetention || 30;
    elements.sendAnalytics.checked = settings.sendAnalytics !== false;

    // Load advanced settings
    elements.apiTimeout.value = settings.apiTimeout || 30;
    elements.logLevel.value = settings.logLevel || 'warning';

    console.log('[Options] Settings loaded:', settings);
  } catch (error) {
    console.error('[Options] Error loading settings:', error);
  }
}

/**
 * Save settings to Chrome storage
 */
async function saveSettings() {
  try {
    const settings = {
      syncFrequency: elements.syncFrequency.value,
      syncLimit: parseInt(elements.syncLimit.value),
      syncOnStartup: elements.syncOnStartup.checked,
      statusFilters: Array.from(elements.statusFilters)
        .filter(cb => cb.checked)
        .map(cb => cb.value),
      propertyFilters: Array.from(elements.propertyFilters)
        .filter(cb => cb.checked)
        .map(cb => cb.value),
      minPrice: parseInt(elements.minPrice.value) || 0,
      maxPrice: parseInt(elements.maxPrice.value) || 0,
      encryptCache: elements.encryptCache.checked,
      cacheRetention: parseInt(elements.cacheRetention.value),
      sendAnalytics: elements.sendAnalytics.checked,
      apiTimeout: parseInt(elements.apiTimeout.value),
      logLevel: elements.logLevel.value,
      lastSaved: new Date().toISOString(),
    };

    await chrome.storage.local.set({ settings });
    console.log('[Options] Settings saved:', settings);
    showSaveStatus('Settings saved successfully');

    // Notify popup and background script
    chrome.runtime.sendMessage({
      action: 'settingsUpdated',
      settings: settings,
    }).catch(() => {
      // Ignore if no receiver
    });
  } catch (error) {
    console.error('[Options] Error saving settings:', error);
    showSaveStatus('Error saving settings', 'error');
  }
}

/**
 * Setup event listeners for all controls
 */
function setupEventListeners() {
  // Auto-save on change
  const allInputs = document.querySelectorAll(
    'input[type="text"], input[type="number"], select, input[type="checkbox"]'
  );

  allInputs.forEach(input => {
    input.addEventListener('change', saveSettings);
  });

  // Button listeners
  elements.clearCacheBtn.addEventListener('click', handleClearCache);
  elements.exportSettingsBtn.addEventListener('click', handleExportSettings);
  elements.importSettingsBtn.addEventListener('click', () => elements.importFile.click());
  elements.resetSettingsBtn.addEventListener('click', handleResetSettings);
  elements.manageAccountsBtn.addEventListener('click', handleManageAccounts);

  // File input for import
  elements.importFile.addEventListener('change', handleImportSettings);
}

/**
 * Show save status message
 */
function showSaveStatus(message, type = 'success') {
  elements.saveMessage.textContent = message;
  elements.saveStatus.style.display = 'block';

  if (type === 'error') {
    elements.saveStatus.style.background = '#ef4444';
  } else {
    elements.saveStatus.style.background = '#10b981';
  }

  setTimeout(() => {
    elements.saveStatus.style.display = 'none';
  }, 3000);
}

/**
 * Handle clear cache
 */
async function handleClearCache() {
  if (!confirm('Are you sure you want to delete all cached transactions? This cannot be undone.')) {
    return;
  }

  try {
    await chrome.storage.local.set({ cachedTransactions: [] });
    showSaveStatus('Cache cleared successfully');
    updateExtensionInfo();
    console.log('[Options] Cache cleared');
  } catch (error) {
    console.error('[Options] Error clearing cache:', error);
    showSaveStatus('Error clearing cache', 'error');
  }
}

/**
 * Handle export settings
 */
async function handleExportSettings() {
  try {
    const result = await chrome.storage.local.get(['settings', 'cachedTransactions']);
    const exportData = {
      settings: result.settings || DEFAULT_SETTINGS,
      exportDate: new Date().toISOString(),
      version: '1.0.0',
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dotloop-reporter-settings-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);

    showSaveStatus('Settings exported successfully');
    console.log('[Options] Settings exported');
  } catch (error) {
    console.error('[Options] Error exporting settings:', error);
    showSaveStatus('Error exporting settings', 'error');
  }
}

/**
 * Handle import settings
 */
async function handleImportSettings(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const importData = JSON.parse(text);

    if (!importData.settings || !importData.version) {
      throw new Error('Invalid settings file format');
    }

    await chrome.storage.local.set({ settings: importData.settings });
    loadSettings();
    showSaveStatus('Settings imported successfully');
    console.log('[Options] Settings imported');
  } catch (error) {
    console.error('[Options] Error importing settings:', error);
    showSaveStatus('Error importing settings: ' + error.message, 'error');
  }

  // Reset file input
  event.target.value = '';
}

/**
 * Handle reset to defaults
 */
async function handleResetSettings() {
  if (!confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
    return;
  }

  try {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
    loadSettings();
    showSaveStatus('Settings reset to defaults');
    console.log('[Options] Settings reset to defaults');
  } catch (error) {
    console.error('[Options] Error resetting settings:', error);
    showSaveStatus('Error resetting settings', 'error');
  }
}

/**
 * Handle manage accounts
 */
function handleManageAccounts() {
  chrome.runtime.openOptionsPage?.();
  // Or open a modal to manage accounts
  alert('Account management coming soon. Use the extension popup to add/remove accounts.');
}

/**
 * Load and display connected accounts
 */
async function loadConnectedAccounts() {
  try {
    const result = await chrome.storage.local.get('connectedAccounts');
    const accounts = result.connectedAccounts || [];

    elements.accountsList.innerHTML = '';

    if (accounts.length === 0) {
      elements.accountsList.innerHTML = '<p style="color: #999; font-size: 14px;">No accounts connected yet</p>';
      return;
    }

    accounts.forEach(account => {
      const accountItem = document.createElement('div');
      accountItem.className = 'account-item';
      accountItem.innerHTML = `
        <div class="account-info">
          <div class="account-name">${escapeHtml(account.name || 'Unknown')}</div>
          <div class="account-email">${escapeHtml(account.email || 'No email')}</div>
        </div>
        <div class="account-actions">
          <button class="btn btn-secondary" onclick="removeAccount('${account.id}')">Remove</button>
        </div>
      `;
      elements.accountsList.appendChild(accountItem);
    });

    console.log('[Options] Loaded', accounts.length, 'connected accounts');
  } catch (error) {
    console.error('[Options] Error loading accounts:', error);
  }
}

/**
 * Remove account
 */
async function removeAccount(accountId) {
  if (!confirm('Are you sure you want to remove this account?')) {
    return;
  }

  try {
    const result = await chrome.storage.local.get('connectedAccounts');
    const accounts = (result.connectedAccounts || []).filter(a => a.id !== accountId);
    await chrome.storage.local.set({ connectedAccounts: accounts });
    loadConnectedAccounts();
    showSaveStatus('Account removed');
    console.log('[Options] Account removed:', accountId);
  } catch (error) {
    console.error('[Options] Error removing account:', error);
    showSaveStatus('Error removing account', 'error');
  }
}

/**
 * Update extension info
 */
async function updateExtensionInfo() {
  try {
    const manifest = chrome.runtime.getManifest();
    elements.extensionVersion.textContent = manifest.version;

    // Get cache info
    const result = await chrome.storage.local.get(['cachedTransactions', 'lastSync']);
    const transactions = result.cachedTransactions || [];
    const lastSync = result.lastSync || 'Never';

    elements.cachedCount.textContent = transactions.length;
    elements.lastSync.textContent = lastSync === 'Never'
      ? 'Never'
      : new Date(lastSync).toLocaleString();

    // Calculate cache size
    const cacheSize = JSON.stringify(transactions).length;
    elements.cacheSize.textContent = formatBytes(cacheSize);

    console.log('[Options] Extension info updated');
  } catch (error) {
    console.error('[Options] Error updating extension info:', error);
  }
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

console.log('[Options] Page ready');
