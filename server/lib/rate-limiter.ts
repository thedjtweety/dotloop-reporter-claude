/**
 * Rate Limiting & Circuit Breaker
 * Prevents abuse and cascading failures during high load
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime: number;
  successCount: number;
}

/**
 * Simple in-memory rate limiter
 * Tracks requests per user/session
 */
class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private readonly windowMs: number; // Time window in ms
  private readonly maxRequests: number; // Max requests per window

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Cleanup old entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Check if request is allowed
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const entry = this.limits.get(key);

    if (!entry || now > entry.resetTime) {
      // New window
      this.limits.set(key, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return true;
    }

    if (entry.count < this.maxRequests) {
      entry.count++;
      return true;
    }

    return false;
  }

  /**
   * Get remaining requests
   */
  getRemaining(key: string): number {
    const entry = this.limits.get(key);
    if (!entry || Date.now() > entry.resetTime) {
      return this.maxRequests;
    }
    return Math.max(0, this.maxRequests - entry.count);
  }

  /**
   * Get reset time
   */
  getResetTime(key: string): number {
    const entry = this.limits.get(key);
    return entry?.resetTime || Date.now() + this.windowMs;
  }

  /**
   * Cleanup old entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime + this.windowMs) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.limits.delete(key));
  }

  /**
   * Reset for testing
   */
  reset(): void {
    this.limits.clear();
  }
}

/**
 * Circuit Breaker for handling cascading failures
 * Prevents hammering a failing service
 */
class CircuitBreaker {
  private state: CircuitBreakerState = {
    state: 'closed',
    failureCount: 0,
    lastFailureTime: 0,
    successCount: 0,
  };

  private readonly failureThreshold: number; // Failures before opening
  private readonly successThreshold: number; // Successes before closing
  private readonly timeout: number; // Time before trying again (ms)

  constructor(failureThreshold: number = 5, successThreshold: number = 2, timeout: number = 60000) {
    this.failureThreshold = failureThreshold;
    this.successThreshold = successThreshold;
    this.timeout = timeout;
  }

  /**
   * Check if request should be allowed
   */
  canExecute(): boolean {
    if (this.state.state === 'closed') {
      return true;
    }

    if (this.state.state === 'open') {
      // Check if timeout has passed
      if (Date.now() - this.state.lastFailureTime > this.timeout) {
        this.state.state = 'half-open';
        this.state.successCount = 0;
        return true;
      }
      return false;
    }

    // half-open state
    return true;
  }

  /**
   * Record success
   */
  recordSuccess(): void {
    if (this.state.state === 'half-open') {
      this.state.successCount++;
      if (this.state.successCount >= this.successThreshold) {
        this.state.state = 'closed';
        this.state.failureCount = 0;
        this.state.successCount = 0;
      }
    } else if (this.state.state === 'closed') {
      this.state.failureCount = 0;
    }
  }

  /**
   * Record failure
   */
  recordFailure(): void {
    this.state.lastFailureTime = Date.now();

    if (this.state.state === 'half-open') {
      this.state.state = 'open';
      this.state.failureCount = 0;
      this.state.successCount = 0;
    } else if (this.state.state === 'closed') {
      this.state.failureCount++;
      if (this.state.failureCount >= this.failureThreshold) {
        this.state.state = 'open';
      }
    }
  }

  /**
   * Get current state
   */
  getState(): CircuitBreakerState {
    return { ...this.state };
  }

  /**
   * Reset for testing
   */
  reset(): void {
    this.state = {
      state: 'closed',
      failureCount: 0,
      lastFailureTime: 0,
      successCount: 0,
    };
  }
}

/**
 * Retry logic with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 100
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries - 1) {
        const delayMs = baseDelayMs * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Timeout wrapper for async operations
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    ),
  ]);
}

// Export singleton instances
export const globalRateLimiter = new RateLimiter(60000, 100); // 100 requests per minute
export const databaseCircuitBreaker = new CircuitBreaker(5, 2, 60000);
export const calculationCircuitBreaker = new CircuitBreaker(5, 2, 60000);
