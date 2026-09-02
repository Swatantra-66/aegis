# Multi-stage or optimized production Dockerfile for Aegis IAM Backend
FROM node:20-bookworm-slim AS base

# Install OpenSSL, CA certificates, and curl for healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy application source code
COPY src/ ./src/

# Set production environment defaults
ENV NODE_ENV=production
ENV PORT=3000

# Run as non-root node user for hardened security
USER node

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start server (migrations run automatically on startup via src/server.js)
CMD ["node", "src/server.js"]
