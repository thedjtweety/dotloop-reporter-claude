/**
 * Upload Queue Hook
 * Manages CSV uploads with automatic retry, offline persistence, and request queuing
 */

import { useState, useCallback, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { globalRequestQueue } from '@/lib/requestQueue';
import {
  offlineQueueStorage,
  PersistedQueueItem,
  fileToBase64,
  base64ToFile,
} from '@/lib/offlineQueueStorage';

export interface UploadQueueItem {
  id: string;
  fileName: string;
  fileSize: number;
  status: 'pending' | 'uploading' | 'success' | 'failed' | 'retrying';
  progress: number;
  error?: string;
  retryCount: number;
}

export interface UseUploadQueueReturn {
  items: UploadQueueItem[];
  isProcessing: boolean;
  addFile: (file: File) => Promise<void>;
  retryItem: (id: string) => Promise<void>;
  removeItem: (id: string) => void;
  clearAll: () => void;
  stats: {
    total: number;
    pending: number;
    uploading: number;
    success: number;
    failed: number;
  };
}

/**
 * Hook for managing upload queue with offline persistence
 */
export function useUploadQueue(): UseUploadQueueReturn {
  const [items, setItems] = useState<UploadQueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const uploadMutation = trpc.uploads.create.useMutation();

  /**
   * Initialize queue from storage on mount
   */
  useEffect(() => {
    const storedItems = offlineQueueStorage.getItems();
    const queueItems: UploadQueueItem[] = storedItems.map(item => ({
      id: item.id,
      fileName: item.fileName,
      fileSize: item.fileSize,
      status: 'pending' as const,
      progress: 0,
      retryCount: item.retryCount,
    }));
    setItems(queueItems);

    // Clean up old items if needed
    if (offlineQueueStorage.needsCleanup()) {
      offlineQueueStorage.cleanup();
    }

    // Process queue on mount
    if (queueItems.length > 0) {
      processQueue();
    }
  }, []);

  /**
   * Add file to queue
   */
  const addFile = useCallback(
    async (file: File) => {
      try {
        const id = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const base64 = await fileToBase64(file);

        // Add to persistent storage
        const added = offlineQueueStorage.addItem({
          id,
          fileData: base64,
          fileName: file.name,
          fileSize: file.size,
          metadata: {
            mimeType: file.type,
          },
        });

        if (!added) {
          throw new Error('Failed to add file to queue');
        }

        // Add to UI state
        setItems(prev => [
          ...prev,
          {
            id,
            fileName: file.name,
            fileSize: file.size,
            status: 'pending',
            progress: 0,
            retryCount: 0,
          },
        ]);

        // Start processing
        processQueue();
      } catch (error) {
        console.error('Failed to add file to queue:', error);
        throw error;
      }
    },
    []
  );

  /**
   * Process queue items
   */
  const processQueue = useCallback(async () => {
    setIsProcessing(true);

    try {
      const pendingItems = items.filter(item => item.status === 'pending');

      for (const item of pendingItems) {
        await uploadItem(item.id);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [items]);

  /**
   * Upload single item
   */
  const uploadItem = useCallback(
    async (id: string) => {
      try {
        // Update status
        setItems(prev =>
          prev.map(item =>
            item.id === id ? { ...item, status: 'uploading' as const, progress: 25 } : item
          )
        );

        // Get item from storage
        const storedItem = offlineQueueStorage.getItem(id);
        if (!storedItem) {
          throw new Error('Item not found in storage');
        }

        // Convert base64 back to File
        const file = base64ToFile(
          storedItem.fileData,
          storedItem.fileName,
          storedItem.metadata?.mimeType || 'text/csv'
        );

        // Create form data
        const formData = new FormData();
        formData.append('file', file);

        // Queue the upload request
        await new Promise<void>((resolve, reject) => {
          globalRequestQueue.enqueue({
            id,
            fn: async () => {
              // Update progress
              setItems(prev =>
                prev.map(item =>
                  item.id === id ? { ...item, progress: 50 } : item
                )
              );

              // Upload via mutation
              const result = await uploadMutation.mutateAsync({
                fileName: file.name,
                fileSize: file.size,
                // Note: In real implementation, you'd handle file upload differently
                // This is a placeholder for the actual upload logic
              });

              setItems(prev =>
                prev.map(item =>
                  item.id === id ? { ...item, progress: 100 } : item
                )
              );

              return result;
            },
            onSuccess: () => {
              // Mark as success
              setItems(prev =>
                prev.map(item =>
                  item.id === id ? { ...item, status: 'success' as const } : item
                )
              );

              // Remove from storage
              offlineQueueStorage.removeItem(id);
              resolve();
            },
            onError: (error) => {
              // Update retry count
              const updatedItem = offlineQueueStorage.getItem(id);
              if (updatedItem) {
                offlineQueueStorage.updateItem(id, {
                  retryCount: updatedItem.retryCount + 1,
                });
              }

              // Update status
              setItems(prev =>
                prev.map(item =>
                  item.id === id
                    ? {
                        ...item,
                        status: 'failed' as const,
                        error: error.message,
                        retryCount: (updatedItem?.retryCount || 0) + 1,
                      }
                    : item
                )
              );

              reject(error);
            },
            onRetry: (attempt, delayMs) => {
              setItems(prev =>
                prev.map(item =>
                  item.id === id
                    ? {
                        ...item,
                        status: 'retrying' as const,
                        retryCount: attempt,
                      }
                    : item
                )
              );
            },
            maxRetries: 5,
            baseDelayMs: 1000,
          });
        });
      } catch (error) {
        console.error(`Failed to upload item ${id}:`, error);
        // Error is already handled in onError callback
      }
    },
    [uploadMutation]
  );

  /**
   * Retry failed item
   */
  const retryItem = useCallback(
    async (id: string) => {
      setItems(prev =>
        prev.map(item =>
          item.id === id ? { ...item, status: 'pending' as const, error: undefined } : item
        )
      );

      await uploadItem(id);
    },
    [uploadItem]
  );

  /**
   * Remove item from queue
   */
  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    offlineQueueStorage.removeItem(id);
  }, []);

  /**
   * Clear all items
   */
  const clearAll = useCallback(() => {
    setItems([]);
    offlineQueueStorage.clear();
  }, []);

  /**
   * Calculate stats
   */
  const stats = {
    total: items.length,
    pending: items.filter(i => i.status === 'pending').length,
    uploading: items.filter(i => i.status === 'uploading').length,
    success: items.filter(i => i.status === 'success').length,
    failed: items.filter(i => i.status === 'failed').length,
  };

  return {
    items,
    isProcessing,
    addFile,
    retryItem,
    removeItem,
    clearAll,
    stats,
  };
}
