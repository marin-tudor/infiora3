#!/bin/bash

# Setup log rotation for the Node.js application
# This should be run once on the EC2 instance

APP_PATH=$(pwd)
LOG_PATH="$APP_PATH/logs"

echo "Setting up log rotation for application logs..."

# Create logrotate configuration
sudo tee /etc/logrotate.d/nodejs-app > /dev/null <<EOF
$LOG_PATH/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 $(whoami) $(whoami)
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# Create PM2 logrotate configuration
sudo tee /etc/logrotate.d/pm2 > /dev/null <<EOF
$HOME/.pm2/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 $(whoami) $(whoami)
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

echo "✅ Log rotation configured successfully!"
echo "Logs will be rotated daily and kept for 7 days."
echo ""
echo "To test the configuration, run:"
echo "sudo logrotate -d /etc/logrotate.d/nodejs-app"
echo "sudo logrotate -d /etc/logrotate.d/pm2"