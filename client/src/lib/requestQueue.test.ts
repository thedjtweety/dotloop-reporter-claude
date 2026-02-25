/**
 * Request Queue Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RequestQueue, isRateLimitError, getRetryAfterMs } from './requestQueue';

describe('RequestQueue', () => {
  let queue: RequestQueue;

  beforeEach(() => {
    queue = new RequestQueue();
  });

  it('should enqueue and process requests', async () => {
    const onSuccess = vi.fn();
    let callCount = 0;

    queue.enqueue({
      id: 'test-1',
      fn: async () => {
        callCount++;
        return 'success';
      },
      onSuccess,
    });

    // Give queue time to process
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(callCount).toBe(1);
    expect(onSuccess).toHaveBeenCalledWith('success');
  });

  it('should retry failed requests with exponential backoff', async () => {
    const onRetry = vi.fn();
    const onSuccess = vi.fn();
    let callCount = 0;

    queue.enqueue({
      id: 'test-retry',
      fn: async () => {
        callCount++;
        if (callCount < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      },
      onRetry,
      onSuccess,
      maxRetries: 5,
      baseDelayMs: 10,
    });

    // Give queue time to process with retries
    await new Promise(resolve => setTimeout(resolve, 500));

    expect(callCount).toBe(3);
    expect(onSuccess).toHaveBeenCalledWith('success');
    expect(onRetry).toHaveBeenCalled();
  });

  it('should call onError after max retries exceeded', async () => {
    const onError = vi.fn();
    let callCount = 0;

    queue.enqueue({
      id: 'test-max-retries',
      fn: async () => {
        callCount++;
        throw new Error('Persistent failure');
      },
      onError,
      maxRetries: 2,
      baseDelayMs: 10,
    });

    // Give queue time to process
    await new Promise(resolve => setTimeout(resolve, 300));

    expect(callCount).toBe(3); // Initial + 2 retries
    expect(onError).toHaveBeenCalled();
  });

  it('should track queue status', async () => {
    const statusListener = vi.fn();
    queue.onStatusChange(statusListener);

    queue.enqueue({
      id: 'test-status',
      fn: async () => 'success',
    });

    // Give queue time to process
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(statusListener).toHaveBeenCalled();
    const lastStatus = statusListener.mock.calls[statusListener.mock.calls.length - 1][0];
    expect(lastStatus.successCount).toBeGreaterThanOrEqual(0);
  });

  it('should handle rate limit errors', async () => {
    const onRetry = vi.fn();
    let callCount = 0;

    queue.enqueue({
      id: 'test-rate-limit',
      fn: async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Rate limit exceeded (429)');
        }
        return 'success';
      },
      onRetry,
      maxRetries: 3,
      baseDelayMs: 10,
    });

    // Give queue time to process
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(onRetry).toHaveBeenCalled();
  });

  it('should clear queue', () => {
    queue.enqueue({
      id: 'test-clear-1',
      fn: async () => 'success',
    });
    queue.enqueue({
      id: 'test-clear-2',
      fn: async () => 'success',
    });

    expect(queue.size()).toBe(2);
    queue.clear();
    expect(queue.size()).toBe(0);
  });

  it('should get queue status', () => {
    queue.enqueue({
      id: 'test-status-1',
      fn: async () => 'success',
    });

    const status = queue.getStatus();
    expect(status).toHaveProperty('queuedCount');
    expect(status).toHaveProperty('successCount');
    expect(status).toHaveProperty('failedCount');
    expect(status).toHaveProperty('isProcessing');
  });
});

describe('isRateLimitError', () => {
  it('should detect rate limit errors', () => {
    expect(isRateLimitError(new Error('Rate limit exceeded'))).toBe(true);
    expect(isRateLimitError(new Error('TOO_MANY_REQUESTS'))).toBe(true);
    expect(isRateLimitError(new Error('429 Too Many Requests'))).toBe(true);
  });

  it('should not detect non-rate-limit errors', () => {
    expect(isRateLimitError(new Error('Network error'))).toBe(false);
    expect(isRateLimitError(new Error('Timeout'))).toBe(false);
    expect(isRateLimitError('not an error')).toBe(false);
  });
});

describe('getRetryAfterMs', () => {
  it('should extract retry-after time', () => {
    const error = new Error('Rate limit exceeded. Retry after: 30 seconds');
    const ms = getRetryAfterMs(error);
    expect(ms).toBe(30000);
  });

  it('should return default if no retry-after found', () => {
    const error = new Error('Some error');
    const ms = getRetryAfterMs(error);
    expect(ms).toBe(60000);
  });
});
