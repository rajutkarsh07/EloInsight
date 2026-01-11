# Local Development Setup

Complete guide to running EloInsight locally using Docker.

## Prerequisites

- **Docker Desktop** (v20.10+) - [Install](https://docs.docker.com/get-docker/)
- **Docker Compose** (v2.0+) - Included with Docker Desktop
- **Git** - [Install](https://git-scm.com/)
- **Make** (optional) - For convenience commands

### Optional (for non-Docker development)
- **Node.js** (v20+)
- **Go** (v1.21+)
- **Stockfish** chess engine

## Quick Start

### One-Command Startup

```bash
# Clone repository
git clone https://github.com/eloinsight/eloinsight.git
cd eloinsight

# Copy environment file
cp .env.example .env

# Start everything
make dev
```

### Without Make

```bash
# Start with Docker Compose
docker-compose -f docker-compose.dev.yml up -d
```

### Service URLs

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | Next.js web app |
| API Gateway | http://localhost:4000/api/v1 | REST API |
| Swagger Docs | http://localhost:4000/api/docs | API documentation |
| Game Sync | http://localhost:3002 | Game sync service |
| Analysis | grpc://localhost:50051 | gRPC analysis |
| PostgreSQL | localhost:5432 | Database |
| Redis | localhost:6379 | Cache |

## Development Modes

### 1. Full Docker (Recommended)

All services run in Docker with hot reloading.

```bash
make dev
```

### 2. Infrastructure Only

Run only Postgres and Redis in Docker, services locally.

```bash
# Start infrastructure
make dev-infra

# In separate terminals:
cd frontend && npm run dev
cd backend/api-gateway && npm run start:dev
cd backend/game-sync-service && npm run start:dev
cd backend/analysis-service && make run
```

### 3. Production Build

Build and run production containers.

```bash
make prod
```

## Docker Compose Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Production build |
| `docker-compose.dev.yml` | Development with hot reload |

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# PostgreSQL
POSTGRES_USER=eloinsight
POSTGRES_PASSWORD=eloinsight_dev
POSTGRES_DB=eloinsight
POSTGRES_PORT=5432

# Redis
REDIS_PORT=6379

# API Gateway
API_PORT=4000
JWT_SECRET=your-secret-key

# Services
GAME_SYNC_PORT=3002
ANALYSIS_PORT=50051

# Frontend
FRONTEND_PORT=3000
```

## Common Commands

### Makefile Commands

```bash
make help          # Show all commands
make dev           # Start development environment
make dev-infra     # Start only Postgres + Redis
make down          # Stop all containers
make logs          # View all logs
make logs-api      # View API Gateway logs
make db-migrate    # Run database migrations
make db-seed       # Seed sample data
make db-studio     # Open Prisma Studio
make test          # Run all tests
make clean         # Remove containers and volumes
make status        # Show container status
```

### Docker Compose Commands

```bash
# Start services
docker-compose -f docker-compose.dev.yml up -d

# Stop services
docker-compose -f docker-compose.dev.yml down

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Restart specific service
docker-compose -f docker-compose.dev.yml restart api-gateway

# Rebuild and start
docker-compose -f docker-compose.dev.yml up -d --build

# Remove volumes (reset data)
docker-compose -f docker-compose.dev.yml down -v
```

## Database Setup

### Initial Migration

```bash
# With Docker running
cd backend/database
npm install
npm run db:migrate
```

### Seed Sample Data

```bash
cd backend/database
npm run db:seed
```

### Prisma Studio (GUI)

```bash
cd backend/database
npm run db:studio
# Opens at http://localhost:5555
```

### Direct Database Access

```bash
# Using psql
docker exec -it eloinsight-postgres-dev psql -U eloinsight -d eloinsight

# Common queries
\dt              # List tables
\d users         # Describe users table
SELECT * FROM users;
```

## Service Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        docker-compose                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│   │  Frontend   │  │ API Gateway │  │  Analysis   │             │
│   │  :3000      │  │  :4000      │  │  :50051     │             │
│   │  (Next.js)  │  │  (NestJS)   │  │  (Go+SF)    │             │
│   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│          │                │                │                     │
│          │     ┌──────────┴─────────┐      │                     │
│          │     │                    │      │                     │
│   ┌──────▼─────▼────┐   ┌──────────▼──────▼─────┐               │
│   │   Game Sync     │   │       PostgreSQL       │               │
│   │   :3002         │   │       :5432            │               │
│   │   (NestJS)      │   └──────────┬─────────────┘               │
│   └─────────────────┘              │                             │
│                          ┌─────────▼─────────┐                   │
│                          │       Redis       │                   │
│                          │       :6379       │                   │
│                          └───────────────────┘                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose -f docker-compose.dev.yml logs <service-name>

# Check container status
docker ps -a

# Restart with rebuild
docker-compose -f docker-compose.dev.yml up -d --build <service-name>
```

### Port Already in Use

```bash
# Find process using port
lsof -i :4000

# Kill process
kill -9 <PID>

# Or change port in .env
API_PORT=4001
```

### Database Connection Issues

```bash
# Check Postgres is healthy
docker-compose -f docker-compose.dev.yml ps postgres

# Check connection from host
psql -h localhost -U eloinsight -d eloinsight

# Reset database
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d postgres
```

### Node Modules Issues

```bash
# Clear node_modules in container
docker-compose -f docker-compose.dev.yml exec api-gateway rm -rf node_modules
docker-compose -f docker-compose.dev.yml restart api-gateway
```

### Analysis Service Not Responding

```bash
# Check gRPC health
grpcurl -plaintext localhost:50051 list

# Check service logs
make logs-analysis

# Verify Stockfish installed
docker exec eloinsight-analysis-dev stockfish
```

## Development Workflow

### 1. Start Development Environment

```bash
make dev
```

### 2. Make Code Changes

- Frontend: Changes auto-reload (Next.js Fast Refresh)
- Backend: Changes auto-reload (NestJS watch mode)
- Analysis: Requires rebuild (`docker-compose restart analysis-service`)

### 3. Run Tests

```bash
make test
```

### 4. View Logs

```bash
make logs
```

### 5. Stop When Done

```bash
make down
```

## Resource Requirements

| Service | RAM | CPU | Notes |
|---------|-----|-----|-------|
| PostgreSQL | 256MB | 0.5 | Persistent data |
| Redis | 64MB | 0.1 | Cache |
| API Gateway | 256MB | 0.5 | Node.js |
| Game Sync | 256MB | 0.5 | Node.js |
| Analysis | 2GB | 2.0 | Stockfish engine |
| Frontend | 512MB | 1.0 | Next.js dev |

**Total Recommended**: 4GB RAM, 4 CPU cores

---

**Related Documentation:**
- [Database Design](database-design.md)
- [Services Overview](services.md)
- [Deployment Guide](deployment.md)
