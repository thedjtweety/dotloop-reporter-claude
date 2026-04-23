/**
 * In-Memory Cache Layer for Performance Optimization
 * 
 * Features:
 * - TTL-based cache expiration
 * - Multi-tenant isolation
 * - Cache invalidation strategies
 * - Memory-efficient storage
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  tenantId: number;
}

class Cache {
  private store = new Map<string, CacheEntry<any>>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Generate cache key with tenant isolation
   */
  private getKey(namespace: string, key: string, tenantId: number): string {
    return `${tenantId}:${namespace}:${key}`;
  }

  /**
   * Set cache value with TTL
   */
  set<T>(namespace: string, key: string, value: T, tenantId: number, ttl?: number): void {
    const cacheKey = this.getKey(namespace, key, tenantId);
    const expiresAt = Date.now() + (ttl || this.defaultTTL);

    this.store.set(cacheKey, {
      value,
      expiresAt,
      tenantId,
    });
  }

  /**
   * Get cache value if not expired
   */
  get<T>(namespace: string, key: string, tenantId: number): T | null {
    const cacheKey = this.getKey(namespace, key, tenantId);
    const entry = this.store.get(cacheKey);

    if (!entry) return null;

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.store.delete(cacheKey);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Check if key exists and is not expired
   */
  has(namespace: string, key: string, tenantId: number): boolean {
    const cacheKey = this.getKey(namespace, key, tenantId);
    const entry = this.store.get(cacheKey);

    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(cacheKey);
      return false;
    }

    return true;
  }

  /**
   * Delete specific cache entry
   */
  delete(namespace: string, key: string, tenantId: number): boolean {
    const cacheKey = this.getKey(namespace, key, tenantId);
    return this.store.delete(cacheKey);
  }

  /**
   * Clear all cache for a namespace in a tenant
   */
  clearNamespace(namespace: string, tenantId: number): void {
    const prefix = `${tenantId}:${namespace}:`;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Clear all cache for a tenant
   */
  clearTenant(tenantId: number): void {
    const prefix = `${tenantId}:`;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; entries: number } {
    return {
      size: this.store.size,
      entries: this.store.size,
    };
  }
}

// Singleton instance
export const cache = new Cache();

/**
 * Cache namespaces
 */
export const CACHE_NAMESPACES = {
  DASHBOARD_METRICS: 'dashboard:metrics',
  COMMISSION_PLANS: 'commission:plans',
  AGENT_ASSIGNMENTS: 'agent:assignments',
  TEAM_MEMBERS: 'team:members',
  TRANSACTION_SUMMARY: 'transaction:summary',
  REPORT_TEMPLATES: 'report:templates',
  AUDIT_LOGS: 'audit:logs',
  USER_SETTINGS: 'user:settings',
} as const;

/**
 * Cache TTLs for different data types
 */
export const CACHE_TTL = {
  SHORT: 1 * 60 * 1000, // 1 minute
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 30 * 60 * 1000, // 30 minutes
  VERY_LONG: 60 * 60 * 1000, // 1 hour
} as const;

/**
 * Cache helper functions
 */
export function cacheGet<T>(
  namespace: string,
  key: string,
  tenantId: number
): T | null {
  return cache.get<T>(namespace, key, tenantId);
}

export function cacheSet<T>(
  namespace: string,
  key: string,
  value: T,
  tenantId: number,
  ttl?: number
): void {
  cache.set(namespace, key, value, tenantId, ttl);
}

export function cacheDelete(
  namespace: string,
  key: string,
  tenantId: number
): boolean {
  return cache.delete(namespace, key, tenantId);
}

export function cacheClearNamespace(namespace: string, tenantId: number): void {
  cache.clearNamespace(namespace, tenantId);
}

export function cacheClearTenant(tenantId: number): void {
  cache.clearTenant(tenantId);
}

/**
 * Cache decorator for tRPC procedures
 */
export function withCache<T>(
  namespace: string,
  ttl: number = CACHE_TTL.MEDIUM
) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (this: any, ...args: any[]) {
      const tenantId = this.ctx?.tenantId;
      const cacheKey = `${propertyKey}:${JSON.stringify(args)}`;

      // Try to get from cache
      const cached = cacheGet<T>(namespace, cacheKey, tenantId);
      if (cached !== null) {
        return cached;
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Store in cache
      cacheSet(namespace, cacheKey, result, tenantId, ttl);

      return result;
    };

    return descriptor;
  };
}
