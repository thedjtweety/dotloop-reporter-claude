/**
 * File Validation Tests
 */

import { describe, it, expect } from 'vitest';
import {
  validateFile,
  validateFiles,
  formatBytes,
  estimateProcessingTime,
  getFileValidationErrorMessage,
  getFileValidationWarningMessage,
} from './fileValidation';

describe('formatBytes', () => {
  it('should format bytes correctly', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1024 * 1024)).toBe('1 MB');
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
  });

  it('should handle decimal values', () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(1024 * 1024 + 512 * 1024)).toBe('1.5 MB');
  });
});

describe('estimateProcessingTime', () => {
  it('should estimate processing time correctly', () => {
    expect(estimateProcessingTime(1024)).toMatch(/About \d+ second/);
    expect(estimateProcessingTime(1024 * 1024)).toContain('About 1 second');
    expect(estimateProcessingTime(5 * 1024 * 1024)).toContain('About 5 seconds');
    expect(estimateProcessingTime(60 * 1024 * 1024)).toContain('About 1 minute');
  });
});

describe('validateFile', () => {
  it('should validate file size', () => {
    const largeFile = new File(['x'.repeat(60 * 1024 * 1024)], 'large.csv', { type: 'text/csv' });
    const result = validateFile(largeFile, { maxSizeBytes: 50 * 1024 * 1024 });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('exceeds maximum');
  });

  it('should validate file type', () => {
    const invalidFile = new File(['content'], 'data.txt', { type: 'text/plain' });
    const result = validateFile(invalidFile, {
      allowedTypes: ['text/csv'],
      allowedExtensions: ['.csv'],
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('not supported');
  });

  it('should accept valid CSV files', () => {
    const validFile = new File(['name,age\nJohn,30'], 'data.csv', { type: 'text/csv' });
    const result = validateFile(validFile);

    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should warn on very small files', () => {
    const smallFile = new File(['x'], 'tiny.csv', { type: 'text/csv' });
    const result = validateFile(smallFile);

    expect(result.warnings).toBeDefined();
    expect(result.warnings?.length).toBeGreaterThan(0);
  });

  it('should reject files without name', () => {
    const noNameFile = new File(['content'], '', { type: 'text/csv' });
    const result = validateFile(noNameFile);

    expect(result.valid).toBe(false);
  });
});

describe('validateFiles', () => {
  it('should validate multiple files', () => {
    const file1 = new File(['name,age\nJohn,30'], 'data1.csv', { type: 'text/csv' });
    const file2 = new File(['name,age\nJane,25'], 'data2.csv', { type: 'text/csv' });

    const result = validateFiles([file1, file2]);

    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should report errors for invalid files', () => {
    const validFile = new File(['name,age\nJohn,30'], 'data.csv', { type: 'text/csv' });
    const invalidFile = new File(['content'], 'data.txt', { type: 'text/plain' });

    const result = validateFiles([validFile, invalidFile], {
      allowedTypes: ['text/csv'],
      allowedExtensions: ['.csv'],
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should reject empty file list', () => {
    const result = validateFiles([]);

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toBe('No files provided');
  });
});

describe('getFileValidationErrorMessage', () => {
  it('should return empty string for valid files', () => {
    const result = { valid: true, errors: [] };
    expect(getFileValidationErrorMessage(result)).toBe('');
  });

  it('should return single error message', () => {
    const result = { valid: false, errors: ['File too large'] };
    expect(getFileValidationErrorMessage(result)).toBe('File too large');
  });

  it('should format multiple errors', () => {
    const result = {
      valid: false,
      errors: ['Error 1', 'Error 2', 'Error 3'],
    };
    const message = getFileValidationErrorMessage(result);

    expect(message).toContain('3 validation errors');
    expect(message).toContain('• Error 1');
    expect(message).toContain('• Error 2');
    expect(message).toContain('• Error 3');
  });
});

describe('getFileValidationWarningMessage', () => {
  it('should return empty string when no warnings', () => {
    const result = { valid: true, errors: [] };
    expect(getFileValidationWarningMessage(result)).toBe('');
  });

  it('should return single warning message', () => {
    const result = { valid: true, errors: [], warnings: ['File is very small'] };
    expect(getFileValidationWarningMessage(result)).toBe('File is very small');
  });

  it('should format multiple warnings', () => {
    const result = {
      valid: true,
      errors: [],
      warnings: ['Warning 1', 'Warning 2'],
    };
    const message = getFileValidationWarningMessage(result);

    expect(message).toContain('2 warnings');
    expect(message).toContain('• Warning 1');
    expect(message).toContain('• Warning 2');
  });
});
