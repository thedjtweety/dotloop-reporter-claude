/**
 * System Router - Health checks, monitoring, and diagnostics
 */

import { router, publicProcedure } from '../_core/trpc';
import { getHealthStatus, isReady, isAlive, getUptime } from '../lib/health-check';
import { globalRateLimiter, databaseCircuitBreaker, calculationCircuitBreaker } from '../lib/rate-limiter';

export const systemRouter = router({
  /**
   * Health check endpoint (for monitoring services)
   * Returns full system health status
   */
  health: publicProcedure.query(async () => {
    return await getHealthStatus();
  }),

  /**
   * Readiness probe (for Kubernetes/container orchestration)
   * Returns 200 if ready to accept requests
   */
  ready: publicProcedure.query(async () => {
    const ready = await isReady();
    return {
      ready,
      uptime: getUptime(),
      timestamp: new Date().toISOString(),
    };
  }),

  /**
   * Liveness probe (for Kubernetes/container orchestration)
   * Returns 200 if service is alive
   */
  alive: publicProcedure.query(() => {
    return {
      alive: isAlive(),
      uptime: getUptime(),
      timestamp: new Date().toISOString(),
    };
  }),

  /**
   * Get system diagnostics
   * Includes rate limiter and circuit breaker status
   */
  diagnostics: publicProcedure.query(async () => {
    const health = await getHealthStatus();

    return {
      health,
      circuitBreakers: {
        database: databaseCircuitBreaker.getState(),
        calculation: calculationCircuitBreaker.getState(),
      },
      timestamp: new Date().toISOString(),
    };
  }),

  /**
   * Get uptime in seconds
   */
  uptime: publicProcedure.query(() => {
    return {
      uptime: getUptime(),
      timestamp: new Date().toISOString(),
    };
  }),
});
