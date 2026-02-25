/**
 * Offline Queue Storage
 * Persists queued requests to localStorage so they survive page refreshes
 * Allows users to close browser and have uploads resume when they return
 */

export interface PersistedQueueItem {
  id: string;
  fileData: string; // Base64 encoded file data
  fileName: string;
  fileSize: number;
  uploadedAt: number;
  retryCount: number;
  lastRetryAt?: number;
  metadata?: Record<string, any>;
}

export interface QueueStorageState {
  items: PersistedQueueItem[];
  lastCleanupAt: number;
  version: number;
}

const STORAGE_KEY = 'dotloop_upload_queue';
const STORAGE_VERSION = 1;
const MAX_QUEUE_SIZE = 50; // Max items in queue
const MAX_ITEM_SIZE = 50 * 1024 * 1024; // 50MB per item
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_RETRY_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Offline Queue Storage Manager
 */
export class OfflineQueueStorage {
  private storageKey: string;
  private maxQueueSize: number;
  private maxItemSize: number;

  constructor(
    storageKey = STORAGE_KEY,
    maxQueueSize = MAX_QUEUE_SIZE,
    maxItemSize = MAX_ITEM_SIZE
  ) {
    this.storageKey = storageKey;
    this.maxQueueSize = maxQueueSize;
    this.maxItemSize = maxItemSize;
  }

  /**
   * Add item to queue
   */
  addItem(item: Omit<PersistedQueueItem, 'uploadedAt' | 'retryCount'>): boolean {
    try {
      // Validate file size
      if (item.fileSize > this.maxItemSize) {
        console.warn(`File ${item.fileName} exceeds max size of ${this.maxItemSize} bytes`);
        return false;
      }

      const state = this.getState();

      // Check queue size
      if (state.items.length >= this.maxQueueSize) {
        console.warn(`Queue is full (${this.maxQueueSize} items)`);
        return false;
      }

      // Create persisted item
      const persistedItem: PersistedQueueItem = {
        ...item,
        uploadedAt: Date.now(),
        retryCount: 0,
      };

      state.items.push(persistedItem);
      this.setState(state);

      console.log(`[OfflineQueue] Added item: ${item.fileName} (${item.fileSize} bytes)`);
      return true;
    } catch (error) {
      console.error('[OfflineQueue] Failed to add item:', error);
      return false;
    }
  }

  /**
   * Get all queued items
   */
  getItems(): PersistedQueueItem[] {
    try {
      const state = this.getState();
      return state.items;
    } catch (error) {
      console.error('[OfflineQueue] Failed to get items:', error);
      return [];
    }
  }

  /**
   * Get item by ID
   */
  getItem(id: string): PersistedQueueItem | null {
    try {
      const state = this.getState();
      return state.items.find(item => item.id === id) || null;
    } catch (error) {
      console.error('[OfflineQueue] Failed to get item:', error);
      return null;
    }
  }

  /**
   * Update item (e.g., increment retry count)
   */
  updateItem(id: string, updates: Partial<PersistedQueueItem>): boolean {
    try {
      const state = this.getState();
      const index = state.items.findIndex(item => item.id === id);

      if (index === -1) {
        console.warn(`[OfflineQueue] Item not found: ${id}`);
        return false;
      }

      state.items[index] = {
        ...state.items[index],
        ...updates,
        lastRetryAt: Date.now(),
      };

      this.setState(state);
      return true;
    } catch (error) {
      console.error('[OfflineQueue] Failed to update item:', error);
      return false;
    }
  }

  /**
   * Remove item from queue
   */
  removeItem(id: string): boolean {
    try {
      const state = this.getState();
      const initialLength = state.items.length;
      state.items = state.items.filter(item => item.id !== id);

      if (state.items.length < initialLength) {
        this.setState(state);
        console.log(`[OfflineQueue] Removed item: ${id}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('[OfflineQueue] Failed to remove item:', error);
      return false;
    }
  }

  /**
   * Clear all items from queue
   */
  clear(): void {
    try {
      const state: QueueStorageState = {
        items: [],
        lastCleanupAt: Date.now(),
        version: STORAGE_VERSION,
      };
      this.setState(state);
      console.log('[OfflineQueue] Cleared all items');
    } catch (error) {
      console.error('[OfflineQueue] Failed to clear queue:', error);
    }
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    totalItems: number;
    totalSize: number;
    oldestItem?: PersistedQueueItem;
    newestItem?: PersistedQueueItem;
  } {
    try {
      const items = this.getItems();
      const totalSize = items.reduce((sum, item) => sum + item.fileSize, 0);

      return {
        totalItems: items.length,
        totalSize,
        oldestItem: items.length > 0 ? items[0] : undefined,
        newestItem: items.length > 0 ? items[items.length - 1] : undefined,
      };
    } catch (error) {
      console.error('[OfflineQueue] Failed to get stats:', error);
      return { totalItems: 0, totalSize: 0 };
    }
  }

  /**
   * Clean up old items
   */
  cleanup(): void {
    try {
      const state = this.getState();
      const now = Date.now();

      // Remove items older than MAX_RETRY_AGE
      state.items = state.items.filter(
        item => now - item.uploadedAt < MAX_RETRY_AGE
      );

      // Remove items with too many retries
      state.items = state.items.filter(item => item.retryCount < 10);

      state.lastCleanupAt = now;
      this.setState(state);

      console.log(`[OfflineQueue] Cleanup complete. ${state.items.length} items remaining`);
    } catch (error) {
      console.error('[OfflineQueue] Failed to cleanup:', error);
    }
  }

  /**
   * Check if cleanup is needed
   */
  needsCleanup(): boolean {
    try {
      const state = this.getState();
      return Date.now() - state.lastCleanupAt > CLEANUP_INTERVAL;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current storage state
   */
  private getState(): QueueStorageState {
    try {
      const stored = localStorage.getItem(this.storageKey);

      if (!stored) {
        return {
          items: [],
          lastCleanupAt: Date.now(),
          version: STORAGE_VERSION,
        };
      }

      const state = JSON.parse(stored) as QueueStorageState;

      // Validate version
      if (state.version !== STORAGE_VERSION) {
        console.warn('[OfflineQueue] Storage version mismatch, clearing queue');
        return {
          items: [],
          lastCleanupAt: Date.now(),
          version: STORAGE_VERSION,
        };
      }

      return state;
    } catch (error) {
      console.error('[OfflineQueue] Failed to parse storage state:', error);
      return {
        items: [],
        lastCleanupAt: Date.now(),
        version: STORAGE_VERSION,
      };
    }
  }

  /**
   * Set storage state
   */
  private setState(state: QueueStorageState): void {
    try {
      const serialized = JSON.stringify(state);

      // Check storage quota
      if (serialized.length > 5 * 1024 * 1024) {
        console.warn('[OfflineQueue] Storage quota exceeded, removing oldest items');
        state.items = state.items.slice(-Math.floor(state.items.length / 2));
      }

      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.error('[OfflineQueue] Storage quota exceeded');
        // Try to free up space by removing oldest items
        const state = this.getState();
        state.items = state.items.slice(-Math.floor(state.items.length / 2));
        try {
          localStorage.setItem(this.storageKey, JSON.stringify(state));
        } catch (retryError) {
          console.error('[OfflineQueue] Failed to save state after cleanup:', retryError);
        }
      } else {
        console.error('[OfflineQueue] Failed to set storage state:', error);
      }
    }
  }
}

/**
 * Global offline queue storage instance
 */
export const offlineQueueStorage = new OfflineQueueStorage();

/**
 * Helper to convert File to base64
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Extract base64 part after comma
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Helper to convert base64 back to File
 */
export function base64ToFile(base64: string, fileName: string, mimeType = 'text/csv'): File {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new File([bytes], fileName, { type: mimeType });
}
