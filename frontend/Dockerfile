# Multi-stage production build for Aegis IAM Frontend

# ── Stage 1: Build Frontend SPA ───────────────────────
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Copy package manifests and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and build production bundle
COPY . .
RUN npm run build

# ── Stage 2: Serve via Nginx Alpine ──────────────────
FROM nginx:1.27-alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy compiled SPA assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP and HTTPS ports
EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
