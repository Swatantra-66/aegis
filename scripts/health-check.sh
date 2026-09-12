#!/usr/bin/env bash
# Aegis IAM Portal — Automated System Health Check Script
# Validates Redis, PostgreSQL, Node.js Backend, Nginx, and PM2 process status.

set -e

BOLD="\033[1m"
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
CYAN="\033[0;36m"
NC="\033[0m"

echo -e "${BOLD}${CYAN}          AEGIS IAM — SYSTEM HEALTH AUDIT             ${NC}"
echo -e "Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo ""

FAILURES=0

# 1. Redis Check
echo -ne "${BOLD}[1/5] Checking Redis in-memory cache & queues...${NC} "
REDIS_RES=$(redis-cli ping 2>/dev/null || echo "FAIL")
if [ "$REDIS_RES" = "PONG" ]; then
  echo -e "${GREEN}✔ OPERATIONAL (PONG received)${NC}"
else
  echo -e "${RED}✖ FAILED (Redis server unreachable)${NC}"
  FAILURES=$((FAILURES + 1))
fi

# 2. PostgreSQL Check
echo -ne "${BOLD}[2/5] Checking PostgreSQL database connectivity...${NC} "
if command -v psql >/dev/null 2>&1; then
  PG_RES=$(sudo -i -u postgres psql -d iam_portal -tAc "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "FAIL")
  if [ "$PG_RES" != "FAIL" ]; then
    echo -e "${GREEN}✔ OPERATIONAL (Connected, ${PG_RES} registered users)${NC}"
  else
    echo -e "${RED}✖ FAILED (Unable to query iam_portal database)${NC}"
    FAILURES=$((FAILURES + 1))
  fi
else
  echo -e "${YELLOW}⚠ SKIPPED (psql client not found in PATH)${NC}"
fi

# 3. Backend Direct Probe (/health on port 3000)
echo -ne "${BOLD}[3/5] Checking Backend Node.js /health probe...${NC} "
HEALTH_JSON=$(curl -s --max-time 5 http://127.0.0.1:3000/health 2>/dev/null || echo "")
if echo "$HEALTH_JSON" | grep -Eq '"status"[[:space:]]*:[[:space:]]*"healthy"'; then
  echo -e "${GREEN}✔ HEALTHY (Backend, DB pool, and Redis pool reported healthy)${NC}"
elif [ -n "$HEALTH_JSON" ]; then
  echo -e "${YELLOW}⚠ DEGRADED (Backend responded but state is not healthy): $HEALTH_JSON${NC}"
  FAILURES=$((FAILURES + 1))
else
  echo -e "${RED}✖ UNREACHABLE (Backend not responding on 127.0.0.1:3000)${NC}"
  FAILURES=$((FAILURES + 1))
fi

# 4. Nginx Reverse Proxy Check
echo -ne "${BOLD}[4/5] Checking Nginx web server & configuration...${NC} "
if command -v nginx >/dev/null 2>&1; then
  if sudo nginx -t >/dev/null 2>&1 && systemctl is-active --quiet nginx 2>/dev/null; then
    echo -e "${GREEN}✔ OPERATIONAL (Config valid, service active)${NC}"
  else
    echo -e "${RED}✖ FAILED (Nginx config invalid or service inactive)${NC}"
    FAILURES=$((FAILURES + 1))
  fi
else
  echo -e "${YELLOW}⚠ SKIPPED (nginx binary not installed)${NC}"
fi

# 5. PM2 Process Status (specifically queries aegis-api process by name)
echo -ne "${BOLD}[5/5] Checking PM2 process manager (aegis-api)...${NC} "
if command -v pm2 >/dev/null 2>&1; then
  if pm2 describe aegis-api 2>/dev/null | grep -iE 'status' | grep -iq 'online' || \
     (command -v node >/dev/null 2>&1 && node -e 'const l=JSON.parse(require("child_process").execSync("pm2 jlist 2>/dev/null").toString()); process.exit(l.some(p => p.name === "aegis-api" && p.pm2_env && p.pm2_env.status === "online") ? 0 : 1)' 2>/dev/null); then
    echo -e "${GREEN}✔ ONLINE (aegis-api process is active)${NC}"
  else
    echo -e "${RED}✖ STOPPED (aegis-api is not online in PM2)${NC}"
    FAILURES=$((FAILURES + 1))
  fi
else
  echo -e "${YELLOW}⚠ SKIPPED (pm2 command not found in PATH)${NC}"
fi

echo ""
echo -e "${BOLD}${CYAN}======================================================${NC}"
if [ $FAILURES -eq 0 ]; then
  echo -e "${BOLD}${GREEN}AUDIT RESULT: ALL SYSTEMS OPERATIONAL (0 ERRORS)${NC}"
else
  echo -e "${BOLD}${RED}AUDIT RESULT: $FAILURES SERVICE(S) REPORTED ISSUES${NC}"
fi
echo -e "${BOLD}${CYAN}======================================================${NC}"

exit $FAILURES
