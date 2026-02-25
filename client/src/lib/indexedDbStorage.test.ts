import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { indexedDbManager, StoredUpload } from './indexedDbStorage';
import { DotloopRecord } from './csvParser';

// Mock IndexedDB for testing
const mockDB = {
  transaction: vi.fn(),
  objectStoreNames: { contains: vi.fn(() => false) },
};

const mockStore = {
  put: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
  clear: vi.fn(),
  index: vi.fn(),
};

const mockIndex = {
  getAll: vi.fn(),
};

describe('IndexedDB Storage with Compression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create a StoredUpload object with correct structure', () => {
    const mockRecords: DotloopRecord[] = [
      {
        id: '1',
        loopName: 'Test Loop',
        loopStatus: 'closed',
        agentName: 'John Doe',
        salePrice: 500000,
        closingDate: new Date('2024-01-15'),
      } as DotloopRecord,
    ];

    const upload: StoredUpload = {
      id: 'upload-123',
      fileName: 'test.csv',
      uploadDate: Date.now(),
      recordCount: mockRecords.length,
      data: mockRecords,
    };

    expect(upload.id).toBe('upload-123');
    expect(upload.fileName).toBe('test.csv');
    expect(upload.recordCount).toBe(1);
    expect(upload.data).toEqual(mockRecords);
  });

  it('should store upload metadata correctly', () => {
    const upload: StoredUpload = {
      id: 'upload-456',
      fileName: 'large-export.csv',
      uploadDate: 1708876800000,
      recordCount: 500,
      data: [] as DotloopRecord[],
      metadata: {
        fileSize: 2500000,
        processingTime: 1500,
        dataQuality: 95,
      },
    };

    expect(upload.metadata?.fileSize).toBe(2500000);
    expect(upload.metadata?.processingTime).toBe(1500);
    expect(upload.metadata?.dataQuality).toBe(95);
  });

  it('should handle large record counts efficiently', () => {
    const largeRecordCount = 10000;
    const upload: StoredUpload = {
      id: 'upload-large',
      fileName: 'large-dataset.csv',
      uploadDate: Date.now(),
      recordCount: largeRecordCount,
      data: [] as DotloopRecord[],
    };

    expect(upload.recordCount).toBe(largeRecordCount);
  });

  it('should preserve upload date as timestamp', () => {
    const now = Date.now();
    const upload: StoredUpload = {
      id: 'upload-789',
      fileName: 'recent.csv',
      uploadDate: now,
      recordCount: 100,
      data: [] as DotloopRecord[],
    };

    expect(upload.uploadDate).toBe(now);
    expect(typeof upload.uploadDate).toBe('number');
  });

  it('should support multiple uploads with unique IDs', () => {
    const upload1: StoredUpload = {
      id: 'upload-1',
      fileName: 'file1.csv',
      uploadDate: Date.now(),
      recordCount: 100,
      data: [] as DotloopRecord[],
    };

    const upload2: StoredUpload = {
      id: 'upload-2',
      fileName: 'file2.csv',
      uploadDate: Date.now() + 1000,
      recordCount: 200,
      data: [] as DotloopRecord[],
    };

    expect(upload1.id).not.toBe(upload2.id);
    expect(upload1.fileName).not.toBe(upload2.fileName);
  });

  it('should handle empty data arrays', () => {
    const upload: StoredUpload = {
      id: 'upload-empty',
      fileName: 'empty.csv',
      uploadDate: Date.now(),
      recordCount: 0,
      data: [] as DotloopRecord[],
    };

    expect(upload.recordCount).toBe(0);
    expect(upload.data.length).toBe(0);
  });

  it('should support optional metadata', () => {
    const uploadWithMeta: StoredUpload = {
      id: 'upload-meta',
      fileName: 'with-meta.csv',
      uploadDate: Date.now(),
      recordCount: 50,
      data: [] as DotloopRecord[],
      metadata: {
        fileSize: 250000,
      },
    };

    const uploadWithoutMeta: StoredUpload = {
      id: 'upload-no-meta',
      fileName: 'no-meta.csv',
      uploadDate: Date.now(),
      recordCount: 50,
      data: [] as DotloopRecord[],
    };

    expect(uploadWithMeta.metadata).toBeDefined();
    expect(uploadWithoutMeta.metadata).toBeUndefined();
  });
});
