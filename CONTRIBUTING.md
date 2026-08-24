# Contributing to Aegis IAM

Thank you for your interest in contributing to **Aegis IAM**! This document provides guidelines and instructions for setting up the environment, code standards, and submitting pull requests.

---

## Code of Conduct

We are committed to providing a welcoming, inclusive, and harassment-free environment for all contributors. Treat everyone with respect and empathy.

---

## Getting Started

### Prerequisites

- **Node.js** >= 18.0.0
- **PostgreSQL** >= 14.0
- **Redis** >= 6.0
- **npm** >= 9.0.0

### Local Development Setup

1. **Fork and Clone:**
   ```bash
   git clone https://github.com/Swatantra-66/aegis.git
   cd aegis
   ```

2. **Install Backend Dependencies:**
   ```bash
   npm install
   ```

3. **Install Frontend Dependencies:**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

4. **Configure Environment Variables:**
   ```bash
   cp .env.example .env
   # Update DB_PASSWORD, REDIS_URL, and JWT_SECRET as needed
   ```

5. **Run Migrations & Seeds:**
   ```bash
   npm run migrate
   npm run seed
   ```

6. **Start Development Services:**
   - **Backend API:**
     ```bash
     npm start
     # Server runs on http://localhost:5000 (Swagger docs at /api-docs)
     ```
   - **Frontend UI:**
     ```bash
     cd frontend
     npm run dev
     # Client runs on http://localhost:5173
     ```

---

## Development Workflow

### Branch Naming Conventions

Use descriptive branch names with appropriate prefixes:
- `feat/feature-name` (New features)
- `fix/bug-description` (Bug fixes)
- `security/patch-name` (Security improvements)
- `docs/doc-update` (Documentation changes)
- `refactor/component-name` (Code restructuring)

### Code Quality & Standards

- **Linting & Formatting:**
  ```bash
  npm run lint
  npm run format
  ```
- **Automated Tests:**
  Always run and verify all test suites before submitting a PR:
  ```bash
  npm test
  npm run test:coverage
  ```

---

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```text
<type>(<scope>): <short summary>

[optional body]

[optional footer]
```

### Examples:
- `feat(mfa): add WebAuthn biometric authentication support`
- `fix(tokens): resolve race condition in refresh token rotation`
- `docs(readme): add OpenAPI swagger schema instructions`
- `test(roles): add boundary tests for hierarchical RBAC permissions`

---

## Submitting Pull Requests

1. Ensure all tests pass (`npm test`) and code is formatted.
2. Push your changes to your feature branch on your fork.
3. Open a Pull Request against the `main` branch of the upstream repository.
4. Describe the changes, motivation, and link any related issues.
5. A maintainer will review your PR and provide feedback.
