# ==============================================================================
# EloInsight Makefile
# ==============================================================================
# 
# Quick commands for local development and Docker management
#
# Usage:
#   make help          - Show available commands
#   make dev           - Start development environment
#   make down          - Stop all containers
#   make logs          - View all logs
#
# ==============================================================================

.PHONY: help dev prod down logs clean db-migrate db-seed build test

# Default target
help:
	@echo ""
	@echo "╔══════════════════════════════════════════════════════════════════╗"
	@echo "║                     EloInsight Commands                          ║"
	@echo "╚══════════════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "  Development:"
	@echo "    make dev          Start development stack (hot reload)"
	@echo "    make dev-infra    Start only infrastructure (Postgres, Redis)"
	@echo "    make prod         Start production stack"
	@echo "    make down         Stop all containers"
	@echo "    make restart      Restart all containers"
	@echo ""
	@echo "  Logs:"
	@echo "    make logs         View all logs"
	@echo "    make logs-api     View API Gateway logs"
	@echo "    make logs-sync    View Game Sync logs"
	@echo "    make logs-analysis View Analysis Service logs"
	@echo ""
	@echo "  Database:"
	@echo "    make db-migrate   Run database migrations"
	@echo "    make db-seed      Seed database with sample data"
	@echo "    make db-reset     Reset and reseed database"
	@echo "    make db-studio    Open Prisma Studio"
	@echo ""
	@echo "  Build & Test:"
	@echo "    make build        Build all Docker images"
	@echo "    make test         Run all tests"
	@echo "    make clean        Remove all containers and volumes"
	@echo ""

# ==============================================================================
# Development
# ==============================================================================

# Start development environment with hot reload
dev:
	@echo "🚀 Starting development environment..."
	docker-compose -f docker-compose.dev.yml up -d
	@echo ""
	@echo "✅ Development environment started!"
	@echo ""
	@echo "  Frontend:      http://localhost:3000"
	@echo "  API Gateway:   http://localhost:4000/api/v1"
	@echo "  Swagger Docs:  http://localhost:4000/api/docs"
	@echo "  Game Sync:     http://localhost:3002"
	@echo "  Analysis:      grpc://localhost:50051"
	@echo ""
	@echo "📋 View logs: make logs"
	@echo ""

# Start only infrastructure (for local service development)
dev-infra:
	@echo "🔧 Starting infrastructure services..."
	docker-compose -f docker-compose.dev.yml up -d postgres redis
	@echo ""
	@echo "✅ Infrastructure started!"
	@echo "  PostgreSQL:    localhost:5432 (user: eloinsight, pass: eloinsight_dev)"
	@echo "  Redis:         localhost:6379"
	@echo ""

# Start production stack
prod:
	@echo "🚀 Starting production environment..."
	docker-compose up -d --build
	@echo ""
	@echo "✅ Production environment started!"

# Stop all containers
down:
	@echo "🛑 Stopping all containers..."
	docker-compose down
	docker-compose -f docker-compose.dev.yml down
	@echo "✅ All containers stopped"

# Restart all containers
restart: down dev

# ==============================================================================
# Logs
# ==============================================================================

logs:
	docker-compose -f docker-compose.dev.yml logs -f

logs-api:
	docker-compose -f docker-compose.dev.yml logs -f api-gateway

logs-sync:
	docker-compose -f docker-compose.dev.yml logs -f game-sync

logs-analysis:
	docker-compose -f docker-compose.dev.yml logs -f analysis-service

logs-frontend:
	docker-compose -f docker-compose.dev.yml logs -f frontend

# ==============================================================================
# Database
# ==============================================================================

db-migrate:
	@echo "📦 Running database migrations..."
	cd backend/database && npm run db:migrate

db-seed:
	@echo "🌱 Seeding database..."
	cd backend/database && npm run db:seed

db-reset:
	@echo "🔄 Resetting database..."
	cd backend/database && npm run db:reset

db-studio:
	@echo "🎨 Opening Prisma Studio..."
	cd backend/database && npm run db:studio

# ==============================================================================
# Build & Test
# ==============================================================================

build:
	@echo "🏗️ Building all Docker images..."
	docker-compose build --no-cache

test:
	@echo "🧪 Running tests..."
	@echo ""
	@echo "Testing API Gateway..."
	cd backend/api-gateway && npm test
	@echo ""
	@echo "Testing Game Sync Service..."
	cd backend/game-sync-service && npm test
	@echo ""
	@echo "Testing Analysis Service..."
	cd backend/analysis-service && go test ./...
	@echo ""
	@echo "Testing Frontend..."
	cd frontend && npm test

# Clean up everything
clean:
	@echo "🧹 Cleaning up..."
	docker-compose down -v --remove-orphans
	docker-compose -f docker-compose.dev.yml down -v --remove-orphans
	docker system prune -f
	@echo "✅ Cleanup complete"

# ==============================================================================
# Quick Start
# ==============================================================================

# Setup project from scratch
setup:
	@echo "📋 Setting up EloInsight..."
	@echo ""
	@echo "1️⃣ Installing dependencies..."
	cd frontend && npm install
	cd backend/api-gateway && npm install
	cd backend/game-sync-service && npm install
	cd backend/database && npm install
	cd backend/analysis-service && go mod download
	@echo ""
	@echo "2️⃣ Starting infrastructure..."
	docker-compose -f docker-compose.dev.yml up -d postgres redis
	@echo ""
	@echo "3️⃣ Running migrations..."
	sleep 5
	cd backend/database && npm run db:migrate
	@echo ""
	@echo "4️⃣ Seeding database..."
	cd backend/database && npm run db:seed
	@echo ""
	@echo "✅ Setup complete! Run 'make dev' to start all services."

# Status check
status:
	@echo "📊 Container Status:"
	@echo ""
	docker-compose -f docker-compose.dev.yml ps
