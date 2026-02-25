/**
 * Rate Limiter Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimiter, CircuitBreaker, retryWithBackoff, withTimeout } from './rate-limiter';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter(1000, 5); // 5 requests per second
  });

  it('should allow requests within limit', () => {
    expect(limiter.isAllowed('user-1')).toBe(true);
    expect(limiter.isAllowed('user-1')).toBe(true);
    expect(limiter.isAllowed('user-1')).toBe(true);
    expect(limiter.getRemaining('user-1')).toBe(2);
  });

  it('should block requests exceeding limit', () => {
    // Use up all 5 requests
    for (let i = 0; i < 5; i++) {
      expect(limiter.isAllowed('user-1')).toBe(true);
    }

    // Next request should be blocked
    expect(limiter.isAllowed('user-1')).toBe(false);
    expect(limiter.getRemaining('user-1')).toBe(0);
  });

  it('should track different users separately', () => {
    expect(limiter.isAllowed('user-1')).toBe(true);
    expect(limiter.isAllowed('user-2')).toBe(true);
    expect(limiter.isAllowed('user-1')).toBe(true);
    expect(limiter.isAllowed('user-2')).toBe(true);

    // Both should have different limits
    expect(limiter.getRemaining('user-1')).toBe(3);
    expect(limiter.getRemaining('user-2')).toBe(3);
  });

  it('should reset after window expires', async () => {
    const fastLimiter = new RateLimiter(100, 2); // 100ms window, 2 requests

    expect(fastLimiter.isAllowed('user-1')).toBe(true);
    expect(fastLimiter.isAllowed('user-1')).toBe(true);
    expect(fastLimiter.isAllowed('user-1')).toBe(false);

    // Wait for window to expire
    await new Promise(resolve => setTimeout(resolve, 150));

    // Should allow requests again
    expect(fastLimiter.isAllowed('user-1')).toBe(true);
  });
});

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker(3, 2, 100); // 3 failures to open, 100ms timeout
  });

  it('should start in closed state', () => {
    expect(breaker.getState().state).toBe('closed');
    expect(breaker.canExecute()).toBe(true);
  });

  it('should open after threshold failures', () => {
    breaker.recordFailure();
    expect(breaker.getState().state).toBe('closed');

    breaker.recordFailure();
    expect(breaker.getState().state).toBe('closed');

    breaker.recordFailure();
    expect(breaker.getState().state).toBe('open');
    expect(breaker.canExecute()).toBe(false);
  });

  it('should transition to half-open after timeout', async () => {
    // Open the circuit
    for (let i = 0; i < 3; i++) {
      breaker.recordFailure();
    }
    expect(breaker.getState().state).toBe('open');

    // Wait for timeout
    await new Promise(resolve => setTimeout(resolve, 150));

    // Should be half-open
    expect(breaker.canExecute()).toBe(true);
    expect(breaker.getState().state).toBe('half-open');
  });

  it('should close after successful recoveries in half-open state', async () => {
    // Open the circuit
    for (let i = 0; i < 3; i++) {
      breaker.recordFailure();
    }

    // Wait for timeout
    await new Promise(resolve => setTimeout(resolve, 150));

    // Should be able to execute in half-open state
    expect(breaker.canExecute()).toBe(true);
    expect(breaker.getState().state).toBe('half-open');

    // Record successes
    breaker.recordSuccess();
    expect(breaker.getState().state).toBe('half-open');

    breaker.recordSuccess();
    expect(breaker.getState().state).toBe('closed');
  });

  it('should reopen on failure in half-open state', async () => {
    // Open the circuit
    for (let i = 0; i < 3; i++) {
      breaker.recordFailure();
    }

    // Wait for timeout
    await new Promise(resolve => setTimeout(resolve, 150));

    // Record failure in half-open state
    breaker.recordFailure();
    expect(breaker.getState().state).toBe('open');
  });
});

describe('retryWithBackoff', () => {
  it('should succeed on first attempt', async () => {
    let attempts = 0;
    const result = await retryWithBackoff(async () => {
      attempts++;
      return 'success';
    });

    expect(result).toBe('success');
    expect(attempts).toBe(1);
  });

  it('should retry on failure', async () => {
    let attempts = 0;
    const result = await retryWithBackoff(
      async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      },
      3,
      10
    );

    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  it('should throw after max retries', async () => {
    let attempts = 0;
    try {
      await retryWithBackoff(
        async () => {
          attempts++;
          throw new Error('Persistent failure');
        },
        3,
        10
      );
      expect.fail('Should have thrown');
    } catch (error) {
      expect(attempts).toBe(3);
      expect(error).toBeInstanceOf(Error);
    }
  });
});

describe('withTimeout', () => {
  it('should resolve before timeout', async () => {
    const result = await withTimeout(
      Promise.resolve('success'),
      1000
    );
    expect(result).toBe('success');
  });

  it('should throw on timeout', async () => {
    try {
      await withTimeout(
        new Promise(resolve => setTimeout(resolve, 1000)),
        100,
        'Operation timed out'
      );
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Operation timed out');
    }
  });
});
