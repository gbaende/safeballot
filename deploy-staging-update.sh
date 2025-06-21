#!/bin/bash

# Staging Environment Update Script
# This script updates the SafeBallot staging environment with the mock payment form

echo "🚀 Starting SafeBallot Staging Environment Update..."

# Stop existing containers
echo "📦 Stopping existing containers..."
cd ~/safeballot
docker-compose -f docker-compose.simple.yml down

# Backup current frontend (optional)
echo "💾 Creating backup of current frontend..."
if [ -d "frontend/build" ]; then
    mv frontend/build frontend/build.backup.$(date +%Y%m%d_%H%M%S)
fi

# Extract new frontend build
echo "📁 Extracting new frontend build..."
if [ -f "frontend-build-mock-payment.tar.gz" ]; then
    mkdir -p frontend
    tar -xzf frontend-build-mock-payment.tar.gz -C frontend/
    echo "✅ Frontend build extracted successfully"
else
    echo "❌ Error: frontend-build-mock-payment.tar.gz not found"
    exit 1
fi

# Update docker-compose configuration
echo "🔧 Updating docker-compose configuration..."
if [ -f "docker-compose.simple.yml" ]; then
    echo "✅ Docker-compose configuration updated"
else
    echo "❌ Error: docker-compose.simple.yml not found"
    exit 1
fi

# Rebuild and start containers
echo "🏗️  Rebuilding and starting containers..."
docker-compose -f docker-compose.simple.yml build --no-cache backend
docker-compose -f docker-compose.simple.yml up -d

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 10

# Check container status
echo "📊 Checking container status..."
docker-compose -f docker-compose.simple.yml ps

# Test the application
echo "🧪 Testing application endpoints..."
echo "Frontend: http://ec2-3-235-213-160.compute-1.amazonaws.com"
echo "API Health: http://ec2-3-235-213-160.compute-1.amazonaws.com/api/health"

# Test API health endpoint
if curl -f -s http://localhost/api/health > /dev/null; then
    echo "✅ API health check passed"
else
    echo "⚠️  API health check failed - checking logs..."
    docker-compose -f docker-compose.simple.yml logs backend --tail=20
fi

echo "🎉 Staging environment update completed!"
echo ""
echo "📋 Summary of changes:"
echo "  ✅ Replaced Stripe payment with mock payment form"
echo "  ✅ Fixed CORS issues for EC2 staging environment"
echo "  ✅ Updated backend environment variables"
echo "  ✅ Rebuilt and restarted all containers"
echo ""
echo "🌐 Access your application at:"
echo "  Frontend: http://ec2-3-235-213-160.compute-1.amazonaws.com"
echo "  API: http://ec2-3-235-213-160.compute-1.amazonaws.com/api"
echo ""
echo "💳 Mock Payment Form Usage:"
echo "  - Enter any valid-looking card details"
echo "  - Example: 4532 1234 5678 9012, 12/25, 123"
echo "  - The form will simulate payment processing" 