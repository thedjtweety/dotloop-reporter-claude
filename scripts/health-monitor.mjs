#!/usr/bin/env node

/**
 * Health Monitor Script
 * 
 * Periodically checks the health endpoint and restarts the server if unhealthy.
 * This script is designed to run alongside the main server process.
 * 
 * Usage:
 *   node scripts/health-monitor.mjs
 * 
 * Environment Variables:
 *   HEALTH_CHECK_INTERVAL - Interval between health checks in seconds (default: 30)
 *   HEALTH_CHECK_URL - URL to check (default: http://localhost:3000/health)
 *   HEALTH_CHECK_TIMEOUT - Request timeout in milliseconds (default: 5000)
 *   MAX_FAILURES - Number of consecutive failures before restart (default: 3)
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const CONFIG = {
  interval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30') * 1000,
  url: process.env.HEALTH_CHECK_URL || 'http://localhost:3000/health',
  timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000'),
  maxFailures: parseInt(process.env.MAX_FAILURES || '3'),
};

let consecutiveFailures = 0;
let lastHealthyTime = Date.now();
let isRestarting = false;

/**
 * Check health endpoint
 */
async function checkHealth() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);
    
    const response = await fetch(CONFIG.url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Health check returned ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'unhealthy') {
      throw new Error('Server reported unhealthy status');
    }
    
    // Success
    consecutiveFailures = 0;
    lastHealthyTime = Date.now();
    
    console.log(`[${new Date().toISOString()}] Health check passed - Status: ${data.status}, DB: ${data.checks.database.status}, Memory: ${data.checks.memory.percentage}%`);
    
    return true;
  } catch (error) {
    consecutiveFailures++;
    const message = error.name === 'AbortError' ? 'Request timeout' : error.message;
    console.error(`[${new Date().toISOString()}] Health check failed (${consecutiveFailures}/${CONFIG.maxFailures}): ${message}`);
    
    return false;
  }
}

/**
 * Restart the server process
 */
async function restartServer() {
  if (isRestarting) {
    console.log(`[${new Date().toISOString()}] Restart already in progress, skipping...`);
    return;
  }
  
  isRestarting = true;
  console.error(`[${new Date().toISOString()}] ⚠️  RESTARTING SERVER - ${consecutiveFailures} consecutive failures detected`);
  
  try {
    // Find and kill the tsx process
    const { stdout } = await execAsync('pgrep -f "tsx watch server/_core/index.ts"');
    const pids = stdout.trim().split('\n').filter(Boolean);
    
    if (pids.length > 0) {
      console.log(`[${new Date().toISOString()}] Killing process(es): ${pids.join(', ')}`);
      await execAsync(`kill ${pids.join(' ')}`);
      
      // Wait for process to die
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Start new server process
    console.log(`[${new Date().toISOString()}] Starting new server process...`);
    exec('cd /home/ubuntu/dotloop-reporter && NODE_ENV=development tsx watch server/_core/index.ts > /tmp/server-restart.log 2>&1 &');
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Reset failure counter
    consecutiveFailures = 0;
    console.log(`[${new Date().toISOString()}] ✅ Server restart completed`);
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to restart server:`, error.message);
  } finally {
    isRestarting = false;
  }
}

/**
 * Main monitoring loop
 */
async function monitor() {
  console.log(`[${new Date().toISOString()}] Health monitor started`);
  console.log(`  - Check interval: ${CONFIG.interval / 1000}s`);
  console.log(`  - Health URL: ${CONFIG.url}`);
  console.log(`  - Max failures: ${CONFIG.maxFailures}`);
  console.log(`  - Timeout: ${CONFIG.timeout}ms`);
  console.log('');
  
  while (true) {
    const isHealthy = await checkHealth();
    
    if (!isHealthy && consecutiveFailures >= CONFIG.maxFailures) {
      await restartServer();
    }
    
    await new Promise(resolve => setTimeout(resolve, CONFIG.interval));
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n[${new Date().toISOString()}] Health monitor shutting down...`);
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(`\n[${new Date().toISOString()}] Health monitor shutting down...`);
  process.exit(0);
});

// Start monitoring
monitor().catch(error => {
  console.error(`[${new Date().toISOString()}] Fatal error:`, error);
  process.exit(1);
});
