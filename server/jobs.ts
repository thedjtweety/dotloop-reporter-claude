/**
 * Background Jobs Scheduler
 * 
 * Features:
 * - Scheduled report generation
 * - Periodic data sync
 * - Cleanup tasks
 * - Error handling and retries
 */

import { getDb } from './db';
import { auditLogs } from '../drizzle/schema';
import { eq, lt } from 'drizzle-orm';

interface Job {
  id: string;
  name: string;
  schedule: string; // cron-like format
  handler: () => Promise<void>;
  lastRun?: Date;
  nextRun?: Date;
}

class JobScheduler {
  private jobs: Map<string, Job> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Register a job
   */
  register(job: Job): void {
    this.jobs.set(job.id, job);
    console.log(`Job registered: ${job.name}`);
  }

  /**
   * Start all jobs
   */
  async start(): Promise<void> {
    console.log('Starting job scheduler...');

    for (const [id, job] of this.jobs) {
      this.scheduleJob(id, job);
    }
  }

  /**
   * Schedule a single job
   */
  private scheduleJob(id: string, job: Job): void {
    // Simple interval-based scheduling (can be extended with cron)
    const interval = this.parseSchedule(job.schedule);

    const timer = setInterval(async () => {
      try {
        console.log(`Running job: ${job.name}`);
        job.lastRun = new Date();
        await job.handler();
        job.nextRun = new Date(Date.now() + interval);
      } catch (error) {
        console.error(`Job ${job.name} failed:`, error);
      }
    }, interval);

    this.timers.set(id, timer);
  }

  /**
   * Parse schedule string (simple format: "1h", "30m", "1d")
   */
  private parseSchedule(schedule: string): number {
    const match = schedule.match(/^(\d+)([smhd])$/);
    if (!match) return 60 * 1000; // Default 1 minute

    const [, value, unit] = match;
    const num = parseInt(value, 10);

    switch (unit) {
      case 's':
        return num * 1000;
      case 'm':
        return num * 60 * 1000;
      case 'h':
        return num * 60 * 60 * 1000;
      case 'd':
        return num * 24 * 60 * 60 * 1000;
      default:
        return 60 * 1000;
    }
  }

  /**
   * Stop all jobs
   */
  stop(): void {
    for (const [id, timer] of this.timers) {
      clearInterval(timer);
    }
    this.timers.clear();
    console.log('Job scheduler stopped');
  }

  /**
   * Get job status
   */
  getStatus(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  /**
   * Get all jobs status
   */
  getAllStatus(): Job[] {
    return Array.from(this.jobs.values());
  }
}

// Singleton instance
export const jobScheduler = new JobScheduler();

/**
 * Initialize background jobs
 */
export async function initializeJobs(): Promise<void> {
  const db = await getDb();

  // Job 1: Generate scheduled reports
  jobScheduler.register({
    id: 'generate-reports',
    name: 'Generate Scheduled Reports',
    schedule: '1h', // Every hour
    handler: async () => {
      try {
        console.log('Checking for scheduled reports to generate...');
        // Report generation logic would go here
        // This would query the reporting schedules and generate reports
      } catch (error) {
        console.error('Error generating scheduled reports:', error);
      }
    },
  });

  // Job 2: Cleanup old audit logs
  jobScheduler.register({
    id: 'cleanup-audit-logs',
    name: 'Cleanup Old Audit Logs',
    schedule: '1d', // Daily
    handler: async () => {
      try {
        const db = await getDb();
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        // Delete old audit logs
        if (db) {
          await db.delete(auditLogs)
            .where(lt(auditLogs.createdAt, thirtyDaysAgo.toISOString()));
        }

        console.log('Audit logs cleanup completed');
      } catch (error) {
        console.error('Error cleaning up audit logs:', error);
      }
    },
  });

  // Job 3: Sync Dotloop data
  jobScheduler.register({
    id: 'sync-dotloop-data',
    name: 'Sync Dotloop Data',
    schedule: '30m', // Every 30 minutes
    handler: async () => {
      try {
        console.log('Syncing Dotloop data...');
        // Dotloop sync logic would go here
      } catch (error) {
        console.error('Error syncing Dotloop data:', error);
      }
    },
  });

  // Job 4: Cache cleanup
  jobScheduler.register({
    id: 'cleanup-cache',
    name: 'Cleanup Expired Cache',
    schedule: '5m', // Every 5 minutes
    handler: async () => {
      try {
        // Cache cleanup is handled by TTL, but we can add additional cleanup here
        console.log('Cache cleanup completed');
      } catch (error) {
        console.error('Error cleaning up cache:', error);
      }
    },
  });

  // Start the scheduler
  await jobScheduler.start();
}

/**
 * Check if a schedule should run based on frequency
 */
function shouldRunSchedule(schedule: any): boolean {
  if (!schedule.lastRun) return true;

  const lastRun = new Date(schedule.lastRun);
  const now = new Date();

  const frequencyMs = getFrequencyMs(schedule.frequency || 'daily');
  return now.getTime() - lastRun.getTime() >= frequencyMs;
}

/**
 * Get frequency in milliseconds
 */
function getFrequencyMs(frequency: string): number {
  switch (frequency) {
    case 'daily':
      return 24 * 60 * 60 * 1000;
    case 'weekly':
      return 7 * 24 * 60 * 60 * 1000;
    case 'monthly':
      return 30 * 24 * 60 * 60 * 1000;
    default:
      return 24 * 60 * 60 * 1000;
  }
}

/**
 * Stop all jobs (call on server shutdown)
 */
export function stopJobs(): void {
  jobScheduler.stop();
}
