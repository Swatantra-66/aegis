# Aegis IAM Portal — Docker Production Deployment Guide

This guide provides an end-to-end walkthrough for deploying **Aegis IAM Portal** using **Docker & Docker Compose** with automated SSL/TLS certificates.

> [!TIP]
> **Looking for a lightweight Bare-Metal (PM2 + Nginx) deployment?**  
> If you are deploying to a standard single VPS / Droplet and want minimal RAM usage and maximum performance without Docker, follow [**DROPLET_DEPLOYMENT.md**](./DROPLET_DEPLOYMENT.md).

---

## Architecture Overview

```
[ Internet / Browsers ]
         │
         ▼  (HTTPS Port 443 / HTTP Port 80)
   ┌─────────────┐
   │ Nginx Proxy │ (TLS Termination, Rate Limiting, Static SPA Serving)
   └──────┬──────┘
          │
     ┌────┴───────────────────────────┐
     │                                │
     ▼                                ▼
┌──────────────────────┐    ┌──────────────────────┐
│  Vite React SPA      │    │  Express REST API    │ (Port 3000)
│  (Static Assets)     │    │  (Argon2id, JWT, MFA)│
└──────────────────────┘    └──────┬────────┬──────┘
                                   │        │
                                   ▼        ▼
                      ┌───────────────┐  ┌───────────────┐
                      │ PostgreSQL 16 │  │    Redis 7    │
                      └───────────────┘  └───────────────┘
```

---

## Prerequisites

1. **DigitalOcean Account**: Access to create a Droplet.
2. **Domain Name**: A registered domain (e.g. `yourdomain.com` or `iam.yourdomain.com`) with access to your DNS management console (Cloudflare, Namecheap, GoDaddy, DigitalOcean DNS, etc.).
3. **SSH Client**: Terminal with SSH keys configured.

---

## Step 1: Create a DigitalOcean Droplet

1. Log in to the [DigitalOcean Cloud Console](https://cloud.digitalocean.com/).
2. Click **Create** > **Droplets**.
3. Choose the following options:
   - **Image**: Ubuntu 24.04 LTS (x64) or Ubuntu 22.04 LTS.
   - **Plan**: Basic (Shared CPU) -> Regular with SSD.
   - **Size**: **1 GB RAM / 1 vCPU** (Minimum) or **2 GB RAM / 1 vCPU** (Recommended for smooth Docker builds).
   - **Datacenter Region**: Choose the region closest to your users (e.g., Frankfurt, New York, Bangalore, Singapore).
   - **Authentication**: Select **SSH Key** (Recommended) or set a secure root password.
   - **Hostname**: `aegis-iam-prod`
4. Click **Create Droplet** and note your Droplet's **Public IPv4 Address** (e.g. `143.198.xxx.xxx`).

---

## Step 2: Configure Your Domain DNS Records

Go to your Domain Registrar or DNS Provider (Cloudflare, Namecheap, GoDaddy, etc.) and add **A Records** pointing to your DigitalOcean Droplet IP:

| Type | Host / Name | Value / IP Address | TTL | Proxy Status (Cloudflare) |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `iam` (or `@` for root) | `YOUR_DROPLET_PUBLIC_IP` | Auto / 1 min | DNS Only (Gray Cloud during initial SSL) |
| **A** | `www` (optional) | `YOUR_DROPLET_PUBLIC_IP` | Auto / 1 min | DNS Only |

> [!TIP]
> If using **Cloudflare**, set the Proxy status to **DNS Only (Gray Cloud)** while generating the Let's Encrypt certificate. Once SSL is issued, you can turn Cloudflare Proxy (Orange Cloud) back on and set Cloudflare SSL mode to **Full (Strict)**.

Verify DNS propagation in your local terminal:
```bash
nslookup iam.yourdomain.com
# or
dig +short iam.yourdomain.com
```

---

## Step 3: Connect to VPS & Harden Server Security

SSH into your Droplet:
```bash
ssh root@YOUR_DROPLET_PUBLIC_IP
```

### 3.1 Update Packages
```bash
apt update && apt upgrade -y
```

### 3.2 Configure Firewall (UFW)
Allow SSH, HTTP (Port 80), and HTTPS (Port 443), then enable the firewall:
```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status
```

---

## Step 4: Install Docker & Docker Compose

Run the official Docker installation script:
```bash
# Install prerequisites
apt install -y curl git ufw

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Verify Docker installation
docker --version
docker compose version
```

---

## Step 5: Clone Repository & Configure Environment

### 5.1 Clone the Codebase
```bash
cd /var/www || mkdir -p /var/www && cd /var/www
git clone <YOUR_GIT_REPOSITORY_URL> iam-portal
cd iam-portal
```

*(Alternatively, copy your project files to `/var/www/iam-portal` using `scp` or `rsync`).*

### 5.2 Create the Production `.env` File
```bash
cp .env.production.example .env
```

### 5.3 Generate Cryptographic Secrets
Generate strong, unique random keys on the server:

```bash
# Generate DB Password
openssl rand -base64 24

# Generate JWT Secret
openssl rand -base64 48

# Generate JWT Refresh Secret
openssl rand -base64 48

# Generate MFA Encryption Key (64 hex characters)
openssl rand -hex 32
```

### 5.4 Edit `.env`
Open `.env` in nano:
```bash
nano .env
```
Ensure the following are set:
```ini
NODE_ENV=production
PORT=3000
APP_NAME=Aegis-IAM
APP_URL=https://iam.yourdomain.com

DB_HOST=postgres
DB_PORT=5432
DB_NAME=iam_portal
DB_USER=postgres
DB_PASSWORD=<PASTE_GENERATED_DB_PASSWORD>

REDIS_URL=redis://redis:6379

JWT_SECRET=<PASTE_GENERATED_JWT_SECRET>
JWT_REFRESH_SECRET=<PASTE_GENERATED_JWT_REFRESH_SECRET>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

MFA_ENCRYPTION_KEY=<PASTE_GENERATED_MFA_KEY>
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
```
Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).

---

## Step 6: Initialize Let's Encrypt SSL & Launch Containers

Make the helper scripts executable:
```bash
chmod +x scripts/*.sh
```

Run the automated SSL bootstrap script with your domain and email:
```bash
./scripts/init-ssl.sh iam.yourdomain.com your-email@example.com
```

### What this script does automatically:
1. Sets up temporary HTTP routing for the Let's Encrypt ACME verification.
2. Builds and starts the production Docker containers (`postgres`, `redis`, `backend`, `frontend/nginx`).
3. Executes Certbot to acquire a valid Let's Encrypt SSL certificate.
4. Generates the production HTTPS Nginx reverse proxy configuration.
5. Reloads Nginx with HTTP-to-HTTPS redirect, HSTS, and TLS 1.3 encryption.

---

## Step 7: Verify Production Health

### 7.1 Check Running Containers
```bash
docker compose -f docker-compose.prod.yml ps
```
You should see:
- `aegis-postgres-prod` (healthy)
- `aegis-redis-prod` (healthy)
- `aegis-backend-prod` (healthy)
- `aegis-frontend-prod` (running, ports 80 & 443)
- `aegis-certbot` (running auto-renewal loop)

### 7.2 Check Health Endpoint via HTTPS
```bash
curl -i https://iam.yourdomain.com/health
```
Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-09-01T...",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

### 7.3 Access in Browser
Open your browser and visit:
- **Web App**: `https://iam.yourdomain.com`
- **Interactive Swagger Docs**: `https://iam.yourdomain.com/api/docs`

---

## Step 8: (Optional) Seed Initial Data

If you want to populate the initial permissions, roles, or seed users:
```bash
docker compose -f docker-compose.prod.yml exec backend npm run seed
```

---

## Day-2 Operations & Maintenance

### How to Deploy Updates / New Code
Whenever you push changes to your repository, update your VPS in 1 command:
```bash
cd /var/www/iam-portal
./scripts/deploy.sh
```

### View Live Logs
```bash
# View all logs
docker compose -f docker-compose.prod.yml logs -f

# View backend logs only
docker compose -f docker-compose.prod.yml logs -f backend

# View Nginx access/error logs
docker compose -f docker-compose.prod.yml logs -f frontend
```

### Database Backup
```bash
# Backup PostgreSQL database to a timestamped .sql.gz dump
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U postgres iam_portal | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Database Restore
```bash
gunzip < backup_20260901_120000.sql.gz | docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -d iam_portal
```

### SSL Renewal
Certbot is already running continuously in the background and automatically checks and renews certificates every 12 hours. You can test manual renewal with:
```bash
docker compose -f docker-compose.prod.yml run --rm certbot renew --dry-run
```

---

## Summary of Security Measures in Production
- **Reverse Proxy**: Nginx handles rate limiting, TLS termination, HSTS, and hides internal backend topology.
- **Argon2id & AES-256-GCM**: Cryptographic protection for credentials and MFA secrets at rest.
- **Isolated Network**: PostgreSQL and Redis are not exposed to the public internet — only accessible inside the Docker internal bridge network.
- **Non-Root Execution**: Backend Node.js process runs inside Docker as the non-root `node` user.
