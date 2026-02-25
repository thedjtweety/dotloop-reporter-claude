/**
 * IndexedDB Storage Utility
 * Provides large-capacity storage for CSV uploads and transaction data
 * Typical capacity: 50MB+ (much larger than localStorage's 5-10MB)
 * 
 * Uses LZ-string compression to reduce data size by 60-80%
 */

import * as LZ from 'lz-string';
import { DotloopRecord } from './csvParser';

const DB_NAME = 'dotloop-reporter';
const DB_VERSION = 1;
const UPLOADS_STORE = 'csv_uploads';
const TRANSACTIONS_STORE = 'transactions';

export interface StoredUpload {
  id: string;
  fileName: string;
  uploadDate: number; // timestamp
  recordCount: number;
  data: DotloopRecord[];
  metadata?: {
    fileSize?: number;
    processingTime?: number;
    dataQuality?: number; // 0-100 percentage
  };
}

class IndexedDBManager {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[IndexedDB] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[IndexedDB] Database opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        console.log('[IndexedDB] Upgrading database schema...');

        // Create uploads store
        if (!db.objectStoreNames.contains(UPLOADS_STORE)) {
          const uploadsStore = db.createObjectStore(UPLOADS_STORE, { keyPath: 'id' });
          uploadsStore.createIndex('uploadDate', 'uploadDate', { unique: false });
          uploadsStore.createIndex('fileName', 'fileName', { unique: false });
          console.log('[IndexedDB] Created uploads store');
        }

        // Create transactions store
        if (!db.objectStoreNames.contains(TRANSACTIONS_STORE)) {
          const transactionsStore = db.createObjectStore(TRANSACTIONS_STORE, { keyPath: 'id' });
          transactionsStore.createIndex('uploadId', 'uploadId', { unique: false });
          transactionsStore.createIndex('agentName', 'agentName', { unique: false });
          console.log('[IndexedDB] Created transactions store');
        }
      };
    });

    return this.initPromise;
  }

  async saveUpload(upload: StoredUpload): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    // Compress the upload data before storing
    const compressedData = this.compressUpload(upload);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([UPLOADS_STORE], 'readwrite');
      const store = transaction.objectStore(UPLOADS_STORE);
      const request = store.put(compressedData);

      request.onerror = () => {
        console.error('[IndexedDB] Failed to save upload:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        console.log('[IndexedDB] Upload saved successfully:', upload.id);
        resolve();
      };
    });
  }

  async getUpload(id: string): Promise<StoredUpload | null> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([UPLOADS_STORE], 'readonly');
      const store = transaction.objectStore(UPLOADS_STORE);
      const request = store.get(id);

      request.onerror = () => {
        console.error('[IndexedDB] Failed to get upload:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }
        // Decompress the upload data
        try {
          const decompressed = this.decompressUpload(result);
          resolve(decompressed);
        } catch (error) {
          console.error('[IndexedDB] Failed to decompress upload:', error);
          reject(error);
        }
      };
    });
  }

  async getAllUploads(): Promise<StoredUpload[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([UPLOADS_STORE], 'readonly');
      const store = transaction.objectStore(UPLOADS_STORE);
      const index = store.index('uploadDate');
      const request = index.getAll();

      request.onerror = () => {
        console.error('[IndexedDB] Failed to get all uploads:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        try {
          // Decompress and sort by date descending (most recent first)
          const uploads = (request.result || [])
            .map(upload => {
              try {
                return this.decompressUpload(upload);
              } catch (error) {
                console.warn('[IndexedDB] Failed to decompress upload, skipping:', error);
                return null;
              }
            })
            .filter((upload): upload is StoredUpload => upload !== null)
            .sort((a, b) => b.uploadDate - a.uploadDate);
          console.log('[IndexedDB] Retrieved', uploads.length, 'uploads');
          resolve(uploads);
        } catch (error) {
          console.error('[IndexedDB] Failed to process uploads:', error);
          reject(error);
        }
      };
    });
  }

  async deleteUpload(id: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([UPLOADS_STORE], 'readwrite');
      const store = transaction.objectStore(UPLOADS_STORE);
      const request = store.delete(id);

      request.onerror = () => {
        console.error('[IndexedDB] Failed to delete upload:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        console.log('[IndexedDB] Upload deleted:', id);
        resolve();
      };
    });
  }

  async clearAllUploads(): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([UPLOADS_STORE], 'readwrite');
      const store = transaction.objectStore(UPLOADS_STORE);
      const request = store.clear();

      request.onerror = () => {
        console.error('[IndexedDB] Failed to clear uploads:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        console.log('[IndexedDB] All uploads cleared');
        resolve();
      };
    });
  }

  private compressUpload(upload: StoredUpload): any {
    try {
      const json = JSON.stringify(upload);
      const compressed = LZ.compressToUTF16(json);
      console.log(
        '[IndexedDB] Compressed upload from',
        json.length,
        'bytes to',
        compressed.length,
        'bytes (',
        Math.round((1 - compressed.length / json.length) * 100),
        '% reduction)'
      );
      return {
        ...upload,
        _compressed: true,
        _compressedData: compressed,
        data: undefined, // Remove uncompressed data
      };
    } catch (error) {
      console.error('[IndexedDB] Compression failed, storing uncompressed:', error);
      return upload;
    }
  }

  private decompressUpload(upload: any): StoredUpload {
    try {
      if (upload._compressed && upload._compressedData) {
        const decompressed = LZ.decompressFromUTF16(upload._compressedData);
        const parsed = JSON.parse(decompressed);
        console.log('[IndexedDB] Decompressed upload successfully');
        return parsed;
      }
      // Fallback for uncompressed data
      return upload;
    } catch (error) {
      console.error('[IndexedDB] Decompression failed:', error);
      throw error;
    }
  }

  async getStorageEstimate(): Promise<{ usage: number; quota: number }> {
    if (!navigator.storage || !navigator.storage.estimate) {
      console.warn('[IndexedDB] Storage estimate API not available');
      return { usage: 0, quota: 0 };
    }

    try {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
      };
    } catch (error) {
      console.error('[IndexedDB] Failed to get storage estimate:', error);
      return { usage: 0, quota: 0 };
    }
  }
}

// Export singleton instance
export const indexedDbManager = new IndexedDBManager();

// Convenience functions
export async function saveUploadToIndexedDB(upload: StoredUpload): Promise<void> {
  try {
    await indexedDbManager.saveUpload(upload);
  } catch (error) {
    console.error('[Storage] Failed to save upload to IndexedDB:', error);
    throw error;
  }
}

export async function getUploadFromIndexedDB(id: string): Promise<StoredUpload | null> {
  try {
    return await indexedDbManager.getUpload(id);
  } catch (error) {
    console.error('[Storage] Failed to get upload from IndexedDB:', error);
    return null;
  }
}

export async function getAllUploadsFromIndexedDB(): Promise<StoredUpload[]> {
  try {
    return await indexedDbManager.getAllUploads();
  } catch (error) {
    console.error('[Storage] Failed to get all uploads from IndexedDB:', error);
    return [];
  }
}

export async function deleteUploadFromIndexedDB(id: string): Promise<void> {
  try {
    await indexedDbManager.deleteUpload(id);
  } catch (error) {
    console.error('[Storage] Failed to delete upload from IndexedDB:', error);
    throw error;
  }
}

export async function getStorageInfo(): Promise<{ usage: number; quota: number; usagePercent: number }> {
  const { usage, quota } = await indexedDbManager.getStorageEstimate();
  return {
    usage,
    quota,
    usagePercent: quota > 0 ? (usage / quota) * 100 : 0,
  };
}
