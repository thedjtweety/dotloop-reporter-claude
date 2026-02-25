/**
 * Offline Queue Storage Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OfflineQueueStorage } from './offlineQueueStorage';

describe('OfflineQueueStorage', () => {
  let storage: OfflineQueueStorage;

  beforeEach(() => {
    localStorage.clear();
    storage = new OfflineQueueStorage('test_queue', 10, 50 * 1024 * 1024);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should add item to queue', () => {
    const item = {
      id: 'test-1',
      fileData: 'base64data',
      fileName: 'test.csv',
      fileSize: 1024,
    };

    const result = storage.addItem(item);
    expect(result).toBe(true);

    const items = storage.getItems();
    expect(items).toHaveLength(1);
    expect(items[0].fileName).toBe('test.csv');
  });

  it('should get item by ID', () => {
    const item = {
      id: 'test-1',
      fileData: 'base64data',
      fileName: 'test.csv',
      fileSize: 1024,
    };

    storage.addItem(item);
    const retrieved = storage.getItem('test-1');

    expect(retrieved).not.toBeNull();
    expect(retrieved?.fileName).toBe('test.csv');
  });

  it('should update item', () => {
    const item = {
      id: 'test-1',
      fileData: 'base64data',
      fileName: 'test.csv',
      fileSize: 1024,
    };

    storage.addItem(item);
    const updated = storage.updateItem('test-1', { retryCount: 3 });

    expect(updated).toBe(true);

    const retrieved = storage.getItem('test-1');
    expect(retrieved?.retryCount).toBe(3);
  });

  it('should remove item from queue', () => {
    const item = {
      id: 'test-1',
      fileData: 'base64data',
      fileName: 'test.csv',
      fileSize: 1024,
    };

    storage.addItem(item);
    expect(storage.getItems()).toHaveLength(1);

    const removed = storage.removeItem('test-1');
    expect(removed).toBe(true);
    expect(storage.getItems()).toHaveLength(0);
  });

  it('should clear all items', () => {
    storage.addItem({
      id: 'test-1',
      fileData: 'base64data',
      fileName: 'test.csv',
      fileSize: 1024,
    });

    storage.addItem({
      id: 'test-2',
      fileData: 'base64data',
      fileName: 'test2.csv',
      fileSize: 2048,
    });

    expect(storage.getItems()).toHaveLength(2);
    storage.clear();
    expect(storage.getItems()).toHaveLength(0);
  });

  it('should get queue statistics', () => {
    storage.addItem({
      id: 'test-1',
      fileData: 'base64data',
      fileName: 'test.csv',
      fileSize: 1024,
    });

    storage.addItem({
      id: 'test-2',
      fileData: 'base64data',
      fileName: 'test2.csv',
      fileSize: 2048,
    });

    const stats = storage.getStats();
    expect(stats.totalItems).toBe(2);
    expect(stats.totalSize).toBe(3072);
    expect(stats.oldestItem?.fileName).toBe('test.csv');
    expect(stats.newestItem?.fileName).toBe('test2.csv');
  });

  it('should reject file exceeding max size', () => {
    const storage = new OfflineQueueStorage('test_queue', 10, 100);

    const result = storage.addItem({
      id: 'test-1',
      fileData: 'x'.repeat(200),
      fileName: 'large.csv',
      fileSize: 200,
    });

    expect(result).toBe(false);
    expect(storage.getItems()).toHaveLength(0);
  });

  it('should reject adding to full queue', () => {
    const storage = new OfflineQueueStorage('test_queue', 2, 50 * 1024 * 1024);

    storage.addItem({
      id: 'test-1',
      fileData: 'base64data',
      fileName: 'test1.csv',
      fileSize: 1024,
    });

    storage.addItem({
      id: 'test-2',
      fileData: 'base64data',
      fileName: 'test2.csv',
      fileSize: 1024,
    });

    const result = storage.addItem({
      id: 'test-3',
      fileData: 'base64data',
      fileName: 'test3.csv',
      fileSize: 1024,
    });

    expect(result).toBe(false);
    expect(storage.getItems()).toHaveLength(2);
  });

  it('should cleanup old items', () => {
    const item1 = {
      id: 'test-1',
      fileData: 'base64data',
      fileName: 'test.csv',
      fileSize: 1024,
    };

    storage.addItem(item1);

    const state = JSON.parse(localStorage.getItem('test_queue') || '{}');
    state.items[0].uploadedAt = Date.now() - 8 * 24 * 60 * 60 * 1000;
    localStorage.setItem('test_queue', JSON.stringify(state));

    storage.cleanup();

    expect(storage.getItems()).toHaveLength(0);
  });

  it('should persist data to localStorage', () => {
    storage.addItem({
      id: 'test-1',
      fileData: 'base64data',
      fileName: 'test.csv',
      fileSize: 1024,
    });

    const storage2 = new OfflineQueueStorage('test_queue', 10, 50 * 1024 * 1024);
    const items = storage2.getItems();

    expect(items).toHaveLength(1);
    expect(items[0].fileName).toBe('test.csv');
  });

  it('should handle concurrent operations', () => {
    for (let i = 0; i < 5; i++) {
      storage.addItem({
        id: `test-${i}`,
        fileData: 'base64data',
        fileName: `test${i}.csv`,
        fileSize: 1024 * (i + 1),
      });
    }

    expect(storage.getItems()).toHaveLength(5);

    storage.removeItem('test-2');
    expect(storage.getItems()).toHaveLength(4);

    const stats = storage.getStats();
    expect(stats.totalItems).toBe(4);
    expect(stats.totalSize).toBeGreaterThan(0);
  });
});
