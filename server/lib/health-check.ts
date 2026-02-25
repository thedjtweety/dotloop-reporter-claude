/**
 * Health Check System
 * Provides monitoring endpoints and readiness probes for production
 */

import { getDb } from '../db';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  database: {
    status: 'connected' | 'disconnected';
    responseTime?: number;
  };
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  checks: {
    name: string;
    status: 'pass' | 'fail';
    message?: string;
    responseTime?: number;
  }[];
}

const startTime = Date.now();

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<{ status: 'connected' | 'disconnected'; responseTime?: number; error?: string }> {
  const start = Date.now();
  try {
    const db = await getDb();
    if (!db) {
      return { status: 'disconnected', error: 'Database instance not available' };
    }

    // Simple query to verify connection
    const result = await db.execute('SELECT 1 as ping');
    const responseTime = Date.now() - start;

    return { status: 'connected', responseTime };
  } catch (error) {
    return {
      status: 'disconnected',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check memory usage
 */
function checkMemory(): { heapUsed: number; heapTotal: number; external: number } {
  const memUsage = process.memoryUsage();
  return {
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
    external: Math.round(memUsage.external / 1024 / 1024), // MB
  };
}

/**
 * Get full health status
 */
export async function getHealthStatus(): Promise<HealthStatus> {
  const checks: HealthStatus['checks'] = [];
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  // Check database
  const dbStart = Date.now();
  const dbCheck = await checkDatabase();
  const dbResponseTime = Date.now() - dbStart;

  checks.push({
    name: 'database',
    status: dbCheck.status === 'connected' ? 'pass' : 'fail',
    message: dbCheck.error,
    responseTime: dbResponseTime,
  });

  if (dbCheck.status === 'disconnected') {
    overallStatus = 'unhealthy';
  }

  // Check memory
  const memory = checkMemory();
  const heapUsagePercent = (memory.heapUsed / memory.heapTotal) * 100;

  if (heapUsagePercent > 90) {
    checks.push({
      name: 'memory',
      status: 'fail',
      message: `High memory usage: ${heapUsagePercent.toFixed(1)}%`,
    });
    overallStatus = 'degraded';
  } else if (heapUsagePercent > 75) {
    checks.push({
      name: 'memory',
      status: 'pass',
      message: `Memory usage: ${heapUsagePercent.toFixed(1)}%`,
    });
  }

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    database: {
      status: dbCheck.status,
      responseTime: dbResponseTime,
    },
    memory,
    checks,
  };
}

/**
 * Check if system is ready to accept requests
 */
export async function isReady(): Promise<boolean> {
  const health = await getHealthStatus();
  return health.status !== 'unhealthy' && health.database.status === 'connected';
}

/**
 * Check if system is alive
 */
export function isAlive(): boolean {
  return true; // If this endpoint is reachable, we're alive
}

/**
 * Get uptime in seconds
 */
export function getUptime(): number {
  return Math.floor((Date.now() - startTime) / 1000);
}
