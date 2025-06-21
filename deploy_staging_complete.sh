#!/bin/bash

# Complete SafeBallot Staging Deployment Script
# This script sets up everything from scratch on a fresh EC2 instance

echo "🚀 Starting Complete SafeBallot Staging Deployment..."

# Update system and install dependencies
echo "📦 Installing system dependencies..."
sudo yum update -y
sudo yum install -y git docker

# Start Docker service
echo "🐳 Starting Docker service..."
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker ec2-user

# Install Docker Compose
echo "🔧 Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create safeballot directory
echo "📁 Setting up project directory..."
mkdir -p ~/safeballot
cd ~/safeballot

# Extract frontend build if it exists
echo "📁 Setting up frontend..."
if [ -f "frontend-build-mock-payment.tar.gz" ]; then
    mkdir -p frontend
    tar -xzf frontend-build-mock-payment.tar.gz -C frontend/
    echo "✅ Frontend build extracted successfully"
else
    echo "❌ Warning: frontend-build-mock-payment.tar.gz not found"
fi

# Create docker-compose.yml if it doesn't exist
if [ ! -f "docker-compose.simple.yml" ]; then
    echo "📝 Creating docker-compose configuration..."
    cat > docker-compose.simple.yml << 'EOF'
version: "3.9"

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: safeballot
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always

  backend:
    build: ./express-backend
    ports:
      - "8080:8080"
    restart: always
    depends_on:
      - postgres
    environment:
      - NODE_ENV=production
      - PORT=8080
      - FRONTEND_URL=http://ec2-3-235-213-160.compute-1.amazonaws.com
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/safeballot
      - JWT_SECRET=your-super-secret-jwt-key-for-staging
      - JWT_EXPIRES_IN=7d
      - MAX_PAYLOAD_SIZE=100mb
      - SERVE_STATIC=false

  nginx:
    image: nginx:1.25-alpine
    depends_on:
      - backend
    ports:
      - "80:80"
    volumes:
      - ./frontend/build:/usr/share/nginx/html:ro
      - ./nginx.stage.conf:/etc/nginx/conf.d/default.conf:ro
    restart: always

volumes:
  postgres_data:
EOF
fi

# Create nginx configuration if it doesn't exist
if [ ! -f "nginx.stage.conf" ]; then
    echo "📝 Creating nginx configuration..."
    cat > nginx.stage.conf << 'EOF'
server {
    listen 80;
    server_name _;

    # Serve React app
    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
        
        # Add headers for better caching
        add_header Cache-Control "public, max-age=31536000" always;
        
        # Handle HTML files differently (no caching)
        location ~* \.html$ {
            add_header Cache-Control "no-cache, no-store, must-revalidate" always;
        }
    }

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://backend:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # CORS headers
        add_header Access-Control-Allow-Origin "http://ec2-3-235-213-160.compute-1.amazonaws.com" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization" always;
        add_header Access-Control-Allow-Credentials "true" always;
        
        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "http://ec2-3-235-213-160.compute-1.amazonaws.com" always;
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
            add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization" always;
            add_header Access-Control-Allow-Credentials "true" always;
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }
    }
}
EOF
fi

# Clone or update the repository
if [ ! -d "express-backend" ]; then
    echo "📥 Cloning SafeBallot repository..."
    git clone https://github.com/gedeonbaende/safeballot.git temp-repo
    cp -r temp-repo/express-backend ./
    rm -rf temp-repo
else
    echo "📥 Updating existing backend code..."
fi

# Build and start the application
echo "🏗️  Building and starting the application..."
/usr/local/bin/docker-compose -f docker-compose.simple.yml down || true
/usr/local/bin/docker-compose -f docker-compose.simple.yml build --no-cache
/usr/local/bin/docker-compose -f docker-compose.simple.yml up -d

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 15

# Check container status
echo "📊 Checking container status..."
/usr/local/bin/docker-compose -f docker-compose.simple.yml ps

# Test the application
echo "🧪 Testing application..."
sleep 5

if curl -f -s http://localhost/api/health > /dev/null; then
    echo "✅ API health check passed"
else
    echo "⚠️  API health check failed - checking logs..."
    /usr/local/bin/docker-compose -f docker-compose.simple.yml logs backend --tail=20
fi

echo ""
echo "🎉 SafeBallot Staging Deployment Completed!"
echo ""
echo "📋 What was deployed:"
echo "  ✅ Mock payment form (no Stripe required)"
echo "  ✅ Fixed CORS issues"
echo "  ✅ PostgreSQL database"
echo "  ✅ Express.js backend API"
echo "  ✅ React frontend with Nginx"
echo ""
echo "🌐 Access your application:"
echo "  Frontend: http://ec2-3-235-213-160.compute-1.amazonaws.com"
echo "  API Health: http://ec2-3-235-213-160.compute-1.amazonaws.com/api/health"
echo ""
echo "💳 Mock Payment Instructions:"
echo "  - Go to Ballot Builder → Create a ballot → Payment step"
echo "  - Enter any card details like: 4532 1234 5678 9012"
echo "  - Expiry: 12/25, CVV: 123, Name: Test User"
echo "  - The form will simulate payment and create your ballot"
echo ""
echo "🔧 Useful commands:"
echo "  View logs: docker-compose -f docker-compose.simple.yml logs"
echo "  Restart: docker-compose -f docker-compose.simple.yml restart"
echo "  Stop: docker-compose -f docker-compose.simple.yml down" 