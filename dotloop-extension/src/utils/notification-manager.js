/**
 * Notification Manager
 * Handles browser notifications for extraction completion and errors
 */

/**
 * Request notification permission
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('[Notifications] Browser does not support notifications');
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('[Notifications] Error requesting permission:', error);
      return false;
    }
  }
  
  return false;
}

/**
 * Check if notifications are enabled
 */
export function areNotificationsEnabled() {
  return 'Notification' in window && Notification.permission === 'granted';
}

/**
 * Show extraction complete notification
 */
export async function notifyExtractionComplete(transactionCount, totalValue) {
  if (!areNotificationsEnabled()) {
    return;
  }
  
  try {
    const notification = new Notification('Dotloop Reporter', {
      title: 'Extraction Complete!',
      body: `Successfully extracted ${transactionCount} transaction${transactionCount !== 1 ? 's' : ''} (${formatCurrency(totalValue)})`,
      icon: '/icon-128.png',
      badge: '/icon-128.png',
      tag: 'dotloop-extraction',
      requireInteraction: false
    });
    
    // Click notification to open dashboard
    notification.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://dotloopreport.com' });
      notification.close();
    });
    
    console.log('[Notifications] Extraction complete notification sent');
  } catch (error) {
    console.error('[Notifications] Error showing notification:', error);
  }
}

/**
 * Show extraction error notification
 */
export async function notifyExtractionError(errorMessage) {
  if (!areNotificationsEnabled()) {
    return;
  }
  
  try {
    const notification = new Notification('Dotloop Reporter', {
      title: 'Extraction Failed',
      body: errorMessage || 'An error occurred during extraction. Please try again.',
      icon: '/icon-128.png',
      badge: '/icon-128.png',
      tag: 'dotloop-error',
      requireInteraction: true
    });
    
    console.log('[Notifications] Error notification sent');
  } catch (error) {
    console.error('[Notifications] Error showing notification:', error);
  }
}

/**
 * Show account switched notification
 */
export async function notifyAccountSwitched(accountName) {
  if (!areNotificationsEnabled()) {
    return;
  }
  
  try {
    new Notification('Dotloop Reporter', {
      title: 'Account Switched',
      body: `Now using: ${accountName}`,
      icon: '/icon-128.png',
      badge: '/icon-128.png',
      tag: 'dotloop-account',
      requireInteraction: false
    });
    
    console.log('[Notifications] Account switched notification sent');
  } catch (error) {
    console.error('[Notifications] Error showing notification:', error);
  }
}

/**
 * Show cache refreshed notification
 */
export async function notifyCacheRefreshed(transactionCount) {
  if (!areNotificationsEnabled()) {
    return;
  }
  
  try {
    new Notification('Dotloop Reporter', {
      title: 'Data Refreshed',
      body: `Cache updated with ${transactionCount} transaction${transactionCount !== 1 ? 's' : ''}`,
      icon: '/icon-128.png',
      badge: '/icon-128.png',
      tag: 'dotloop-refresh',
      requireInteraction: false
    });
    
    console.log('[Notifications] Cache refreshed notification sent');
  } catch (error) {
    console.error('[Notifications] Error showing notification:', error);
  }
}

/**
 * Format currency for display
 */
function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}
