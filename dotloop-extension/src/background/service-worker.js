/**
 * Dotloop Reporting Tool - Background Service Worker
 * Handles background tasks, auto-sync, and messaging
 */

console.log('[Dotloop Extension] Service worker loaded');

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Dotloop Extension] Extension installed');
  
  // Initialize default settings
  chrome.storage.local.get('settings', (result) => {
    if (!result.settings) {
      const defaultSettings = {
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
      chrome.storage.local.set({ settings: defaultSettings });
      console.log('[Service Worker] Default settings initialized');
    }
  });
  
  setupAutoSync();
});

/**
 * Setup auto-sync based on settings
 */
function setupAutoSync() {
  chrome.storage.local.get('settings', (result) => {
    const settings = result.settings || {};
    const frequency = settings.syncFrequency;
    
    chrome.alarms.clearAll();
    
    if (frequency === 'disabled') {
      console.log('[Service Worker] Auto-sync disabled');
      return;
    }
    
    const frequencyMap = {
      '5': 5,
      '15': 15,
      '30': 30,
      '60': 60,
      '1440': 1440,
    };
    
    const minutes = frequencyMap[frequency];
    if (minutes) {
      chrome.alarms.create('autoSync', { periodInMinutes: minutes });
      console.log('[Service Worker] Auto-sync scheduled every', minutes, 'minutes');
    }
  });
}

// Listen for alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'autoSync') {
    console.log('[Service Worker] Auto-sync triggered');
    performAutoSync();
  }
});

/**
 * Perform auto-sync
 */
function performAutoSync() {
  try {
    chrome.storage.local.get(['settings', 'activeAccount'], (result) => {
      const settings = result.settings || {};
      const account = result.activeAccount;
      
      if (!account) {
        console.log('[Service Worker] No active account for auto-sync');
        return;
      }
      
      console.log('[Service Worker] Starting auto-sync for account:', account.name);
      chrome.runtime.sendMessage({
        action: 'autoSync',
        account: account,
        settings: settings,
      }).catch(() => {
        // Ignore if no receiver
      });
    });
  } catch (error) {
    console.error('[Service Worker] Error performing auto-sync:', error);
  }
}

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Dotloop Extension] Message received:', request.action);

  if (request.action === 'saveData') {
    chrome.storage.local.set({
      extractedData: request.data,
      extractedAt: new Date().toISOString()
    }, () => {
      console.log('[Dotloop Extension] Data saved to storage');
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'getData') {
    chrome.storage.local.get(['extractedData', 'extractedAt'], (result) => {
      console.log('[Dotloop Extension] Data retrieved from storage');
      sendResponse({
        success: true,
        data: result.extractedData || [],
        extractedAt: result.extractedAt || null
      });
    });
    return true;
  }

  if (request.action === 'clearData') {
    chrome.storage.local.remove(['extractedData', 'extractedAt'], () => {
      console.log('[Dotloop Extension] Data cleared from storage');
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'settingsUpdated') {
    console.log('[Service Worker] Settings updated, re-configuring auto-sync');
    setupAutoSync();
    sendResponse({ success: true });
    return true;
  }
});

console.log('[Dotloop Extension] Service worker ready');
