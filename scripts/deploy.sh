#!/usr/bin/env bash
set -euo pipefail

# One-Command Deployment / Update Script

echo "Deploying latest updates for Aegis IAM Portal..."

# 1. Pull latest code (if using git)
if [ -d ".git" ]; then
    echo "1. Pulling latest Git changes..."
    git pull origin main || git pull origin master || true
fi

# 2. Rebuild and restart containers
echo "2. Rebuilding and starting containers..."
docker compose -f docker-compose.prod.yml up -d --build --remove-orphans

# 3. Check health
echo "3. Verifying service health..."
sleep 5
docker compose -f docker-compose.prod.yml ps

echo "Deployment finished successfully!"
