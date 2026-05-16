# Maintenance Scripts

This directory contains scripts to help manage disk space and maintain the health of your EC2 deployment.

## Scripts

### `cleanup.sh`
**Purpose:** Automated cleanup script to free up disk space.

**What it cleans:**
- PM2 logs older than 7 days
- Yarn and npm caches
- Temporary files and directories
- Docker images and containers (if Docker is installed)
- Old application logs
- TypeScript build artifacts

**Usage:**
```bash
./scripts/cleanup.sh
```

**Recommended frequency:** Run weekly via cron job

### `setup-logrotate.sh`
**Purpose:** Sets up automatic log rotation using logrotate.

**What it configures:**
- Daily rotation of application logs
- Keeps logs for 7 days
- Compresses old logs
- Automatic PM2 log reload

**Usage (run once on EC2):**
```bash
./scripts/setup-logrotate.sh
```

## Setting up Automated Cleanup

### Option 1: Cron Job (Recommended)
Add this to your crontab to run cleanup weekly:

```bash
# Edit crontab
crontab -e

# Add this line (runs every Sunday at 2 AM)
0 2 * * 0 /path/to/your/app/scripts/cleanup.sh >> /var/log/app-cleanup.log 2>&1
```

### Option 2: Systemd Timer
Create a systemd service and timer for more advanced scheduling.

## Common Disk Space Issues

### 1. **Log Files**
- **Cause:** PM2 and application logs growing indefinitely
- **Solution:** Use `setup-logrotate.sh` and `cleanup.sh`

### 2. **Node Modules**
- **Cause:** Multiple deployments keeping old node_modules
- **Solution:** Deployment workflow now cleans these up automatically

### 3. **Package Manager Cache**
- **Cause:** Yarn/npm cache accumulating over time
- **Solution:** `cleanup.sh` clears these caches

### 4. **Docker (if used)**
- **Cause:** Unused Docker images and containers
- **Solution:** `cleanup.sh` includes Docker cleanup

## Monitoring Disk Usage

### Check current disk usage:
```bash
df -h
```

### Find largest directories:
```bash
du -sh * | sort -hr | head -10
```

### Monitor in real-time:
```bash
watch -n 30 df -h
```

## Emergency Cleanup

If you're running critically low on disk space:

1. **Immediate cleanup:**
   ```bash
   ./scripts/cleanup.sh
   ```

2. **Clear PM2 logs immediately:**
   ```bash
   pm2 flush
   ```

3. **Clear system logs:**
   ```bash
   sudo journalctl --vacuum-time=1d
   ```

4. **Find and remove largest files:**
   ```bash
   find / -type f -size +100M 2>/dev/null | head -20
   ```

## Best Practices

1. **Monitor regularly:** Set up disk usage alerts
2. **Automate cleanup:** Use cron jobs for regular maintenance
3. **Log rotation:** Always configure log rotation
4. **Deployment cleanup:** Include cleanup steps in CI/CD
5. **Storage monitoring:** Use CloudWatch or similar for alerts

## Troubleshooting

### Script Permission Issues
```bash
chmod +x scripts/*.sh
```

### Logrotate Not Working
```bash
# Test configuration
sudo logrotate -d /etc/logrotate.d/nodejs-app

# Force rotation
sudo logrotate -f /etc/logrotate.d/nodejs-app
```

### PM2 Issues
```bash
# Restart PM2
pm2 restart all

# Reload PM2 logs
pm2 reloadLogs
```