#!/usr/bin/env node
/**
 * Aegis IAM Portal — Cross-Platform System Health Audit
 * Validates Redis, PostgreSQL, Node.js Backend, Nginx, and PM2 process status.
 * Compatible with Windows, macOS, Linux, and Docker environments.
 */

// Suppress verbose logs during diagnostic audit
process.env.LOG_LEVEL = 'error';
process.env.DOTENVX_QUIET = 'true';
process.env.DOTENV_CONFIG_QUIET = 'true';

const http = require('http');
const { execSync } = require('child_process');

const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const NC = '\x1b[0m';

// Command-line flag parsing
const args = process.argv.slice(2);
const forceProd = args.includes('--prod') || args.includes('--production');
const forceLocal = args.includes('--local') || args.includes('--dev');

// Helper for cross-platform command execution without shell stderr leaks
function runCommand(cmd) {
  try {
    return execSync(cmd, { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return null;
  }
}

// Environment detection
let isProd = false;
if (forceProd) {
  isProd = true;
} else if (forceLocal) {
  isProd = false;
} else if (process.env.NODE_ENV === 'production') {
  isProd = true;
} else {
  // Check if systemctl has nginx active (indicates production Linux server)
  const res = runCommand('systemctl is-active nginx');
  if (res === 'active') isProd = true;
}

async function runHealthCheck() {
  console.log(`\n${BOLD}${CYAN}==============================================================${NC}`);
  console.log(`${BOLD}${CYAN}                AEGIS IAM — SYSTEM HEALTH AUDIT               ${NC}`);
  console.log(`${BOLD}${CYAN}==============================================================${NC}`);
  console.log(`${DIM}Timestamp   :${NC} ${new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC`);
  console.log(
    `${DIM}Environment :${NC} ${isProd ? `${GREEN}${BOLD}Production Server${NC}` : `${CYAN}Local Development${NC} ${DIM}(use --prod for server mode)${NC}`}\n`
  );

  let failures = 0;

  // 1. Redis Check
  process.stdout.write(`${BOLD}[1/5] Checking Redis in-memory cache & queues...${NC}\n`);
  try {
    const redis = require('../src/config/redis');
    const start = Date.now();
    const isHealthy = await redis.healthCheck();
    const latency = Date.now() - start;

    if (isHealthy) {
      console.log(`      ${GREEN}✔ OPERATIONAL${NC} ${DIM}(PONG received in ${latency}ms)${NC}`);
    } else {
      console.log(`      ${RED}✖ FAILED${NC} ${DIM}(Health check ping returned false)${NC}`);
      failures++;
    }
    // Cleanly close connection
    if (redis.client && typeof redis.client.quit === 'function') {
      await redis.client.quit().catch(() => {});
    }
  } catch (err) {
    console.log(`      ${RED}✖ FAILED${NC} ${DIM}(${err.message})${NC}`);
    failures++;
  }

  // 2. PostgreSQL Check
  process.stdout.write(`${BOLD}[2/5] Checking PostgreSQL database connectivity...${NC}\n`);
  try {
    const db = require('../src/config/database');
    const start = Date.now();
    const result = await db.query('SELECT COUNT(*)::int AS count FROM users;');
    const latency = Date.now() - start;
    const userCount = result.rows[0]?.count ?? 0;

    console.log(
      `      ${GREEN}✔ OPERATIONAL${NC} ${DIM}(Connected to database, ${userCount} registered users, ${latency}ms)${NC}`
    );
    // End connection pool cleanly
    if (db.pool && typeof db.pool.end === 'function') {
      await db.pool.end().catch(() => {});
    }
  } catch (err) {
    console.log(`      ${RED}✖ FAILED${NC} ${DIM}(${err.message})${NC}`);
    failures++;
  }

  // 3. Backend Direct Probe (/health on port 3000)
  process.stdout.write(`${BOLD}[3/5] Checking Backend Node.js /health probe...${NC}\n`);
  const healthResult = await new Promise((resolve) => {
    const req = http.get(
      'http://127.0.0.1:3000/health',
      { timeout: 3000 },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(rawData);
            resolve({ ok: res.statusCode === 200, status: parsed.status, data: parsed });
          } catch {
            resolve({ ok: false, error: 'Invalid JSON response' });
          }
        });
      }
    );

    req.on('error', (err) => {
      resolve({ ok: false, error: err.code || err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, error: 'Request timed out (3s)' });
    });
  });

  if (healthResult.ok && healthResult.status === 'healthy') {
    console.log(`      ${GREEN}✔ HEALTHY${NC} ${DIM}(Backend, DB pool, and Redis pool reported healthy)${NC}`);
  } else if (healthResult.ok) {
    console.log(`      ${YELLOW}⚠ DEGRADED${NC} ${DIM}(Status: ${healthResult.status})${NC}`);
    failures++;
  } else {
    console.log(`      ${RED}✖ UNREACHABLE${NC} ${DIM}(Port 3000: ${healthResult.error})${NC}`);
    if (!isProd) {
      console.log(`      ${CYAN}↳ Note: In local development, start the backend with: npm run dev${NC}`);
    }
    failures++;
  }

  // 4. Nginx Reverse Proxy Check
  process.stdout.write(`${BOLD}[4/5] Checking Nginx web server & configuration...${NC}\n`);
  let nginxActive = false;
  const nginxTest = runCommand('nginx -t') || runCommand('sudo -n nginx -t');
  if (nginxTest && (nginxTest.includes('syntax is ok') || nginxTest.includes('test is successful'))) {
    const activeCheck = runCommand('systemctl is-active nginx');
    if (activeCheck === 'active') {
      nginxActive = true;
    }
  }

  if (nginxActive) {
    console.log(`      ${GREEN}✔ OPERATIONAL${NC} ${DIM}(Config valid, service active)${NC}`);
  } else if (isProd) {
    console.log(`      ${RED}✖ FAILED${NC} ${DIM}(Nginx service inactive or syntax error)${NC}`);
    failures++;
  } else {
    console.log(`      ${CYAN}ℹ SKIPPED${NC} ${DIM}(Local dev mode — Nginx reverse proxy not required)${NC}`);
  }

  // 5. PM2 Process Manager (aegis-api)
  process.stdout.write(`${BOLD}[5/5] Checking PM2 process manager (aegis-api)...${NC}\n`);
  let pm2Online = false;
  let pm2Details = '';
  const pm2Raw = runCommand('pm2 jlist');
  if (pm2Raw) {
    try {
      const pm2List = JSON.parse(pm2Raw);
      const proc = pm2List.find((p) => p.name === 'aegis-api');
      if (proc && proc.pm2_env && proc.pm2_env.status === 'online') {
        pm2Online = true;
        pm2Details = `pid: ${proc.pid}, restarts: ${proc.pm2_env.restart_time || 0}`;
      }
    } catch {
      pm2Online = false;
    }
  }

  if (pm2Online) {
    console.log(`      ${GREEN}✔ ONLINE${NC} ${DIM}(aegis-api active, ${pm2Details})${NC}`);
  } else if (isProd) {
    console.log(`      ${RED}✖ STOPPED${NC} ${DIM}(aegis-api is not online in PM2)${NC}`);
    failures++;
  } else {
    console.log(`      ${CYAN}ℹ SKIPPED${NC} ${DIM}(Local dev mode — PM2 daemon not required)${NC}`);
  }

  // Summary
  console.log(`\n${BOLD}${CYAN}==============================================================${NC}`);
  if (failures === 0) {
    console.log(`${BOLD}${GREEN}AUDIT RESULT: ALL CHECKED SYSTEMS OPERATIONAL (0 ERRORS)${NC}`);
  } else {
    console.log(`${BOLD}${RED}AUDIT RESULT: ${failures} SERVICE(S) REPORTED ISSUES${NC}`);
  }
  console.log(`${BOLD}${CYAN}==============================================================${NC}\n`);

  process.exit(failures === 0 ? 0 : 1);
}

runHealthCheck().catch((err) => {
  console.error(`\n${RED}Unexpected health check error:${NC}`, err);
  process.exit(1);
});
