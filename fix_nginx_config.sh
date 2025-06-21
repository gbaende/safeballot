#!/bin/bash

# Fix nginx configuration for larger request bodies
cd ~/safeballot

cat > nginx.stage.conf << 'EOF'
server {
    listen 80;
    server_name _;
    
    # Increase client body size for large ballot data
    client_max_body_size 100M;

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
        
        # Increase proxy body size
        client_max_body_size 100M;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        
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

echo "✅ Updated nginx configuration with larger body size limit"

# Restart nginx to apply changes
/usr/local/bin/docker-compose -f docker-compose.simple.yml restart nginx

echo "✅ Nginx restarted with new configuration" 