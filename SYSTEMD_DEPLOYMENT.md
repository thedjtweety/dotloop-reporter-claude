# Systemd Service Deployment Guide

## Overview

This guide explains how to deploy the Dotloop Reporter as a production systemd service with automatic health monitoring and recovery. The deployment includes two services:

1. **dotloop-reporter.service** - Main application server
2. **dotloop-health-monitor.service** - Health monitoring and automatic restart

## Prerequisites

- Ubuntu/Debian Linux with systemd
- Node.js 22+ installed
- sudo/root access
- Application built (`pnpm build`)
- Production environment configured

## Quick Start

### 1. Build the Application

```bash
cd /home/ubuntu/dotloop-reporter
pnpm install
pnpm build
```

### 2. Configure Production Environment

```bash
# Copy environment template
cp .env.production.example .env.production

# Edit production environment (most values auto-injected by Manus)
nano .env.production
```

### 3. Install Systemd Services

```bash
# Install and start services
pnpm systemd:install

# Check service status
pnpm systemd:status
```

### 4. Verify Deployment

```bash
# Check if services are running
sudo systemctl status dotloop-reporter
sudo systemctl status dotloop-health-monitor

# Test health endpoint
curl http://localhost:3000/health

# Follow logs
sudo journalctl -u dotloop-reporter -f
```

## Service Management Commands

### Using pnpm Scripts

```bash
# Install services (first-time setup)
pnpm systemd:install

# Check service status
pnpm systemd:status

# Restart services
pnpm systemd:restart

# View recent logs
pnpm systemd:logs

# Uninstall services
pnpm systemd:uninstall
```

### Using systemctl Directly

```bash
# Start services
sudo systemctl start dotloop-reporter
sudo systemctl start dotloop-health-monitor

# Stop services
sudo systemctl stop dotloop-health-monitor
sudo systemctl stop dotloop-reporter

# Restart services
sudo systemctl restart dotloop-reporter
sudo systemctl restart dotloop-health-monitor

# Enable on boot
sudo systemctl enable dotloop-reporter
sudo systemctl enable dotloop-health-monitor

# Disable on boot
sudo systemctl disable dotloop-reporter
sudo systemctl disable dotloop-health-monitor

# Check status
sudo systemctl status dotloop-reporter
sudo systemctl status dotloop-health-monitor
```

## Service Configuration

### Main Application Service

**File:** `/etc/systemd/system/dotloop-reporter.service`

**Key Features:**
- Runs as `ubuntu` user for security
- Automatic restart on failure (10 second delay)
- Resource limits: 2GB memory, 200% CPU
- Security hardening: NoNewPrivileges, PrivateTmp, ProtectSystem
- Logs to systemd journal
- Depends on network and MySQL

**Environment Variables:**
- `NODE_ENV=production`
- `PORT=3000`
- Additional variables from `.env.production`

### Health Monitor Service

**File:** `/etc/systemd/system/dotloop-health-monitor.service`

**Key Features:**
- Monitors main application health every 30 seconds
- Automatically restarts application on 3 consecutive failures
- Runs as `ubuntu` user
- Minimal resource usage (256MB memory, 50% CPU)
- Starts after main application
- Stops when main application stops (PartOf)

**Environment Variables:**
- `HEALTH_CHECK_INTERVAL=30` (seconds)
- `MAX_FAILURES=3`
- `HEALTH_CHECK_URL=http://localhost:3000/health`
- `HEALTH_CHECK_TIMEOUT=5000` (milliseconds)

## Viewing Logs

### Real-time Log Streaming

```bash
# Follow application logs
sudo journalctl -u dotloop-reporter -f

# Follow health monitor logs
sudo journalctl -u dotloop-health-monitor -f

# Follow both services
sudo journalctl -u dotloop-reporter -u dotloop-health-monitor -f
```

### Historical Logs

```bash
# Last 100 lines
sudo journalctl -u dotloop-reporter -n 100

# Logs since yesterday
sudo journalctl -u dotloop-reporter --since yesterday

# Logs from specific time range
sudo journalctl -u dotloop-reporter --since "2026-02-20 10:00:00" --until "2026-02-20 12:00:00"

# Export logs to file
sudo journalctl -u dotloop-reporter > /tmp/app-logs.txt
```

### Log Filtering

```bash
# Only errors
sudo journalctl -u dotloop-reporter -p err

# Only warnings and errors
sudo journalctl -u dotloop-reporter -p warning

# Search for specific text
sudo journalctl -u dotloop-reporter | grep "error"
```

## Deployment Workflow

### Initial Deployment

```bash
# 1. Clone repository
cd /home/ubuntu
git clone <repository-url> dotloop-reporter
cd dotloop-reporter

# 2. Install dependencies
pnpm install

# 3. Configure environment
cp .env.production.example .env.production
nano .env.production

# 4. Build application
pnpm build

# 5. Run database migrations
pnpm db:push

# 6. Install systemd services
pnpm systemd:install

# 7. Verify deployment
pnpm systemd:status
curl http://localhost:3000/health
```

### Updating Deployment

```bash
# 1. Pull latest changes
cd /home/ubuntu/dotloop-reporter
git pull origin main

# 2. Install new dependencies
pnpm install

# 3. Rebuild application
pnpm build

# 4. Run database migrations
pnpm db:push

# 5. Restart services
pnpm systemd:restart

# 6. Verify update
pnpm systemd:status
curl http://localhost:3000/health
```

### Rolling Back

```bash
# 1. Checkout previous version
cd /home/ubuntu/dotloop-reporter
git checkout <previous-commit-hash>

# 2. Rebuild
pnpm install
pnpm build

# 3. Restart services
pnpm systemd:restart

# 4. Verify rollback
pnpm systemd:status
```

## Monitoring and Alerts

### Health Check Monitoring

The health monitor service automatically:
- Checks `/health` endpoint every 30 seconds
- Logs all health check results to systemd journal
- Restarts application after 3 consecutive failures
- Resets failure counter on successful check

**View Health Monitor Activity:**
```bash
sudo journalctl -u dotloop-health-monitor -f
```

**Example Output:**
```
[2026-02-20T18:57:38.435Z] Health check passed - Status: healthy, DB: up, Memory: 64.2%
[2026-02-20T19:00:08.521Z] Health check passed - Status: healthy, DB: up, Memory: 65.8%
[2026-02-20T19:02:38.612Z] Health check failed (1/3): Request timeout
[2026-02-20T19:03:08.701Z] Health check failed (2/3): Health check returned 500
[2026-02-20T19:03:38.789Z] Health check failed (3/3): Server reported unhealthy status
[2026-02-20T19:03:38.790Z] ⚠️  RESTARTING SERVER - 3 consecutive failures detected
```

### External Monitoring Integration

**UptimeRobot:**
```
Monitor Type: HTTP(s)
URL: https://yourdomain.com/health/live
Interval: 5 minutes
Alert Contacts: Email, SMS, Slack
```

**Datadog:**
```yaml
# /etc/datadog-agent/conf.d/http_check.d/conf.yaml
init_config:

instances:
  - name: Dotloop Reporter Health
    url: http://localhost:3000/health
    timeout: 5
    http_response_status_code: 200
    content_match: '"status":"healthy"'
    check_interval: 30
```

**Prometheus:**
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'dotloop-reporter'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/health'
    scrape_interval: 30s
```

## Troubleshooting

### Service Won't Start

**Symptoms:**
- `systemctl start dotloop-reporter` fails
- Service shows "failed" status

**Solutions:**

1. Check service logs:
   ```bash
   sudo journalctl -u dotloop-reporter -n 50
   ```

2. Verify application is built:
   ```bash
   ls -la /home/ubuntu/dotloop-reporter/dist/index.js
   ```

3. Check environment variables:
   ```bash
   sudo systemctl show dotloop-reporter -p Environment
   ```

4. Test application manually:
   ```bash
   cd /home/ubuntu/dotloop-reporter
   NODE_ENV=production node dist/index.js
   ```

5. Check port availability:
   ```bash
   sudo netstat -tlnp | grep 3000
   ```

### Health Monitor Not Restarting Application

**Symptoms:**
- Application fails but doesn't restart
- Health monitor logs show failures but no restart

**Solutions:**

1. Check health monitor logs:
   ```bash
   sudo journalctl -u dotloop-health-monitor -n 50
   ```

2. Verify health monitor is running:
   ```bash
   sudo systemctl status dotloop-health-monitor
   ```

3. Test health endpoint manually:
   ```bash
   curl http://localhost:3000/health
   ```

4. Check health monitor permissions:
   ```bash
   ls -la /home/ubuntu/dotloop-reporter/scripts/health-monitor.mjs
   ```

5. Restart health monitor:
   ```bash
   sudo systemctl restart dotloop-health-monitor
   ```

### Database Connection Errors

**Symptoms:**
- Health endpoint returns "unhealthy"
- Application logs show database errors

**Solutions:**

1. Check database connectivity:
   ```bash
   mysql -h <host> -u <user> -p <database>
   ```

2. Verify DATABASE_URL in environment:
   ```bash
   cat /home/ubuntu/dotloop-reporter/.env.production | grep DATABASE_URL
   ```

3. Check MySQL service:
   ```bash
   sudo systemctl status mysql
   ```

4. Test database from application:
   ```bash
   cd /home/ubuntu/dotloop-reporter
   pnpm db:push
   ```

### High Memory Usage

**Symptoms:**
- Health endpoint returns "degraded"
- Memory usage above 90%

**Solutions:**

1. Check current memory usage:
   ```bash
   free -h
   htop
   ```

2. Restart application to free memory:
   ```bash
   pnpm systemd:restart
   ```

3. Adjust memory limits in service file:
   ```bash
   sudo nano /etc/systemd/system/dotloop-reporter.service
   # Change MemoryLimit=2G to higher value
   sudo systemctl daemon-reload
   sudo systemctl restart dotloop-reporter
   ```

4. Investigate memory leaks:
   ```bash
   # Enable Node.js heap profiling
   sudo nano /etc/systemd/system/dotloop-reporter.service
   # Add: Environment="NODE_OPTIONS=--max-old-space-size=4096"
   ```

### Permission Denied Errors

**Symptoms:**
- Service fails with permission errors
- Cannot write to logs or uploads directory

**Solutions:**

1. Fix directory permissions:
   ```bash
   sudo chown -R ubuntu:ubuntu /home/ubuntu/dotloop-reporter
   sudo chmod -R 755 /home/ubuntu/dotloop-reporter
   ```

2. Check service user:
   ```bash
   sudo systemctl show dotloop-reporter -p User
   ```

3. Verify directory ownership:
   ```bash
   ls -la /home/ubuntu/dotloop-reporter/logs
   ls -la /home/ubuntu/dotloop-reporter/uploads
   ```

## Security Best Practices

### Service Hardening

Both services include security hardening:
- `NoNewPrivileges=true` - Prevents privilege escalation
- `PrivateTmp=true` - Isolated /tmp directory
- `ProtectSystem=strict` - Read-only system directories
- `ProtectHome=read-only` - Limited home directory access

### File Permissions

```bash
# Service files should be owned by root
sudo chown root:root /etc/systemd/system/dotloop-*.service
sudo chmod 644 /etc/systemd/system/dotloop-*.service

# Application files should be owned by ubuntu user
sudo chown -R ubuntu:ubuntu /home/ubuntu/dotloop-reporter
sudo chmod -R 755 /home/ubuntu/dotloop-reporter

# Sensitive files should have restricted permissions
chmod 600 /home/ubuntu/dotloop-reporter/.env.production
```

### Firewall Configuration

```bash
# Allow HTTP/HTTPS traffic
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Block direct access to application port (use reverse proxy)
sudo ufw deny 3000/tcp

# Enable firewall
sudo ufw enable
```

### Reverse Proxy (Nginx)

```nginx
# /etc/nginx/sites-available/dotloop-reporter
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }
}
```

## Performance Tuning

### Resource Limits

Adjust service resource limits based on your server capacity:

```bash
sudo nano /etc/systemd/system/dotloop-reporter.service
```

```ini
# Memory limit (default: 2GB)
MemoryLimit=4G

# CPU quota (default: 200% = 2 cores)
CPUQuota=400%

# File descriptor limit (default: 65536)
LimitNOFILE=131072
```

### Node.js Optimization

```bash
# Add to service file
Environment="NODE_OPTIONS=--max-old-space-size=4096 --max-http-header-size=16384"
```

### Database Connection Pooling

Configure in `.env.production`:
```
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20
DATABASE_IDLE_TIMEOUT=10000
```

## Backup and Recovery

### Automated Backups

```bash
# Create backup script
sudo nano /usr/local/bin/backup-dotloop.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/dotloop-reporter"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
mysqldump -u user -p database > $BACKUP_DIR/db_$DATE.sql

# Backup uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /home/ubuntu/dotloop-reporter/uploads

# Keep only last 7 days
find $BACKUP_DIR -mtime +7 -delete
```

### Cron Schedule

```bash
# Add to crontab
sudo crontab -e
```

```
# Daily backup at 2 AM
0 2 * * * /usr/local/bin/backup-dotloop.sh
```

## Related Documentation

- [Health Check System Guide](./HEALTH_CHECK_GUIDE.md)
- [Security Documentation](./SECURITY.md)
- [Admin Dashboard Guide](./Admin_Dashboard_Guide.md)
- [Performance Metrics](./Performance_Metrics_Guide.md)

## Support

For deployment issues or questions:
- Check systemd logs: `sudo journalctl -u dotloop-reporter`
- Review health monitor logs: `sudo journalctl -u dotloop-health-monitor`
- Test health endpoint: `curl http://localhost:3000/health`
- Contact the development team for assistance
