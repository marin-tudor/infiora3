#!/bin/bash

# EC2 Backend Cleanup Script
# Run this script periodically to free up disk space

echo "🧹 Starting cleanup process..."

# Check disk space before cleanup
echo "=== Disk Usage Before Cleanup ==="
df -h

echo ""
echo "🗂️  Cleaning PM2 logs..."
pm2 flush 2>/dev/null || echo "PM2 not running"
find ~/.pm2/logs -name "*.log" -mtime +7 -delete 2>/dev/null || true

echo ""
echo "📦 Cleaning package manager caches..."
# Clean yarn cache
yarn cache clean --force 2>/dev/null || true
# Clean npm cache
npm cache clean --force 2>/dev/null || true

echo ""
echo "🗃️  Cleaning temporary files..."
# Clean temp directories
find /tmp -name "yarn-*" -type d -mtime +1 -exec rm -rf {} + 2>/dev/null || true
find /tmp -name "npm-*" -type d -mtime +1 -exec rm -rf {} + 2>/dev/null || true
find /tmp -name "node-*" -type d -mtime +1 -exec rm -rf {} + 2>/dev/null || true

echo ""
echo "🐳 Cleaning Docker (if applicable)..."
# Clean Docker if it's installed
if command -v docker &> /dev/null; then
    docker system prune -f 2>/dev/null || true
    docker image prune -f 2>/dev/null || true
fi

echo ""
echo "📝 Cleaning application logs..."
# Clean application logs older than 30 days
find . -name "*.log" -mtime +30 -delete 2>/dev/null || true

echo ""
echo "🗑️  Cleaning old build artifacts..."
# Remove old TypeScript build info
find . -name "*.tsbuildinfo" -mtime +7 -delete 2>/dev/null || true

echo ""
echo "🧹 Cleaning system logs (requires sudo)..."
# Clean system logs (this might require sudo)
sudo journalctl --vacuum-time=7d 2>/dev/null || echo "Could not clean system logs (no sudo access)"

# Check disk space after cleanup
echo ""
echo "=== Disk Usage After Cleanup ==="
df -h

echo ""
echo "✅ Cleanup completed!"

# Show largest directories
echo ""
echo "📊 Largest directories in current path:"
du -sh * 2>/dev/null | sort -hr | head -10