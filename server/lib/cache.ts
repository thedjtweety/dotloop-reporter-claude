/**
 * Simple In-Memory Cache
 * Reduces database queries for frequently accessed data
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class Cache<T> {
  private entries: Map<string, CacheEntry<T>> = new Map();
  private readonly ttlMs: number; // Time to live in milliseconds

  constructor(ttlMs: number = 5 * 60 * 1000) {
    // Default 5 minutes
    this.ttlMs = ttlMs;

    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const entry = this.entries.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.entries.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T, ttlMs?: number): void {
    this.entries.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs || this.ttlMs),
    });
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete key from cache
   */
  delete(key: string): void {
    this.entries.delete(key);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.entries.size;
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.entries.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.entries.delete(key));
  }

  /**
   * Get or set value (compute if not in cache)
   */
  async getOrCompute(key: string, compute: () => Promise<T>, ttlMs?: number): Promise<T> {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    const value = await compute();
    this.set(key, value, ttlMs);
    return value;
  }
}

// Create cache instances for different data types
export const commissionPlansCache = new Cache<any[]>(10 * 60 * 1000); // 10 minutes
export const agentAssignmentsCache = new Cache<any[]>(10 * 60 * 1000); // 10 minutes
export const teamsCache = new Cache<any[]>(10 * 60 * 1000); // 10 minutes
export const transactionsCache = new Cache<any[]>(5 * 60 * 1000); // 5 minutes

/**
 * Invalidate all caches (useful when data changes)
 */
export function invalidateAllCaches(): void {
  commissionPlansCache.clear();
  agentAssignmentsCache.clear();
  teamsCache.clear();
  transactionsCache.clear();
}

/**
 * Invalidate specific cache
 */
export function invalidateCache(cacheName: 'plans' | 'assignments' | 'teams' | 'transactions'): void {
  switch (cacheName) {
    case 'plans':
      commissionPlansCache.clear();
      break;
    case 'assignments':
      agentAssignmentsCache.clear();
      break;
    case 'teams':
      teamsCache.clear();
      break;
    case 'transactions':
      transactionsCache.clear();
      break;
  }
}
