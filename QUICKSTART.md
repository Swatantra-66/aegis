# Aegis IAM — Quick Start Guide

Welcome to the **Aegis IAM** Quick Start Guide! This document walks you through spinning up the complete Aegis ecosystem (PostgreSQL, Redis, Express Backend, and React Frontend) in under **3 minutes**.

---

## Prerequisites

Ensure you have the following installed on your machine:
- **Node.js**: `v18.0.0` or higher (`node -v`)
- **npm**: `v9.0.0` or higher (`npm -v`)
- **Docker & Docker Compose**: For instant database & Redis services (`docker compose version`)
  - *(Alternatively, a local PostgreSQL 14+ and Redis 6+ instance)*
- **Git**

---

## 3-Minute Fast Track

### 1. Clone & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/Swatantra-66/aegis.git
cd aegis

# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..
```

---

### 2. Configure Environment Variables

Copy the example environment template to `.env`:

```bash
# Windows (PowerShell / CMD)
copy .env.example .env

# macOS / Linux
cp .env.example .env
```

> [!IMPORTANT]
> The default `.env.example` is pre-configured to work out-of-the-box with the local Docker Compose setup. For production, ensure you generate strong cryptographically secure secrets (min 32 characters) for `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `MFA_ENCRYPTION_KEY`.

---

### 3. Start Infrastructure (PostgreSQL & Redis)

Start PostgreSQL (`:5432`) and Redis (`:6379`) with Docker:

```bash
docker compose up -d
```

Check that both containers are healthy:
```bash
docker compose ps
```

---

### 4. Run Migrations & Seed Default Roles

Initialize the database schema, RBAC tables, permissions, and default roles:

```bash
# 1. Run migrations
npm run migrate

# 2. Seed default roles (super_admin, admin, user) & permission matrix
npm run seed
```

---

### 5. Launch Backend & Frontend

Open two terminal windows:

#### Terminal 1 — Backend API (`http://localhost:3000`)
```bash
npm run dev
```

#### Terminal 2 — React Frontend (`http://localhost:5173`)
```bash
cd frontend
npm run dev
```

---

## 🌐 Access Points & Useful URLs

| Service | URL | Description |
| :--- | :--- | :--- |
| **Frontend Portal** | [http://localhost:5173](http://localhost:5173) | Interactive React UI with Login, Register, MFA Setup, and Admin Dashboard |
| **Backend API** | [http://localhost:3000](http://localhost:3000) | Express REST API server |
| **API Documentation** | [http://localhost:3000/api-docs](http://localhost:3000/api-docs) | Interactive Swagger / OpenAPI 3.0 Explorer |
| **Health Check** | [http://localhost:3000/health](http://localhost:3000/health) | Live DB & Redis connectivity status |

---

## 👤 Creating Your First Admin Account

1. **Register a new account via Frontend or API:**
   Navigate to `http://localhost:5173/register` or execute:
   ```bash
   curl -X POST http://localhost:3000/api/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "admin@example.com",
       "password": "Password123!",
       "first_name": "System",
       "last_name": "Admin"
     }'
   ```

2. **Promote to Super Admin:**
   Run the promotion script to grant full administrative privileges to your user:
   ```bash
   # Run the interactive/configurable promotion script:
   node -e "require('./src/db/seeds/promote_super_admin').promoteUser('admin@example.com')"
   ```

3. **Log in** at `http://localhost:5173/login` with your new credentials to access the full Administrative Console.

---

## Testing the API

### 1. Interactive Swagger UI
Open [http://localhost:3000/api-docs](http://localhost:3000/api-docs) to test all authentication, user management, RBAC, MFA, and audit log endpoints directly from your browser.

### 2. Run Automated Test Suite
Aegis comes with comprehensive integration and unit tests:

```bash
# Run Jest test suite
npm test

# Run tests with code coverage report
npm run test:coverage
```

---

## Common Makefile Shortcuts (Optional)

If you have `make` installed:

| Command | Action |
| :--- | :--- |
| `make docker-up` | Start Postgres & Redis containers in background |
| `make docker-down` | Stop and remove running containers |
| `make migrate` | Execute all pending PostgreSQL migrations |
| `make seed` | Seed default roles and permissions |
| `make test` | Run test suite |
| `make lint` | Run ESLint check |
| `make format` | Format codebase with Prettier |

---

## Troubleshooting

### 1. Port 5432 or 6379 Already in Use
- If you have a local PostgreSQL or Redis service running, stop it or update the ports in `.env` and `docker-compose.yml`:
  ```bash
  # Check ports in use on Windows
  netstat -ano | findstr :5432
  ```

### 2. Missing Environment Variables Error
- Aegis performs strict schema validation on startup. If any key is missing or shorter than 32 characters, the process exits with a clear validation error. Ensure `.env` is copied correctly.

### 3. Database Connection Refused
- Ensure the Docker container is up: `docker compose ps`
- Verify container logs: `docker compose logs postgres`

---

## Related Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — Architectural diagrams, data flow, and threat model
- **[SRS.md](./SRS.md)** — Software Requirements Specification
- **[SECURITY.md](./SECURITY.md)** — Security policies, hashing benchmarks, and disclosure guide
- **[ROADMAP.md](./ROADMAP.md)** — Upcoming features and milestones
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** — Contribution guidelines and code standards
