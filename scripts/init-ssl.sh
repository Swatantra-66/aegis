#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 2 ]; then
    echo "Usage: $0 <domain-name> <email-address>"
    echo "Example: $0 iam.example.com admin@example.com"
    exit 1
fi

DOMAIN="$1"
EMAIL="$2"

echo "Initializing SSL for ${DOMAIN}"

# Step 1: Switch Nginx config to HTTP-only mode for the ACME challenge
echo "1. Configuring temporary HTTP listener for ACME challenge..."
cp nginx/conf.d/default.http.conf nginx/conf.d/default.conf

# Step 2: Build and start the services
echo "2. Starting containers in HTTP mode..."
docker compose -f docker-compose.prod.yml up -d --build

echo "3. Waiting for services to become healthy..."
sleep 10

# Step 3: Request SSL certificate from Let's Encrypt
echo "4. Requesting Let's Encrypt certificate for ${DOMAIN}..."
docker compose -f docker-compose.prod.yml run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    --email ${EMAIL} \
    -d ${DOMAIN} \
    --rsa-key-size 4096 \
    --agree-tos \
    --no-eff-email \
    --force-renewal" certbot

# Step 4: Generate production SSL Nginx configuration
echo "5. Generating HTTPS Nginx configuration..."
cat <<EOF > nginx/conf.d/default.conf
upstream backend_upstream {
    server backend:3000;
    keepalive 32;
}

# ── HTTP Server (Redirects all traffic to HTTPS) 
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        try_files \$uri =404;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

# ── HTTPS Server 
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN};

    # SSL Certificates
    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;

    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    client_max_body_size 20M;

    # Frontend Static Files (Vite SPA)
    root /usr/share/nginx/html;
    index index.html;

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }

    # API Proxy Routing
    location /api/ {
        proxy_pass http://backend_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
    }

    # Health Check Proxy Routing
    location /health {
        proxy_pass http://backend_upstream;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # SPA Fallback
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

# Step 5: Reload Nginx with new SSL config
echo "6. Reloading Nginx with SSL..."
docker compose -f docker-compose.prod.yml restart frontend

echo " SSL setup complete!"
echo " Portal is live at https://${DOMAIN}"
echo " Health check: https://${DOMAIN}/health"
echo " API Docs: https://${DOMAIN}/api/docs"
