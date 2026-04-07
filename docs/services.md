# Services Documentation

## Table of Contents
- [Service Overview](#service-overview)
- [Backend Services](#backend-services)
- [Service Communication](#service-communication)

## Service Overview

EloInsight uses a microservices architecture with the following services:

| Service | Path | Language | Port | Description |
|---------|------|----------|------|-------------|
| **Frontend** | `frontend` | React/Vite | 13000 | Main user interface |
| **Admin Panel** | `admin` | React/Vite | 13001 | Admin dashboard |
| **API Gateway** | `backend/api-gateway` | NestJS | 14000 | Authentication, routing |
| **Database** | `backend/database` | Prisma | - | PostgreSQL ORM layer |
| **Game Sync** | `backend/game-sync-service` | NestJS | 14002 | Chess.com/Lichess sync |
| **Analysis** | `backend/analysis-service` | Go | 50051 | Stockfish gRPC service |

## Backend Services

### API Gateway

REST API gateway handling authentication and request routing.

```bash
cd backend/api-gateway
npm install
npm run start:dev
```

**Endpoints:**
- `GET /auth/lichess/login` - Start Lichess OAuth
- `GET /auth/google/login` - Start Google OAuth
- `GET /games` - List user games
- `POST /sync/trigger` - Trigger game sync

### Database Layer

Prisma ORM with PostgreSQL. Shared by all NestJS services.

```bash
cd backend/database
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
```

📖 **Full Documentation:** [Database Design](./database-design.md)

### Game Sync Service

Fetches games from Chess.com and Lichess using their public APIs.

```bash
cd backend/game-sync-service
npm install
npm run start:dev
```

**Features:**
- Cron-based sync (every 6 hours)
- Rate limiting (300/min Chess.com, 15/sec Lichess)
- Deduplication by external ID
- Incremental sync

📖 **Full Documentation:** [Game Sync](./game-sync.md)

### Analysis Service

Go gRPC service for Stockfish chess analysis.

```bash
cd backend/analysis-service
make build
./bin/analysis-service
```

**gRPC Methods:**
- `AnalyzePosition` - Single FEN analysis
- `AnalyzeGame` - Full game analysis
- `GetBestMoves` - MultiPV analysis
- `HealthCheck` - Service health

📖 **Full Documentation:** [Stockfish Integration](./stockfish-integration.md)

## Service Communication

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│                    (React/Vite :13000)                         │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP/REST
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                     ADMIN PANEL                               │
│                   (React/Vite :13001)  ──────────────────────┐│
└─────────────────────────────────────────────────────────────┘│
                      │ HTTP/REST                              │
                      ▼                                        │
┌─────────────────────────────────────────────────────────────┐│
│                     API GATEWAY                              ││
│                    (NestJS :14000)                            │◄
│                                                              │
│  • JWT Authentication    • Rate Limiting                     │
│  • Request Validation    • Response Transformation           │
└───────┬─────────────────────────────┬───────────────────────┘
        │                             │
        │ HTTP/REST                   │ gRPC
        ▼                             ▼
┌───────────────────┐     ┌───────────────────────────────────┐
│   GAME SYNC       │     │        ANALYSIS SERVICE           │
│  (NestJS :14002)   │     │          (Go :50051)              │
│                   │     │                                    │
│  • Chess.com API  │     │  • Stockfish Pool                 │
│  • Lichess API    │     │  • Position Analysis              │
│  • Rate Limiting  │     │  • Move Classification            │
│  • Deduplication  │     │  • Metrics Calculation            │
└─────────┬─────────┘     └──────────────┬────────────────────┘
          │                              │
          │         ┌────────────────────┘
          ▼         ▼
┌─────────────────────────────────────────────────────────────┐
│                       DATABASE                               │
│                    (PostgreSQL)                              │
│                                                              │
│  Users • Games • Analysis • Statistics • Jobs                │
└─────────────────────────────────────────────────────────────┘
```

## Running All Services

### Development

```bash
# Terminal 1: Database setup (one-time)
cd backend/database
npm run db:generate && npm run db:migrate

# Terminal 2: API Gateway
cd backend/api-gateway
npm run start:dev

# Terminal 3: Game Sync Service
cd backend/game-sync-service
npm run start:dev

# Terminal 4: Analysis Service
cd backend/analysis-service
./bin/analysis-service

# Terminal 5: Frontend
cd frontend
npm run dev

# Terminal 6: Admin Panel
cd admin
npm run dev
```

### Docker (Production)

```bash
docker-compose up -d
```

---

**Related Documentation:**
- [Architecture Overview](./architecture.md)
- [API Design](./api-design.md)
- [Database Design](./database-design.md)
- [Game Sync](./game-sync.md)
- [Stockfish Integration](./stockfish-integration.md)
