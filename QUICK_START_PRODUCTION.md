# Quick Start: Production Deployment

## 🚀 Deploy to Production in 5 Minutes

This guide walks you through deploying Dotloop Reporter to a production Ubuntu server with automatic health monitoring and recovery.

## Prerequisites Checklist

- [ ] Ubuntu 20.04+ or Debian 11+ server
- [ ] Node.js 22+ installed (`node --version`)
- [ ] sudo/root access
- [ ] MySQL/MariaDB database available
- [ ] Domain name configured (optional)

## Step-by-Step Deployment

### 1. Clone and Setup (2 minutes)

```bash
# SSH into your production server
ssh user@your-server.com

# Clone repository
cd /home/ubuntu
git clone <your-repository-url> dotloop-reporter
cd dotloop-reporter

# Install dependencies
pnpm install
```

### 2. Configure Environment (1 minute)

```bash
# Copy environment template
cp .env.production.example .env.production

# Edit with your production values
nano .env.production
```

**Required Variables:**
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=mysql://user:password@localhost:3306/dotloop_db
JWT_SECRET=your-secure-random-secret-here
TOKEN_ENCRYPTION_KEY=another-secure-random-key-here
```

**Generate secure secrets:**
```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate TOKEN_ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Build Application (1 minute)

```bash
# Build for production
pnpm build

# Run database migrations
pnpm db:push

# Verify build
ls -la dist/index.js
```

### 4. Install Systemd Services (1 minute)

```bash
# Install and start services
pnpm systemd:install
```

**Expected Output:**
```
[INFO] Checking prerequisites...
[SUCCESS] Prerequisites check passed
[INFO] Creating necessary directories...
[SUCCESS] Directories created
[INFO] Installing systemd services...
[SUCCESS] Service files installed
[INFO] Enabling and starting services...
[SUCCESS] Services enabled and started
[INFO] Checking service status...
● dotloop-reporter.service - Dotloop Reporter
   Active: active (running)
● dotloop-health-monitor.service - Health Monitor
   Active: active (running)
[SUCCESS] Deployment complete!
```

### 5. Verify Deployment (30 seconds)

```bash
# Check service status
pnpm systemd:status

# Test health endpoint
curl http://localhost:3000/health

# Follow logs
sudo journalctl -u dotloop-reporter -f
```

**Expected Health Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-20T19:00:00.000Z",
  "uptime": 123.456,
  "checks": {
    "database": { "status": "up", "responseTime": 5 },
    "memory": { "used": 512, "total": 2048, "percentage": 25.0 }
  }
}
```

## ✅ Deployment Complete!

Your application is now running with:
- ✅ Automatic startup on server boot
- ✅ Health monitoring every 30 seconds
- ✅ Automatic restart on failures
- ✅ Systemd journal logging
- ✅ Resource limits and security hardening

## Common Post-Deployment Tasks

### Setup Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt update
sudo apt install nginx

# Create configuration
sudo nano /etc/nginx/sites-available/dotloop-reporter
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/dotloop-reporter /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal is configured automatically
sudo certbot renew --dry-run
```

### Configure Firewall

```bash
# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp  # SSH

# Enable firewall
sudo ufw enable
```

### Setup Automated Backups

```bash
# Create backup script
sudo nano /usr/local/bin/backup-dotloop.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/dotloop-reporter"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup database
mysqldump -u user -p'password' dotloop_db > $BACKUP_DIR/db_$DATE.sql

# Backup uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /home/ubuntu/dotloop-reporter/uploads

# Keep only last 7 days
find $BACKUP_DIR -mtime +7 -delete
```

```bash
# Make executable
sudo chmod +x /usr/local/bin/backup-dotloop.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-dotloop.sh
```

## Service Management Cheat Sheet

```bash
# Check status
pnpm systemd:status

# Restart services
pnpm systemd:restart

# View logs
pnpm systemd:logs

# Follow live logs
sudo journalctl -u dotloop-reporter -f

# Stop services
sudo systemctl stop dotloop-reporter dotloop-health-monitor

# Start services
sudo systemctl start dotloop-reporter dotloop-health-monitor

# Uninstall services
pnpm systemd:uninstall
```

## Updating Your Deployment

```bash
# 1. Pull latest changes
cd /home/ubuntu/dotloop-reporter
git pull origin main

# 2. Install dependencies
pnpm install

# 3. Rebuild
pnpm build

# 4. Run migrations
pnpm db:push

# 5. Restart services
pnpm systemd:restart

# 6. Verify
pnpm systemd:status
curl http://localhost:3000/health
```

## Monitoring Your Deployment

### View Real-Time Logs

```bash
# Application logs
sudo journalctl -u dotloop-reporter -f

# Health monitor logs
sudo journalctl -u dotloop-health-monitor -f

# Both services
sudo journalctl -u dotloop-reporter -u dotloop-health-monitor -f
```

### Check Health Status

```bash
# Quick check
curl http://localhost:3000/health | jq .

# Using pnpm
pnpm health:check

# Watch continuously
watch -n 5 'curl -s http://localhost:3000/health | jq .'
```

### Monitor Resource Usage

```bash
# Memory and CPU
htop

# Disk usage
df -h

# Service resource usage
systemctl status dotloop-reporter
```

## Troubleshooting

### Service Won't Start

```bash
# Check logs
sudo journalctl -u dotloop-reporter -n 50

# Test manually
cd /home/ubuntu/dotloop-reporter
NODE_ENV=production node dist/index.js

# Check port availability
sudo netstat -tlnp | grep 3000
```

### Database Connection Errors

```bash
# Test database connection
mysql -h localhost -u user -p dotloop_db

# Verify DATABASE_URL
cat .env.production | grep DATABASE_URL

# Check MySQL service
sudo systemctl status mysql
```

### High Memory Usage

```bash
# Check memory
free -h

# Restart services
pnpm systemd:restart

# Adjust memory limits
sudo nano /etc/systemd/system/dotloop-reporter.service
# Change: MemoryLimit=4G
sudo systemctl daemon-reload
sudo systemctl restart dotloop-reporter
```

## External Monitoring (Optional)

### UptimeRobot

1. Sign up at https://uptimerobot.com
2. Add HTTP(s) monitor
3. URL: `https://yourdomain.com/health/live`
4. Interval: 5 minutes
5. Alert contacts: Email, SMS, Slack

### Datadog

```bash
# Install Datadog agent
DD_API_KEY=<your-key> DD_SITE="datadoghq.com" bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_script.sh)"

# Configure HTTP check
sudo nano /etc/datadog-agent/conf.d/http_check.d/conf.yaml
```

```yaml
init_config:

instances:
  - name: Dotloop Reporter
    url: http://localhost:3000/health
    timeout: 5
    http_response_status_code: 200
```

## Security Checklist

- [ ] Change default passwords
- [ ] Generate secure JWT_SECRET and TOKEN_ENCRYPTION_KEY
- [ ] Configure firewall (ufw)
- [ ] Setup SSL certificate (Let's Encrypt)
- [ ] Enable automatic security updates
- [ ] Configure fail2ban for SSH protection
- [ ] Regular database backups
- [ ] Monitor logs for suspicious activity

## Performance Optimization

```bash
# Adjust Node.js memory
sudo nano /etc/systemd/system/dotloop-reporter.service
# Add: Environment="NODE_OPTIONS=--max-old-space-size=4096"

# Increase file descriptors
# Change: LimitNOFILE=131072

# Adjust CPU quota
# Change: CPUQuota=400%

# Reload and restart
sudo systemctl daemon-reload
pnpm systemd:restart
```

## Need Help?

- 📖 Full Documentation: [SYSTEMD_DEPLOYMENT.md](./SYSTEMD_DEPLOYMENT.md)
- 🏥 Health Monitoring: [HEALTH_CHECK_GUIDE.md](./HEALTH_CHECK_GUIDE.md)
- 🔒 Security Guide: [SECURITY.md](./SECURITY.md)
- 📊 Performance: [Performance_Metrics_Guide.md](./Performance_Metrics_Guide.md)

## Success Indicators

Your deployment is successful when:
- ✅ `pnpm systemd:status` shows both services active (running)
- ✅ `curl http://localhost:3000/health` returns `"status": "healthy"`
- ✅ Application accessible via browser
- ✅ Health monitor logs show regular check-ins
- ✅ Services survive server reboot

**Congratulations! Your Dotloop Reporter is now running in production! 🎉**
