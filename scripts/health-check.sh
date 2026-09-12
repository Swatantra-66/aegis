#!/usr/bin/env bash
# Aegis IAM Portal — Automated System Health Check Script
# Validates Redis, PostgreSQL, Node.js Backend, Nginx, and PM2 process status.
# Delegates to cross-platform Node.js audit engine (scripts/health-check.js).

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

exec node "$ROOT_DIR/scripts/health-check.js" "$@"
