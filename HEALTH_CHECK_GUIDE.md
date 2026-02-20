# Health Check System Documentation

## Overview

The Dotloop Reporter includes a comprehensive health monitoring system that tracks backend server status, database connectivity, memory usage, and system metrics. The system provides three health check endpoints and an automated monitoring script for detecting and recovering from failures.

## Health Check Endpoints

### 1. Full Health Check: `/health`

Returns comprehensive system status including all health checks and metrics.

**Response Format:**
```json
{
  "status": "healthy" | "degraded" | "unhealthy",
  "timestamp": "2026-02-20T18:55:22.123Z",
  "uptime": 123.456,
  "checks": {
    "database": {
      "status": "up" | "down",
      "responseTime": 98
    },
    "memory": {
      "used": 35,
      "total": 55,
      "percentage": 64.2
    },
    "process": {
      "pid": 12345,
      "nodeVersion": "v22.13.0",
      "platform": "linux"
    }
  }
}
```

**Status Levels:**
- **healthy**: All checks passing, memory < 90%
- **degraded**: All checks passing, but memory ≥ 90%
- **unhealthy**: Database check failed

**Usage:**
```bash
curl http://localhost:3000/health
```

### 2. Liveness Probe: `/health/live`

Simple endpoint to verify the server process is running and responding.

**Response Format:**
```json
{
  "status": "alive",
  "timestamp": "2026-02-20T18:55:33.432Z"
}
```

**Usage:**
```bash
curl http://localhost:3000/health/live
```

**Use Cases:**
- Container orchestration (Kubernetes, Docker Swarm)
- Load balancer health checks
- Simple uptime monitoring

### 3. Readiness Probe: `/health/ready`

Verifies the server is ready to accept traffic (database connectivity confirmed).

**Response Format:**
```json
{
  "status": "ready" | "not_ready",
  "timestamp": "2026-02-20T18:55:33.466Z"
}
```

**Usage:**
```bash
curl http://localhost:3000/health/ready
```

**Use Cases:**
- Load balancer traffic routing decisions
- Deployment readiness checks
- Service mesh integration

## Health Monitoring Script

### Overview

The `health-monitor.mjs` script continuously monitors the health endpoint and automatically restarts the server process when consecutive failures are detected.

### Configuration

Environment variables for customizing monitoring behavior:

| Variable | Default | Description |
|----------|---------|-------------|
| `HEALTH_CHECK_INTERVAL` | 30 | Seconds between health checks |
| `HEALTH_CHECK_URL` | http://localhost:3000/health | Health endpoint URL |
| `HEALTH_CHECK_TIMEOUT` | 5000 | Request timeout in milliseconds |
| `MAX_FAILURES` | 3 | Consecutive failures before restart |

### Running the Monitor

**Using pnpm:**
```bash
pnpm health:monitor
```

**Direct execution:**
```bash
node scripts/health-monitor.mjs
```

**With custom configuration:**
```bash
HEALTH_CHECK_INTERVAL=60 MAX_FAILURES=5 pnpm health:monitor
```

### Monitor Behavior

1. **Normal Operation:**
   - Checks health endpoint every 30 seconds (configurable)
   - Logs successful checks with status, DB, and memory metrics
   - Resets failure counter on each successful check

2. **Failure Detection:**
   - Increments failure counter on each failed check
   - Logs failure reason (timeout, HTTP error, unhealthy status)
   - Continues monitoring until `MAX_FAILURES` reached

3. **Automatic Restart:**
   - Triggers when consecutive failures reach `MAX_FAILURES`
   - Finds and kills the tsx process running the server
   - Starts a new server process in the background
   - Waits 5 seconds for server to initialize
   - Resets failure counter and resumes monitoring

4. **Graceful Shutdown:**
   - Responds to SIGINT (Ctrl+C) and SIGTERM signals
   - Logs shutdown message before exiting

### Example Output

```
[2026-02-20T18:57:38.368Z] Health monitor started
  - Check interval: 30s
  - Health URL: http://localhost:3000/health
  - Max failures: 3
  - Timeout: 5000ms

[2026-02-20T18:57:38.435Z] Health check passed - Status: healthy, DB: up, Memory: 64.2%
[2026-02-20T19:00:08.521Z] Health check passed - Status: healthy, DB: up, Memory: 65.8%
[2026-02-20T19:02:38.612Z] Health check failed (1/3): Request timeout
[2026-02-20T19:03:08.701Z] Health check failed (2/3): Health check returned 500
[2026-02-20T19:03:38.789Z] Health check failed (3/3): Server reported unhealthy status
[2026-02-20T19:03:38.790Z] ⚠️  RESTARTING SERVER - 3 consecutive failures detected
[2026-02-20T19:03:38.891Z] Killing process(es): 12345
[2026-02-20T19:03:40.912Z] Starting new server process...
[2026-02-20T19:03:45.923Z] ✅ Server restart completed
[2026-02-20T19:04:15.034Z] Health check passed - Status: healthy, DB: up, Memory: 58.3%
```

## Quick Reference Commands

### Check Health Status
```bash
# Full health check with formatted JSON
pnpm health:check

# Liveness probe
curl http://localhost:3000/health/live

# Readiness probe
curl http://localhost:3000/health/ready

# Raw health check
curl http://localhost:3000/health
```

### Start Monitoring
```bash
# Start health monitor with default settings
pnpm health:monitor

# Start with custom interval (60 seconds)
HEALTH_CHECK_INTERVAL=60 pnpm health:monitor

# Start with higher failure threshold
MAX_FAILURES=5 pnpm health:monitor

# Start in background with logging
nohup pnpm health:monitor > /tmp/health-monitor.log 2>&1 &
```

### Stop Monitoring
```bash
# Find monitor process
ps aux | grep health-monitor

# Kill monitor process
pkill -f health-monitor.mjs
```

## Production Deployment

### Systemd Service (Linux)

Create `/etc/systemd/system/dotloop-health-monitor.service`:

```ini
[Unit]
Description=Dotloop Reporter Health Monitor
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/dotloop-reporter
Environment="NODE_ENV=production"
Environment="HEALTH_CHECK_INTERVAL=30"
Environment="MAX_FAILURES=3"
ExecStart=/usr/bin/node scripts/health-monitor.mjs
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable dotloop-health-monitor
sudo systemctl start dotloop-health-monitor
sudo systemctl status dotloop-health-monitor
```

### Docker Compose

Add health checks to `docker-compose.yml`:

```yaml
services:
  app:
    image: dotloop-reporter:latest
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health/live"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 40s
    ports:
      - "3000:3000"
```

### Kubernetes

Add health probes to deployment manifest:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dotloop-reporter
spec:
  template:
    spec:
      containers:
      - name: app
        image: dotloop-reporter:latest
        ports:
        - containerPort: 3000
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
```

## Monitoring Integration

### Prometheus Metrics (Future Enhancement)

The health endpoint can be extended to export Prometheus metrics:

```javascript
// Example metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(`
# HELP app_health_status Application health status (1=healthy, 0.5=degraded, 0=unhealthy)
# TYPE app_health_status gauge
app_health_status ${status === 'healthy' ? 1 : status === 'degraded' ? 0.5 : 0}

# HELP app_uptime_seconds Application uptime in seconds
# TYPE app_uptime_seconds counter
app_uptime_seconds ${process.uptime()}

# HELP app_memory_usage_percentage Memory usage percentage
# TYPE app_memory_usage_percentage gauge
app_memory_usage_percentage ${memoryPercentage}

# HELP app_db_response_time_ms Database response time in milliseconds
# TYPE app_db_response_time_ms gauge
app_db_response_time_ms ${dbResponseTime}
  `);
});
```

### External Monitoring Services

The health endpoints can be integrated with external monitoring services:

- **UptimeRobot**: Monitor `/health/live` endpoint
- **Pingdom**: Monitor `/health` endpoint with JSON validation
- **Datadog**: Use `/health` endpoint for custom health checks
- **New Relic**: Integrate with synthetic monitoring
- **StatusCake**: Monitor `/health/ready` for service availability

## Troubleshooting

### Health Check Returns "unhealthy"

**Symptoms:**
- `/health` endpoint returns `"status": "unhealthy"`
- Database check shows `"status": "down"`

**Solutions:**
1. Check database connectivity:
   ```bash
   mysql -h <host> -u <user> -p <database>
   ```
2. Verify `DATABASE_URL` environment variable is correct
3. Check database server is running and accessible
4. Review database logs for connection errors

### Health Check Returns "degraded"

**Symptoms:**
- `/health` endpoint returns `"status": "degraded"`
- Memory usage above 90%

**Solutions:**
1. Check memory usage:
   ```bash
   free -h
   htop
   ```
2. Restart the server to free memory:
   ```bash
   pnpm health:monitor  # Will auto-restart if failures continue
   ```
3. Investigate memory leaks in application code
4. Consider scaling up server resources

### Monitor Script Not Restarting Server

**Symptoms:**
- Monitor detects failures but doesn't restart server
- "Restart already in progress" messages in logs

**Solutions:**
1. Check if tsx process is running:
   ```bash
   ps aux | grep tsx
   ```
2. Manually kill stuck processes:
   ```bash
   pkill -f "tsx watch"
   ```
3. Restart monitor script:
   ```bash
   pkill -f health-monitor
   pnpm health:monitor
   ```

### Health Endpoint Not Responding

**Symptoms:**
- Health check requests timeout
- Monitor script logs "Request timeout" errors

**Solutions:**
1. Verify server is running:
   ```bash
   ps aux | grep tsx
   netstat -tlnp | grep 3000
   ```
2. Check server logs for errors:
   ```bash
   tail -f /tmp/server-restart.log
   ```
3. Manually restart server:
   ```bash
   cd /home/ubuntu/dotloop-reporter
   pnpm dev
   ```

## Best Practices

1. **Always run health monitor in production** to ensure automatic recovery from failures
2. **Set appropriate failure thresholds** based on your application's criticality (default: 3 failures)
3. **Monitor health check logs** for patterns indicating underlying issues
4. **Integrate with external monitoring** for alerting and incident response
5. **Test restart behavior** in staging environment before deploying to production
6. **Configure health check intervals** based on your SLA requirements (default: 30 seconds)
7. **Use liveness probes** for container orchestration health checks
8. **Use readiness probes** for load balancer traffic routing decisions

## Related Documentation

- [Admin Dashboard Guide](./Admin_Dashboard_Guide.md)
- [Security Documentation](./SECURITY.md)
- [CSV Robustness Guide](./CSV_ROBUSTNESS_GUIDE.md)
- [Performance Metrics](./Performance_Metrics_Guide.md)

## Support

For issues or questions about the health check system:
- Review server logs: `/tmp/server-restart.log`
- Check monitor logs: `nohup.out` or systemd journal
- Verify database connectivity and server resources
- Contact the development team for assistance
