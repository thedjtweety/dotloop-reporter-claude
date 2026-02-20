import { Request, Response } from 'express';
import { getDb } from './db';

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    database: {
      status: 'up' | 'down';
      responseTime?: number;
      error?: string;
    };
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    process: {
      pid: number;
      nodeVersion: string;
      platform: string;
    };
  };
}

/**
 * Health Check Endpoint
 * Returns comprehensive system health status including database connectivity
 */
export async function healthCheck(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  const healthResponse: HealthCheckResponse = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: {
        status: 'down',
      },
      memory: {
        used: 0,
        total: 0,
        percentage: 0,
      },
      process: {
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
      },
    },
  };

  // Check database connectivity
  try {
    const dbStartTime = Date.now();
    const db = await getDb();
    if (!db) {
      throw new Error('Database connection not available');
    }
    // Simple query to test database connection
    await db.execute('SELECT 1');
    const dbResponseTime = Date.now() - dbStartTime;
    
    healthResponse.checks.database = {
      status: 'up',
      responseTime: dbResponseTime,
    };
  } catch (error) {
    healthResponse.status = 'unhealthy';
    healthResponse.checks.database = {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown database error',
    };
  }

  // Check memory usage
  const memUsage = process.memoryUsage();
  const totalMem = memUsage.heapTotal;
  const usedMem = memUsage.heapUsed;
  const memPercentage = (usedMem / totalMem) * 100;

  healthResponse.checks.memory = {
    used: Math.round(usedMem / 1024 / 1024), // MB
    total: Math.round(totalMem / 1024 / 1024), // MB
    percentage: Math.round(memPercentage * 100) / 100,
  };

  // Check if memory usage is too high
  if (memPercentage > 90) {
    healthResponse.status = 'degraded';
  }

  // Set HTTP status code based on health status
  const statusCode = 
    healthResponse.status === 'healthy' ? 200 :
    healthResponse.status === 'degraded' ? 200 :
    503;

  res.status(statusCode).json(healthResponse);
}

/**
 * Simple liveness probe - returns 200 if process is running
 */
export function livenessProbe(req: Request, res: Response): void {
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
}

/**
 * Readiness probe - returns 200 if service is ready to accept traffic
 */
export async function readinessProbe(req: Request, res: Response): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error('Database connection not available');
    }
    // Check if database is accessible
    await db.execute('SELECT 1');
    res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ 
      status: 'not ready', 
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Service not ready',
    });
  }
}
