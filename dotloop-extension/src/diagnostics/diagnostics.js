/**
 * Diagnostics Page
 * Displays error logs and troubleshooting information
 */

/**
 * Load and display error logs
 */
async function loadLogs() {
  try {
    const { diagnostics = [] } = await chrome.storage.local.get('diagnostics');
    
    const logsList = document.getElementById('logs-list');
    
    if (!diagnostics || diagnostics.length === 0) {
      logsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <p>No error logs yet. Everything is working smoothly!</p>
        </div>
      `;
      updateStats([]);
      return;
    }

    // Sort logs by timestamp (newest first)
    const sortedLogs = diagnostics.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    logsList.innerHTML = sortedLogs.map(log => `
      <div class="log-entry">
        <div class="timestamp">${formatTimestamp(log.timestamp)}</div>
        <div><span class="error-type ${log.errorType}">${log.errorType}</span></div>
        <div class="error-message">${escapeHtml(log.message)}</div>
        <div class="context">${escapeHtml(log.context || 'N/A')}</div>
      </div>
    `).join('');

    updateStats(sortedLogs);
  } catch (error) {
    console.error('[Diagnostics] Error loading logs:', error);
    showMessage('Failed to load logs', 'error');
  }
}

/**
 * Update statistics
 */
function updateStats(logs) {
  const stats = {
    total: logs.length,
    networkErrors: logs.filter(l => l.errorType === 'NETWORK_ERROR').length,
    authErrors: logs.filter(l => l.errorType === 'AUTH_ERROR').length,
    apiErrors: logs.filter(l => l.errorType === 'API_ERROR').length,
  };

  document.getElementById('total-errors').textContent = stats.total;
  document.getElementById('network-errors').textContent = stats.networkErrors;
  document.getElementById('auth-errors').textContent = stats.authErrors;
  document.getElementById('api-errors').textContent = stats.apiErrors;
}

/**
 * Refresh logs
 */
function refreshLogs() {
  loadLogs();
  showMessage('Logs refreshed', 'success');
}

/**
 * Clear all logs
 */
async function clearLogs() {
  if (!confirm('Are you sure you want to clear all error logs? This cannot be undone.')) {
    return;
  }

  try {
    await chrome.storage.local.remove('diagnostics');
    loadLogs();
    showMessage('All logs cleared', 'success');
  } catch (error) {
    console.error('[Diagnostics] Error clearing logs:', error);
    showMessage('Failed to clear logs', 'error');
  }
}

/**
 * Export logs as JSON
 */
async function exportLogs() {
  try {
    const { diagnostics = [] } = await chrome.storage.local.get('diagnostics');
    
    if (diagnostics.length === 0) {
      showMessage('No logs to export', 'error');
      return;
    }

    const dataStr = JSON.stringify(diagnostics, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `dotloop-extension-logs-${new Date().toISOString()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showMessage('Logs exported successfully', 'success');
  } catch (error) {
    console.error('[Diagnostics] Error exporting logs:', error);
    showMessage('Failed to export logs', 'error');
  }
}

/**
 * Format timestamp
 */
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

/**
 * Show message
 */
function showMessage(text, type) {
  const messageEl = document.getElementById('message');
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  
  setTimeout(() => {
    messageEl.className = 'message';
  }, 3000);
}

// Load logs on page load
document.addEventListener('DOMContentLoaded', loadLogs);

// Auto-refresh logs every 5 seconds
setInterval(loadLogs, 5000);
