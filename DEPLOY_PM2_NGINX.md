# Aegis IAM Portal — PM2, Nginx & Native PostgreSQL/Redis Deployment Guide

This guide follows your Ubuntu deployment workflow using **Node.js 22**, **Native PostgreSQL 16/17**, **Redis**, **PM2**, **Nginx**, and **Certbot SSL**.

---

## 1. Setting Git & Prerequisites

```bash
sudo apt-get update && sudo apt-get install -y ca-certificates curl gnupg git ufw
git config --global credential.helper store
```

---

## 2. Installing Node.js 22

```bash
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
NODE_MAJOR=22
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list
sudo apt-get update && sudo apt-get install -y nodejs
node -v # Should show v22.x
npm -v
```

---

## 3. Installing PostgreSQL

```bash
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt-get update
sudo apt-get -y install postgresql
sudo systemctl enable --now postgresql
```

### Setting up the Aegis Database & User

Generate a strong password (or pick one) and execute:

```bash
sudo -i -u postgres psql
```

Inside the PostgreSQL prompt (`psql`), run:

```sql
CREATE DATABASE iam_portal;
CREATE USER aegisadmin WITH ENCRYPTED PASSWORD 'YOUR_STRONG_DB_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON DATABASE iam_portal TO aegisadmin;
ALTER USER aegisadmin WITH SUPERUSER;
\q
```

*(Note: Since your backend and PostgreSQL run on the same VPS, PostgreSQL securely listens on `localhost:5432` without needing to expose it to the public internet).*

---

## 4. Installing & Starting Redis

Aegis uses Redis for token blacklisting, token family rotation, and rate-limiting.

```bash
sudo apt-get install -y redis-server
sudo systemctl enable --now redis-server
redis-cli ping # Should respond: PONG
```

---

## 5. Clone Project & Build

```bash
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www
cd /var/www
git clone <YOUR_GIT_REPO_URL> iam-portal
cd iam-portal
```

### 5.1 Install Backend Dependencies
```bash
npm ci --omit=dev
```

### 5.2 Build the Frontend SPA
```bash
cd frontend
npm ci
npm run build
cd ..
```
*(This compiles the React SPA into `/var/www/iam-portal/frontend/dist`).*

---

## 6. Configure Environment Variables (`.env`)

Generate strong cryptographic keys:
```bash
# JWT Secret
openssl rand -base64 48

# Refresh Secret
openssl rand -base64 48

# MFA Key
openssl rand -hex 32
```

Create your production `.env` file:
```bash
cp .env.example .env
nano .env
```

Ensure the following are set:
```ini
NODE_ENV=production
PORT=3000
APP_NAME=Aegis-IAM
APP_URL=https://aegis.swatantracodes.in

DB_HOST=localhost
DB_PORT=5432
DB_NAME=iam_portal
DB_USER=aegisadmin
DB_PASSWORD=YOUR_PASSWORD

REDIS_URL=redis://localhost:6379

JWT_SECRET=<PASTED_JWT_SECRET>
JWT_REFRESH_SECRET=<PASTED_REFRESH_SECRET>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

MFA_ENCRYPTION_KEY=<PASTED_MFA_KEY>
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
```

### 6.1 Run Database Migrations & Seeds
```bash
npm run migrate
# (Optional) Seed initial roles:
npm run seed
```

---

## 7. Starting the Backend with PM2

```bash
sudo npm i -g pm2
pm2 start src/server.js --name "aegis-api"
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME
```

Verify backend is running:
```bash
pm2 status
curl -i http://127.0.0.1:3000/health
```

---

## 8. Installing & Configuring Nginx

```bash
sudo apt-get install -y nginx
sudo systemctl enable --now nginx
```

### Create the Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/aegis.conf
```

Paste the following configuration (replace `aegis.swatantracodes.in` with your domain):

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name aegis.swatantracodes.in;

    # Maximum upload size
    client_max_body_size 20M;

    # 1. Frontend Static Assets (Vite React SPA)
    root /var/www/iam-portal/frontend/dist;
    index index.html;

    # Cache immutable Vite bundles
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }

    # 2. Reverse Proxy API Requests to PM2 Node.js Backend
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 30s;
        proxy_read_timeout 86400s;
        proxy_send_timeout 30s;
    }

    # 3. Health Check Endpoint
    location /health {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 4. SPA Fallback (Redirects all client routes to index.html)
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Enable Site & Restart Nginx

```bash
sudo ln -sf /etc/nginx/sites-available/aegis.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

---

## 9. Firewall Setup (UFW)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
sudo ufw status
```

---

## 10. Apply Free Let's Encrypt SSL with Certbot

```bash
sudo apt-get install -y snapd
sudo snap install core
sudo snap refresh core
sudo snap install --classic certbot
sudo ln -sf /snap/bin/certbot /usr/bin/certbot

# Auto-configure SSL in Nginx
sudo certbot --nginx -d aegis.swatantracodes.in
```

### Configure Certificate Auto-Renewal Cron Job

```bash
sudo crontab -e
```
Add to the bottom:
```cron
0 0 * * * certbot renew --quiet && systemctl reload nginx
```

---

## 11. Day-2 Updates (1-Command Pull & Rebuild)

To update your deployment whenever you push new changes to Git:

```bash
cd /var/www/iam-portal
git pull origin main
npm ci --omit=dev
cd frontend && npm ci && npm run build && cd ..
npm run migrate
pm2 restart aegis-api
```
