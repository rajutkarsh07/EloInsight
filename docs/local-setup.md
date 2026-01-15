# Local Development Setup

Complete guide to running EloInsight locally **without Docker** (native development).

---

## 🚀 Quick Update (Existing Contributors)

After pulling the latest changes, run these commands:

```bash
# Pull latest changes
git pull origin main

# Update all dependencies
cd backend/api-gateway && npm install && npx prisma generate && cd ../..
cd backend/game-sync-service && npm install && npx prisma generate && cd ../..
cd frontend && npm install && cd ..

# If there are new database changes (schema.prisma modified):
cd backend/api-gateway
npx prisma db push  # Safe - won't delete data
# OR for new migrations:
npx prisma migrate dev

# Restart all services
```

### Common Prisma Commands

```bash
# Generate Prisma Client (after schema changes)
npx prisma generate

# Sync schema to database (safe, keeps data)
npx prisma db push

# Create migration (for new schema changes)
npx prisma migrate dev --name your_migration_name

# View database in browser
npx prisma studio

# Reset database (⚠️ DELETES ALL DATA)
npx prisma migrate reset
```

---

## What You'll Get

Once setup is complete, you'll have access to:

- **Analysis Viewer** with Phase Breakdown, Evaluation Graph, Key Moments
- **Social Login** with Lichess and Google OAuth
- **Auto-play Mode** with adjustable speed (0.5s - 3s)
- **Keyboard Shortcuts** for navigation (←, →, Space, F, C, M, ?)
- **Move Sounds** for feedback on moves, captures, and blunders
- **Exploration Mode** to analyze alternative lines
- **Win Probability** visualization
- **Suggested Focus Areas** based on your mistakes
- **Game Sync** from Chess.com and Lichess

---

## Prerequisites

Install the following tools on your system:

| Tool | Version | Installation |
|------|---------|--------------|
| **Node.js** | v20+ | [Download](https://nodejs.org/) or `brew install node` |
| **Go** | v1.21+ | [Download](https://golang.org/dl/) or `brew install go` |
| **PostgreSQL** | v15+ | `brew install postgresql@15` |
| **Stockfish** | v16+ | `brew install stockfish` |
| **Protobuf** | v3.21+ | `brew install protobuf` |
| **Git** | Latest | `brew install git` |

### Verify Installations

```bash
node --version    # Should be v20+
npm --version     # Should be v10+
go version        # Should be go1.21+
psql --version    # Should be 15+
stockfish         # Should print Stockfish version
protoc --version  # Should be libprotoc 3.21+
```

---

## 🆕 First-Time Setup (New Contributors)

### Step 1: Clone & Database Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/EloInsight.git
cd EloInsight

# Start PostgreSQL (if not running)
brew services start postgresql@15

# Create database
createdb eloinsight

# Verify connection
psql -d eloinsight -c "SELECT version();"
```

### Step 2: Backend Services Setup

Run these in order:

```bash
# API Gateway
cd backend/api-gateway
npm install
cp .env.example .env   # Edit .env with your values (see below)
npx prisma generate
npx prisma migrate dev --name init
cd ../..

# Game Sync Service
cd backend/game-sync-service
npm install
cp .env.example .env   # Edit .env with your values
npx prisma generate
cd ../..

# Analysis Service (Go)
cd backend/analysis-service
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
export PATH="$PATH:$(go env GOPATH)/bin"
make proto
go mod tidy
go build -o bin/analysis-service ./cmd/server
cd ../..

# Frontend
cd frontend
npm install
cp .env.example .env   # Edit if needed
cd ..
```

---

## Environment Variables

### API Gateway (`backend/api-gateway/.env`)

```bash
# Database
DATABASE_URL="postgresql://localhost:5432/eloinsight?schema=public"

# JWT Authentication
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_REFRESH_SECRET="your-refresh-token-secret"
JWT_EXPIRES_IN="1h"
JWT_REFRESH_EXPIRES_IN="7d"

# Server
PORT=4000
API_PREFIX="api/v1"
CORS_ORIGIN="http://localhost:5173"
FRONTEND_URL="http://localhost:5173"

# Analysis Service (gRPC)
ANALYSIS_SERVICE_URL="localhost:50051"

# OAuth - Lichess (optional)
# Just use any app name - no registration needed!
LICHESS_CLIENT_ID="eloinsight"

# OAuth - Google (optional)
# Get from: https://console.cloud.google.com/apis/credentials
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Node environment
NODE_ENV="development"
```

### Game Sync Service (`backend/game-sync-service/.env`)

```bash
# Database (same as API Gateway)
DATABASE_URL="postgresql://localhost:5432/eloinsight?schema=public"

# Server
PORT=3002
CORS_ORIGIN="http://localhost:5173,http://localhost:4000"

# Sync settings
SYNC_CRON="0 */6 * * *"

# Node environment
NODE_ENV="development"
```

### Analysis Service (`backend/analysis-service/.env`)

```bash
# gRPC Server
GRPC_PORT=50051

# Stockfish Configuration
STOCKFISH_PATH="/opt/homebrew/bin/stockfish"  # Run: which stockfish
STOCKFISH_THREADS=4
STOCKFISH_HASH=2048

# Analysis Settings
DEFAULT_DEPTH=20
MAX_DEPTH=30
WORKER_POOL_SIZE=4

# Logging
LOG_LEVEL="info"
```

### Frontend (`frontend/.env`)

```bash
VITE_API_URL="http://localhost:4000/api/v1"
```

---

## OAuth Setup (Optional)

### Lichess OAuth

**No registration needed!** Just set any app name:

```bash
LICHESS_CLIENT_ID="eloinsight"
```

That's it! Lichess PKCE OAuth works without registering an app.

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Go to **APIs & Services** → **OAuth consent screen**
   - Select "External"
   - Fill in app name, emails
   - Add yourself as test user
4. Go to **APIs & Services** → **Credentials**
   - Click **+ CREATE CREDENTIALS** → **OAuth client ID**
   - Type: **Web application**
   - Add redirect URI: `http://localhost:4000/api/v1/auth/google/callback`
5. Copy Client ID and Client Secret to your `.env`

---

## Running All Services

Open **4 terminal windows** and run:

| Terminal | Directory | Command |
|----------|-----------|---------|
| 1 | `backend/analysis-service` | `./bin/analysis-service` |
| 2 | `backend/api-gateway` | `npm run start:dev` |
| 3 | `backend/game-sync-service` | `npm run start:dev` |
| 4 | `frontend` | `npm run dev` |

### Quick Start Script (Optional)

Create `start-all.sh` in project root:

```bash
#!/bin/bash
# Start all EloInsight services

echo "Starting Analysis Service..."
cd backend/analysis-service && ./bin/analysis-service &

sleep 2

echo "Starting API Gateway..."
cd backend/api-gateway && npm run start:dev &

echo "Starting Game Sync Service..."
cd backend/game-sync-service && npm run start:dev &

echo "Starting Frontend..."
cd frontend && npm run dev &

echo "All services started!"
echo "Frontend: http://localhost:5173"
echo "API: http://localhost:4000/api/v1"
```

---

## Service URLs

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:5173 | React web app |
| API Gateway | http://localhost:4000/api/v1 | REST API |
| Swagger Docs | http://localhost:4000/api/docs | API documentation |
| Game Sync | http://localhost:3002 | Game sync service |
| Analysis | grpc://localhost:50051 | gRPC analysis |
| Prisma Studio | http://localhost:5555 | Database GUI |
| PostgreSQL | localhost:5432 | Database |

---

## Creating Test Users

### Option 1: Sign up via UI
1. Go to http://localhost:5173/signup
2. Click "Continue with Lichess" (recommended)
3. Or sign up with email

### Option 2: Create via script
```bash
cd backend/api-gateway
npx ts-node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('password123', 10);
  const user = await prisma.user.create({
    data: {
      email: 'test@example.com',
      username: 'testuser',
      passwordHash: hash,
      emailVerified: true,
    },
  });
  console.log('Created user:', user.email);
}

main().finally(() => prisma.\$disconnect());
"
```

Then login with:
- Email: `test@example.com`
- Password: `password123`

---

## Keyboard Shortcuts (Analysis Viewer)

| Key | Action |
|-----|--------|
| `←` / `→` | Previous / Next move |
| `Home` / `End` | First / Last move |
| `Space` | Play / Pause auto-play |
| `F` | Flip board |
| `C` | Copy FEN to clipboard |
| `M` | Toggle move sounds |
| `?` or `H` | Show shortcuts panel |
| `Esc` | Exit exploration mode |

---

## Troubleshooting

### Prisma Issues

```bash
# Schema out of sync - sync without losing data
npx prisma db push

# Generate client after schema changes
npx prisma generate

# View database
npx prisma studio

# Full reset (⚠️ deletes all data)
npx prisma migrate reset
```

### `protoc-gen-go: program not found`

```bash
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
export PATH="$PATH:$(go env GOPATH)/bin"
```

### Port already in use

```bash
# Find process using port
lsof -i :4000

# Kill it
kill -9 <PID>

# Or kill all node processes
pkill -f node
```

### Database connection refused

```bash
# Check PostgreSQL is running
brew services list

# Start if not running
brew services start postgresql@15
```

### Stockfish not found

```bash
# Install Stockfish
brew install stockfish

# Find path
which stockfish

# Update .env with correct path
STOCKFISH_PATH="/opt/homebrew/bin/stockfish"
```

### OAuth Errors

**Lichess "site can't be reached":**
- Make sure `LICHESS_CLIENT_ID` is just an app name like `"eloinsight"`, NOT a `lip_` token

**Google "redirect_uri_mismatch":**
- Add `http://localhost:4000/api/v1/auth/google/callback` to Google Console redirect URIs

---

## Environment Variables Summary

### API Gateway

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | - | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | - | Secret for JWT tokens |
| `JWT_REFRESH_SECRET` | ✅ | - | Secret for refresh tokens |
| `JWT_EXPIRES_IN` | ❌ | 1h | JWT token expiration |
| `PORT` | ❌ | 4000 | Server port |
| `FRONTEND_URL` | ❌ | http://localhost:5173 | Frontend URL |
| `LICHESS_CLIENT_ID` | ❌ | - | Any app name for Lichess OAuth |
| `GOOGLE_CLIENT_ID` | ❌ | - | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ❌ | - | Google OAuth client secret |

### Game Sync

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | - | PostgreSQL connection string |
| `PORT` | ❌ | 3002 | Server port |

### Analysis Service

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GRPC_PORT` | ❌ | 50051 | gRPC server port |
| `STOCKFISH_PATH` | ❌ | /usr/local/bin/stockfish | Path to Stockfish |
| `STOCKFISH_THREADS` | ❌ | 4 | CPU threads |

### Frontend

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | ✅ | - | Backend API URL |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     EloInsight Architecture                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────┐                                               │
│   │  Frontend   │  React + Vite + TailwindCSS                   │
│   │  :5173      │  User Interface                               │
│   └──────┬──────┘                                               │
│          │ HTTP (REST API)                                       │
│          ▼                                                       │
│   ┌─────────────┐      gRPC      ┌─────────────┐               │
│   │ API Gateway │ ◄────────────► │  Analysis   │               │
│   │  :4000      │                │  :50051     │               │
│   │  (NestJS)   │                │  (Go+SF)    │               │
│   └──────┬──────┘                └─────────────┘               │
│          │                                                       │
│          │ Prisma ORM                                           │
│          ▼                                                       │
│   ┌─────────────┐      ┌─────────────┐                         │
│   │ PostgreSQL  │      │  Game Sync  │                         │
│   │  :5432      │ ◄────│  :3002      │                         │
│   │  Database   │      │  (NestJS)   │                         │
│   └─────────────┘      └─────────────┘                         │
│                              │                                   │
│                              ▼                                   │
│                        Chess.com API                            │
│                        Lichess API                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | React 18 + TypeScript + TailwindCSS + Vite |
| **API Gateway** | NestJS + Prisma ORM |
| **Analysis Service** | Go + Stockfish + gRPC |
| **Game Sync** | NestJS + Chess.com/Lichess APIs |
| **Database** | PostgreSQL 15+ |
| **Charts** | Recharts |
| **Chess Logic** | chess.js + react-chessboard |
| **Auth** | JWT + Lichess OAuth + Google OAuth |

---

**Need help?** Check the [GitHub Issues](https://github.com/yourusername/EloInsight/issues) or create a new one.
