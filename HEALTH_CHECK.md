# Aegis IAM Portal — System Health Check & Operational Runbook

This guide documents all operational verification commands, health check probes, diagnostic utilities, and troubleshooting steps to monitor and maintain the **Aegis IAM** production environment.

---

## 1. Quick One-Liner Sanity Checks

Run these commands on the server to obtain an immediate status of the entire stack:

### Remote Domain Health Probe (Public HTTPS)
```bash
curl -i https://aegis.example.in/health
```
* **Usage**: Probes the live domain through DNS, Cloudflare/Nginx, SSL certificates, and into the backend.
* **Expected Output**: HTTP `200 OK` with JSON payload `{"status":"healthy", ...}`.

### Local Backend Direct Health Probe
```bash
curl -s http://127.0.0.1:3000/health | jq .
```
* **Usage**: Directly inspects the Node.js backend on `localhost:3000`, bypassing Nginx.
* **Expected Output**:
  ```json
  {
    "status": "healthy",
    "timestamp": "2026-09-12T16:28:29.898Z",
    "services": {
      "database": "connected",
      "redis": "connected"
    }
  }
  ```

---

## 2. Component-by-Component Diagnostic Commands

### 2.1 Backend Runtime & Process Manager (`PM2`)

| Command | Purpose & Usage | Expected Healthy State |
| :--- | :--- | :--- |
| `pm2 status` | Lists all managed applications, CPU, memory, uptime, and restart count. | Status `online`, CPU < 5%, RAM 90–150 MB, restarts stable. |
| `pm2 logs aegis-api --lines 50` | Displays the last 50 log entries for the application process. | Shows `Google Gmail REST API initialized`, `Redis connected`, `PostgreSQL connected`. |
| `pm2 monit` | Terminal dashboard monitoring real-time CPU, RAM, and event loop metrics. | Interactive visual dashboard for load profiling. |
| `pm2 restart aegis-api` | Gracefully reloads/restarts the backend application. | Status remains `online` under a new process ID. |

---

### 2.2 Nginx Web Server & Reverse Proxy

| Command | Purpose & Usage | Expected Healthy State |
| :--- | :--- | :--- |
| `sudo nginx -t` | Validates Nginx configuration syntax and symlinks before reload. | `syntax is ok` and `test is successful`. |
| `sudo systemctl status nginx --no-pager` | Checks if the Nginx daemon is active, running, and listening. | `Active: active (running)`. |
| `curl -I http://127.0.0.1/` | Verifies port 80 HTTP-to-HTTPS permanent redirection. | `HTTP/1.1 301 Moved Permanently` with `Location: https://...`. |
| `curl -I http://127.0.0.1/health` | Tests internal reverse proxy forwarding to backend `/health`. | `HTTP/1.1 301 Moved Permanently` (or `200 OK` if testing over HTTPS/local block). |
| `sudo systemctl reload nginx` | Gracefully reloads Nginx configuration without dropping connections. | Instant exit with code 0. |

---

### 2.3 Redis In-Memory Cache, Rate Limiter & Durable Queues

| Command | Purpose & Usage | Expected Healthy State |
| :--- | :--- | :--- |
| `redis-cli ping` | Tests Redis server connectivity and responsiveness. | Returns `PONG`. |
| `redis-cli info stats` | Displays total connections, operations per second, and command statistics. | `total_connections_received: > 0`, `instantaneous_ops_per_sec: > 0`. |
| `redis-cli --scan --pattern "rl:*"` | Safely inspects active rate-limiting keys without blocking Redis (uses cursor-based `SCAN`). | Lists active client IP/user rate-limit tracking keys. |
| `redis-cli --scan --pattern "bl:*"` | Safely lists blacklisted revoked access tokens (`jti`) within their remaining TTL. | Displays active blacklisted token entries. |
| `redis-cli --scan --pattern "iam:queue:*"` | Safely checks pending durable background jobs (resets, notifications) without blocking the event loop. | Lists active queue lists and delayed zsets. |

---

### 2.4 PostgreSQL Database Layer

| Command | Purpose & Usage | Expected Healthy State |
| :--- | :--- | :--- |
| `sudo systemctl status postgresql --no-pager` | Verifies PostgreSQL master service daemon state. | `Active: active (exited)` or `active (running)` with status 0/SUCCESS. |
| `sudo -i -u postgres psql -d iam_portal -c "\dt"` | Lists all tables in the `iam_portal` database and verifies table ownership. | Displays all **12 core tables** owned by `aegisadmin`. |
| `sudo -i -u postgres psql -d iam_portal -c "SELECT COUNT(*) FROM users;"` | Verifies SQL read connectivity and returns total registered user accounts. | Returns integer count of users. |
| `sudo -i -u postgres psql -d iam_portal -c "SELECT COUNT(*) FROM audit_logs;"` | Verifies tamper-evident audit trail table entries. | Returns total logged security events. |
| `sudo -i -u postgres psql -d iam_portal -c "SELECT id, name FROM migrations;"` | Verifies that database schema migrations were applied sequentially. | Lists all applied migration batch records. |

---

### 2.5 Security, Ports & Firewall (UFW)

| Command | Purpose & Usage | Expected Healthy State |
| :--- | :--- | :--- |
| `sudo ufw status verbose` | Audits firewall rules and port exposure. | Ports `22/tcp` (SSH), `80/tcp` (HTTP), and `443/tcp` (HTTPS) allowed. DB & Redis blocked from external access. |
| `sudo ss -tulpn \| grep -E ':(80\|443\|3000\|5432\|6379)'` | Audits listening socket bindings across network interfaces. | `80` and `443` listen on `0.0.0.0`, while `3000`, `5432`, `6379` listen securely on `127.0.0.1`. |

---

## 3. Real-Time Log Monitoring

Use these commands to observe system traffic and debug unexpected issues in real-time:

```bash
# 1. Watch real-time incoming HTTP/HTTPS traffic through Nginx
sudo tail -f /var/log/nginx/access.log

# 2. Watch Nginx errors (502 Bad Gateway, upstream timeout, SSL handshake failures)
sudo tail -f /var/log/nginx/error.log

# 3. Stream backend application logs (auth flows, audit logs, background worker jobs)
pm2 logs aegis-api -f

# 4. Stream PostgreSQL database engine logs
sudo journalctl -u postgresql -f -n 50
```

---

## 4. Automated All-in-One Health Check Script

The project provides an automated, maintained audit script at [`scripts/health-check.sh`](scripts/health-check.sh) that tests all 5 subsystems in sequence, returns colored output, accumulates failure counts, and exits with a proper exit code (`exit $FAILURES`) for CI/CD and automation.

### Running the Audit:

```bash
# Recommended: via npm script
npm run health:check

# Or directly via the executable bash script:
chmod +x scripts/health-check.sh
./scripts/health-check.sh
```

---

## 5. Troubleshooting Common Warning States

### Issue: `/health` returns `503 Degraded`
* **Symptoms**:
  ```json
  {"status":"degraded","services":{"database":"disconnected","redis":"connected"}}
  ```
* **Remedy**:
  1. If `database: disconnected`: Run `sudo systemctl restart postgresql` and test connection with `psql -d iam_portal`.
  2. If `redis: disconnected`: Run `sudo systemctl restart redis-server` and verify with `redis-cli ping`.

### Issue: Nginx returns `502 Bad Gateway`
* **Symptoms**: Nginx displays a `502 Bad Gateway` error page when opening the domain in a browser.
* **Root Cause**: Backend Node.js process on port 3000 is stopped or crashed.
* **Remedy**:
  ```bash
  pm2 status
  pm2 restart aegis-api
  pm2 logs aegis-api --err --lines 30
  ```

### Issue: Rate Limit Exceeded (`429 Too Many Requests`)
* **Symptoms**: Requests to `/api/v1/auth/login` or `/api/v1/auth/forgot-password` return `429`.
* **Explanation**: Aegis security policy blocks abusive requests from exceeding thresholds (e.g. 5 attempts / 15 minutes).
* **Remedy to clear during testing**:
  ```bash
  # Clear all active rate-limiting keys in Redis:
  redis-cli --scan --pattern "rl:*" | xargs -r redis-cli del
  ```
