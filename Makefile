.PHONY: help install dev frontend start test test-cov migrate seed lint format clean

# Default target
help:
	@echo "======================================================="
	@echo "               AEGIS IAM — Make Commands               "
	@echo "======================================================="
	@echo "  make install     Install all backend & frontend dependencies"
	@echo "  make start       Start backend server in development mode"
	@echo "  make dev         Start backend with nodemon live reload"
	@echo "  make frontend    Start frontend Vite dev server"
	@echo "  make migrate     Run PostgreSQL schema migrations"
	@echo "  make seed        Seed initial roles & permissions"
	@echo "  make test        Run backend unit & integration tests"
	@echo "  make test-cov    Run test suite with coverage report"
	@echo "  make lint        Run ESLint across codebase"
	@echo "  make format      Format code with Prettier"
	@echo "  make clean       Remove temporary files and logs"
	@echo "======================================================="

# Installation
install:
	npm install
	cd frontend && npm install

# Server & Development
start:
	npm start

dev:
	npm run dev

frontend:
	cd frontend && npm run dev

# Database
migrate:
	npm run migrate

seed:
	npm run seed

# Testing & Quality
test:
	npm test

test-cov:
	npm run test:coverage

lint:
	npm run lint

lint-fix:
	npm run lint:fix

format:
	npm run format

# Housekeeping
clean:
	rm -rf coverage logs/*.log dist frontend/dist
