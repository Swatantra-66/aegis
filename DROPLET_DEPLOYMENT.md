# Aegis IAM Portal — Quick Bare-Metal Deployment Guide (PM2 & Nginx)

This guide provides the streamlined, step-by-step process for deploying Aegis IAM directly on a Linux VPS (DigitalOcean Droplet, AWS EC2, Ubuntu) using **Node.js 22, PostgreSQL, Redis, PM2, and Nginx**.

> [!NOTE]
> **Prefer Docker containers?**  
> If you prefer deploying via containerization instead of bare-metal PM2, refer to [**DOCKER_DEPLOYMENT.md**](./DOCKER_DEPLOYMENT.md).

---

## Prerequisites: 
Please ensure you have already created your server and connected via SSH.

---

### Step 1: Install Node.js 22 & Git Prerequisites

```bash
sudo apt-get update && sudo apt-get install -y ca-certificates curl gnupg git ufw
git config --global credential.helper store

sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
NODE_MAJOR=22
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list
sudo apt-get update && sudo apt-get install -y nodejs

# Verify versions
node -v   # Should show v22.x
npm -v
```

---

### Step 2: Install PostgreSQL & Redis
Aegis uses PostgreSQL for core data and Redis for token management/rate limiting:

```bash
# Add PostgreSQL repo & install
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt-get update && sudo apt-get install -y postgresql redis-server

# Enable and start services
sudo systemctl enable --now postgresql redis-server
redis-cli ping   # Should respond with: PONG
```

---

### Step 3: Create Database & User

```bash
# Enter the PostgreSQL prompt:
sudo -i -u postgres psql
```

Paste these SQL queries (choose a password to replace YOUR_STRONG_PASSWORD):

```sql
CREATE DATABASE iam_portal;
CREATE USER aegisadmin WITH ENCRYPTED PASSWORD 'YOUR_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE iam_portal TO aegisadmin;
ALTER USER aegisadmin WITH SUPERUSER;
\q
```

---

### Step 4: Clone Code & Build Frontend

```bash
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www
cd /var/www

# Clone repository
git clone https://github.com/Swatantra-66/aegis.git iam-portal
cd iam-portal

# Install Backend dependencies (ignore git dev hooks)
npm ci --omit=dev --ignore-scripts

# Install & Build Frontend React SPA
cd frontend
npm ci
npm run build
cd ..
```

---

### Step 5: Configure Production .env

```bash
# Generates random 64-character secrets:
openssl rand -base64 48
openssl rand -base64 48
openssl rand -hex 32
```

Create and open .env:

```bash
nano .env
```

Paste this configuration into .env (fill in DB_PASSWORD from Step 3 and the generated keys):

```ini
NODE_ENV=production
PORT=3000
APP_NAME=Aegis-IAM
APP_URL=https://iam.yourdomain.com

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=iam_portal
DB_USER=aegisadmin
DB_PASSWORD=YOUR_STRONG_PASSWORD  # Note: Avoid '#' or '$' inside unquoted passwords in .env

# Redis
REDIS_URL=redis://localhost:6379

# Cryptographic Keys (At least 32 characters)
JWT_SECRET=PASTE_FIRST_OPENSSL_KEY_HERE
JWT_REFRESH_SECRET=PASTE_SECOND_OPENSSL_KEY_HERE
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# MFA Secret
MFA_ENCRYPTION_KEY=PASTE_HEX_OPENSSL_KEY_HERE

# Rate Limiting & Logs
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
```
Save and exit nano: press Ctrl + O, hit Enter, then Ctrl + X.

---

### Step 6: Run Migrations & Start Backend with PM2

```bash
# Run database migrations
npm run migrate
npm run seed

# Install PM2 and launch the backend service
sudo npm i -g pm2
pm2 start src/server.js --name "aegis-api"
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME
```

Test that the backend is responding locally:

```bash
curl -i http://127.0.0.1:3000/health
```
(Should return status 200 with "status": "healthy").

---

### Step 7: Configure Nginx Reverse Proxy

```bash
# Install Nginx:
sudo apt-get install -y nginx

# Enable and start Nginx:
sudo systemctl enable --now nginx
```

Create the Nginx site configuration:

```bash
sudo nano /etc/nginx/sites-available/aegis.conf
```

Paste this block into the file:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name iam.yourdomain.com;

    client_max_body_size 20M;

    # 1. Frontend Static Assets
    root /var/www/iam-portal/frontend/dist;
    index index.html;

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }

    # 2. Reverse Proxy API Requests
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

    # 3. Health Check Proxy
    location /health {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 4. SPA Client Routing Fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```
Save and exit: Ctrl + O, Enter, Ctrl + X.

Enable the configuration:

```bash
sudo ln -sf /etc/nginx/sites-available/aegis.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

---

### Step 8: Configure Firewall (UFW)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
sudo ufw status
```

---

### Step 9: Issue Free Let's Encrypt SSL with Certbot
(Make sure your DNS A-record for iam.yourdomain.com is pointing to your Droplet's IP before running this):

```bash
sudo apt-get install -y snapd
sudo snap install core && sudo snap refresh core
sudo snap install --classic certbot
sudo ln -sf /snap/bin/certbot /usr/bin/certbot

# Automatically issue certificate and configure Nginx for HTTPS
sudo certbot --nginx -d iam.yourdomain.com
```

Add auto-renewal cron job:

```bash
sudo crontab -e
```

Add this at the bottom:

```cron
0 0 * * * certbot renew --quiet && systemctl reload nginx
```

---

### Step 10: Email Setup for Notifications

```bash
# In the backend directory (/var/www/iam-portal)
nano .env
```

Add/update these lines at the bottom of .env:

```ini
# Email (SMTP) Credentials
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-gmail-app-password
MAIL_FROM=your-email@gmail.com
MAIL_FROM_NAME=Aegis IAM
```

**Important:** If using Gmail, you **must** generate an **App Password** from your Google account security settings (2-Step Verification must be enabled) to use here instead of your main login password.

Save and exit.

Restart the backend service for changes to take effect:

```bash
pm2 restart aegis-api --update-env
```

---

## Step 11: Final Verification

Open your domain in a web browser:

```
https://iam.yourdomain.com
```

You should see the Aegis IAM login page, and the SSL certificate should be valid.

Check your backend logs:
```bash
pm2 logs aegis-api
```
(Press `Ctrl+C` to exit logs).
