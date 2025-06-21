#!/bin/bash
# ---- SafeBallot staging update ---------------------------------
set -e

echo "🚀 Starting SafeBallot Staging Environment Update..."

cd ~/safeballot

echo "📦 Stopping existing containers..."
docker compose -f docker-compose.simple.yml down

echo "💾 Backup current frontend..."
if [ -d "frontend/build" ]; then
  mv frontend/build frontend/build.backup.$(date +%Y%m%d_%H%M%S)
fi

echo "📁 Extracting new frontend build..."
if [ -f "frontend-build-mock-payment.tar.gz" ]; then
  mkdir -p frontend
  tar -xzf frontend-build-mock-payment.tar.gz -C frontend/
else
  echo "❌ frontend-build-mock-payment.tar.gz not found"; exit 1
fi

echo "🏗️  Rebuilding containers..."
docker compose -f docker-compose.simple.yml build --no-cache backend
docker compose -f docker-compose.simple.yml up -d

echo "⏳ Waiting for services..."
sleep 10
docker compose -f docker-compose.simple.yml ps

echo "🧪 API health test..."
if curl -fs http://localhost/api/health >/dev/null; then
  echo "✅ API health check passed"
else
  echo "⚠️  API health check failed"; docker compose -f docker-compose.simple.yml logs backend --tail 20
fi

echo "🎉 Done!  App at http://$PUBLIC_DNS"
