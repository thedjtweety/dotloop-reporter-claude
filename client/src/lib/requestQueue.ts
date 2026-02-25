/**
 * Request Queue Utility
 * Handles automatic retry logic with exponential backoff for rate-limited requests
 * Provides graceful degradation during traffic spikes
 */

export interface QueuedRequest<T = any> {
  id: string;
  fn: () => Promise<T>;
  onSuccess?: (result: T) => void;
  onError?: (error: Error) => void;
  onRetry?: (attempt: number, nextRetryMs: number) => void;
  maxRetries?: number;
  baseDelayMs?: number;
  timeout?: number;
}

export interface QueueStatus {
  isProcessing: boolean;
  queuedCount: number;
  failedCount: number;
  successCount: number;
  currentRetryMs: number;
}

export interface RateLimitInfo {
  isRateLimited: boolean;
  retryAfterMs: number;
  resetTime: number;
}

/**
 * Request Queue Manager
 * Automatically retries failed requests with exponential backoff
 */
export class RequestQueue {
  private queue: Map<string, QueuedRequest> = new Map();
  private processing: Set<string> = new Set();
  private rateLimitInfo: RateLimitInfo = {
    isRateLimited: false,
    retryAfterMs: 0,
    resetTime: 0,
  };
  private stats = {
    successCount: 0,
    failedCount: 0,
    retryCount: 0,
  };

  private readonly defaultMaxRetries = 5;
  private readonly defaultBaseDelayMs = 1000; // 1 second
  private readonly defaultTimeoutMs = 30000; // 30 seconds

  private statusListeners: Set<(status: QueueStatus) => void> = new Set();

  /**
   * Add request to queue
   */
  enqueue<T = any>(request: QueuedRequest<T>): string {
    const id = request.id || this.generateId();
    this.queue.set(id, request);
    this.notifyStatusChange();
    this.processQueue();
    return id;
  }

  /**
   * Process queue with rate limit awareness
   */
  private async processQueue(): Promise<void> {
    // If rate limited, wait for reset
    if (this.rateLimitInfo.isRateLimited) {
      const now = Date.now();
      if (now < this.rateLimitInfo.resetTime) {
        const waitMs = this.rateLimitInfo.resetTime - now;
        await new Promise(resolve => setTimeout(resolve, waitMs));
      }
      this.rateLimitInfo.isRateLimited = false;
    }

    // Process one request at a time
    for (const [id, request] of this.queue) {
      if (this.processing.has(id)) continue;

      this.processing.add(id);
      try {
        await this.executeRequest(id, request, 0);
      } finally {
        this.processing.delete(id);
        this.queue.delete(id);
        this.notifyStatusChange();
      }
    }
  }

  /**
   * Execute request with retry logic
   */
  private async executeRequest<T = any>(
    id: string,
    request: QueuedRequest<T>,
    attempt: number
  ): Promise<void> {
    const maxRetries = request.maxRetries ?? this.defaultMaxRetries;
    const baseDelayMs = request.baseDelayMs ?? this.defaultBaseDelayMs;
    const timeoutMs = request.timeout ?? this.defaultTimeoutMs;

    try {
      // Execute with timeout
      const result = await Promise.race([
        request.fn(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Request timeout')),
            timeoutMs
          )
        ),
      ]);

      // Success
      this.stats.successCount++;
      request.onSuccess?.(result);
      this.notifyStatusChange();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const isRateLimited = err.message.includes('Rate limit') ||
        err.message.includes('TOO_MANY_REQUESTS') ||
        err.message.includes('429');

      if (isRateLimited) {
        // Handle rate limit
        this.handleRateLimit(request, baseDelayMs);
        // Re-queue the request
        this.queue.set(id, request);
        this.notifyStatusChange();
        return;
      }

      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s, 8s, 16s
        const delayMs = baseDelayMs * Math.pow(2, attempt);
        const nextRetryMs = Date.now() + delayMs;

        this.stats.retryCount++;
        request.onRetry?.(attempt + 1, delayMs);

        // Wait and retry
        await new Promise(resolve => setTimeout(resolve, delayMs));
        await this.executeRequest(id, request, attempt + 1);
      } else {
        // Max retries exceeded
        this.stats.failedCount++;
        request.onError?.(err);
        this.notifyStatusChange();
      }
    }
  }

  /**
   * Handle rate limit response
   */
  private handleRateLimit(request: QueuedRequest, baseDelayMs: number): void {
    // Set rate limit info for next 60 seconds
    const retryAfterMs = 60000; // 60 seconds
    this.rateLimitInfo = {
      isRateLimited: true,
      retryAfterMs,
      resetTime: Date.now() + retryAfterMs,
    };

    request.onRetry?.(0, retryAfterMs);
  }

  /**
   * Get current queue status
   */
  getStatus(): QueueStatus {
    return {
      isProcessing: this.processing.size > 0,
      queuedCount: this.queue.size,
      failedCount: this.stats.failedCount,
      successCount: this.stats.successCount,
      currentRetryMs: this.rateLimitInfo.isRateLimited
        ? Math.max(0, this.rateLimitInfo.resetTime - Date.now())
        : 0,
    };
  }

  /**
   * Get rate limit info
   */
  getRateLimitInfo(): RateLimitInfo {
    return { ...this.rateLimitInfo };
  }

  /**
   * Subscribe to status changes
   */
  onStatusChange(listener: (status: QueueStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  /**
   * Notify all listeners of status change
   */
  private notifyStatusChange(): void {
    const status = this.getStatus();
    this.statusListeners.forEach(listener => listener(status));
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.queue.clear();
    this.processing.clear();
    this.notifyStatusChange();
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.size;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Global request queue instance
 */
export const globalRequestQueue = new RequestQueue();

/**
 * Helper to check if error is rate limit error
 */
export function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('rate limit') ||
      msg.includes('too_many_requests') ||
      msg.includes('429');
  }
  return false;
}

/**
 * Helper to extract retry-after time from error
 */
export function getRetryAfterMs(error: unknown): number {
  if (error instanceof Error) {
    const match = error.message.match(/retry.?after[:\s]+(\d+)/i);
    if (match) {
      return parseInt(match[1], 10) * 1000;
    }
  }
  return 60000; // Default 60 seconds
}
