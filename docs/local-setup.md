# Local Development Setup

Complete guide to running EloInsight locally **without Docker** (native development).

---

## What You'll Get

Once setup is complete, you'll have access to:

- **Analysis Viewer** with Phase Breakdown, Evaluation Graph, Key Moments
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

## Quick Start (All Commands)

Run these commands in order from the project root:

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/EloInsight.git
cd EloInsight

# 2. Start PostgreSQL (if not running)
brew services start postgresql@15

# 3. Create database
createdb eloinsight

# 4. Setup API Gateway
cd backend/api-gateway
npm install
cp .env.example .env   # Then edit .env with your values
npx prisma generate
npx prisma migrate dev
cd ../..

# 5. Setup Game Sync Service
cd backend/game-sync-service
npm install
cp .env.example .env   # Then edit .env with your values
npx prisma generate
cd ../..

# 6. Setup Analysis Service (Go)
cd backend/analysis-service
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
export PATH="$PATH:$(go env GOPATH)/bin"
make proto
go mod tidy
go build -o bin/analysis-service ./cmd/server
cd ../..

# 7. Setup Frontend
cd frontend
npm install
cd ..
```

---

## Detailed Setup

### Step 1: Database Setup

```bash
# Start PostgreSQL
brew services start postgresql@15

# Create database
createdb eloinsight

# Verify connection
psql -d eloinsight -c "SELECT version();"
```

---

### Step 2: API Gateway Setup

```bash
cd backend/api-gateway
npm install
```

Create `.env` file:

```bash
# backend/api-gateway/.env

# Database
DATABASE_URL="postgresql://localhost:5432/eloinsight?schema=public"

# JWT Authentication
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="1h"

# Server
PORT=4000
API_PREFIX="api/v1"
CORS_ORIGIN="http://localhost:5173"

# Analysis Service (gRPC)
ANALYSIS_SERVICE_URL="localhost:50051"

# Lichess OAuth (optional - for account verification)
# Get credentials at: https://lichess.org/account/oauth/app
# Set redirect URI to: http://localhost:4000/api/v1/auth/lichess/callback
LICHESS_CLIENT_ID="your-lichess-client-id"
FRONTEND_URL="http://localhost:5173"

# Node environment
NODE_ENV="development"
```

Run migrations:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

Start the service:

```bash
npm run start:dev
```

The API Gateway will be available at: `http://localhost:4000/api/v1`  
Swagger docs: `http://localhost:4000/api/docs`

---

### Step 3: Game Sync Service Setup

```bash
cd backend/game-sync-service
npm install
```

Create `.env` file:

```bash
# backend/game-sync-service/.env

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

Generate Prisma client:

```bash
npx prisma generate
```

Start the service:

```bash
npm run start:dev
```

The Game Sync Service will be available at: `http://localhost:3002`

---

### Step 4: Analysis Service Setup (Go)

```bash
cd backend/analysis-service
```

#### Install Go gRPC tools:

```bash
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
```

#### Add Go bin to PATH:

For **zsh** (default on Mac):
```bash
echo 'export PATH="$PATH:$(go env GOPATH)/bin"' >> ~/.zshrc
source ~/.zshrc
```

For **bash**:
```bash
echo 'export PATH="$PATH:$(go env GOPATH)/bin"' >> ~/.bashrc
source ~/.bashrc
```

#### Verify tools installed:

```bash
which protoc-gen-go
which protoc-gen-go-grpc
```

#### Generate proto files and build:

```bash
make proto
go mod tidy
go build -o bin/analysis-service ./cmd/server
```

Create `.env` file (optional - defaults work fine):

```bash
# backend/analysis-service/.env

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

Start the service:

```bash
./bin/analysis-service
```

The Analysis Service will be available at: `grpc://localhost:50051`

---

### Step 5: Frontend Setup

```bash
cd frontend
npm install
```

Create `.env` file:

```bash
# frontend/.env

VITE_API_URL="http://localhost:4000/api/v1"
```

Start the frontend:

```bash
npm run dev
```

The frontend will be available at: `http://localhost:5173`

---

## Running All Services

Open **5 terminal windows** and run:

| Terminal | Directory | Command |
|----------|-----------|---------|
| 1 | `backend/analysis-service` | `./bin/analysis-service` |
| 2 | `backend/api-gateway` | `npm run start:dev` |
| 3 | `backend/game-sync-service` | `npm run start:dev` |
| 4 | `frontend` | `npm run dev` |
| 5 | (optional) | Database tools / logs |

---

## Service URLs

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:5173 | React web app |
| API Gateway | http://localhost:4000/api/v1 | REST API |
| Swagger Docs | http://localhost:4000/api/docs | API documentation |
| Game Sync | http://localhost:3002 | Game sync service |
| Analysis | grpc://localhost:50051 | gRPC analysis |
| PostgreSQL | localhost:5432 | Database |

---

## Create a Test User

After all services are running:

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

Then login at `http://localhost:5173` with:
- Email: `test@example.com`
- Password: `password123`

---

## Using the Analysis Viewer

After analyzing a game, you'll have access to powerful features:

### Keyboard Shortcuts

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

### Features Available

- **Phase Breakdown**: See move quality by Opening/Middlegame/Endgame with visual icons
- **Evaluation Graph**: Click any point to jump to that position
- **Auto-play**: Automatically advance through moves (adjust speed with dropdown)
- **Exploration Mode**: Click pieces to analyze alternative lines
- **Key Moments**: Auto-detected blunders, turning points, and brilliant moves
- **Suggested Focus Areas**: AI recommendations based on your mistakes

---

## Troubleshooting

### `protoc-gen-go: program not found`

```bash
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
export PATH="$PATH:$(go env GOPATH)/bin"
```

### `Port already in use`

```bash
# Find process using port
lsof -i :4000

# Kill it
kill -9 <PID>
```

### `Database connection refused`

```bash
# Check PostgreSQL is running
brew services list

# Start if not running
brew services start postgresql@15
```

### `Stockfish not found`

```bash
# Install Stockfish
brew install stockfish

# Find path
which stockfish

# Update .env with correct path
STOCKFISH_PATH="/opt/homebrew/bin/stockfish"
```

### Prisma migration errors

```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Re-run migrations
npx prisma migrate dev
```

### `EADDRINUSE: address already in use`

```bash
# Find and kill process on specific port
lsof -i :4000
kill -9 <PID>

# Or kill all node processes
pkill -f node
```

### Go module errors

```bash
cd backend/analysis-service
go mod tidy
go mod download
```

---

## Environment Variables Summary

### API Gateway (`backend/api-gateway/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | - | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | - | Secret for JWT tokens |
| `JWT_EXPIRES_IN` | ❌ | 1h | JWT token expiration |
| `PORT` | ❌ | 4000 | Server port |
| `API_PREFIX` | ❌ | api/v1 | API route prefix |
| `CORS_ORIGIN` | ❌ | http://localhost:5173 | Allowed CORS origins |
| `ANALYSIS_SERVICE_URL` | ❌ | localhost:50051 | gRPC analysis service |
| `LICHESS_CLIENT_ID` | ❌ | - | Lichess OAuth client ID |
| `FRONTEND_URL` | ❌ | http://localhost:5173 | Frontend URL for OAuth redirect |
| `NODE_ENV` | ❌ | development | Environment mode |

### Game Sync (`backend/game-sync-service/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | - | PostgreSQL connection string |
| `PORT` | ❌ | 3002 | Server port |
| `CORS_ORIGIN` | ❌ | * | Allowed CORS origins |
| `SYNC_CRON` | ❌ | 0 */6 * * * | Cron schedule for auto-sync |
| `NODE_ENV` | ❌ | development | Environment mode |

### Analysis Service (`backend/analysis-service/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GRPC_PORT` | ❌ | 50051 | gRPC server port |
| `STOCKFISH_PATH` | ❌ | /usr/local/bin/stockfish | Path to Stockfish binary |
| `STOCKFISH_THREADS` | ❌ | 4 | CPU threads for engine |
| `STOCKFISH_HASH` | ❌ | 2048 | Hash table size (MB) |
| `DEFAULT_DEPTH` | ❌ | 20 | Default analysis depth |
| `MAX_DEPTH` | ❌ | 30 | Maximum analysis depth |
| `WORKER_POOL_SIZE` | ❌ | 4 | Number of worker threads |
| `LOG_LEVEL` | ❌ | info | Logging level |

### Frontend (`frontend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | ✅ | - | Backend API URL |

---

## Development Tips

### Hot Reloading

- **Frontend**: Changes auto-reload (Vite HMR)
- **API Gateway**: Changes auto-reload (`npm run start:dev` uses nodemon)
- **Game Sync**: Changes auto-reload (`npm run start:dev` uses nodemon)
- **Analysis Service**: Requires rebuild (`go build` and restart)

### Database GUI

```bash
cd backend/api-gateway
npx prisma studio
# Opens at http://localhost:5555
```

### View Logs

All services output logs to their terminal windows. For more verbose logging:

```bash
# API Gateway / Game Sync
LOG_LEVEL=debug npm run start:dev

# Analysis Service
LOG_LEVEL=debug ./bin/analysis-service
```

### Testing gRPC Analysis Service

```bash
# Install grpcurl
brew install grpcurl

# List services
grpcurl -plaintext localhost:50051 list

# Test health
grpcurl -plaintext localhost:50051 grpc.health.v1.Health/Check
```

---

## Architecture Overview

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

## Tech Stack Summary

| Component | Technology |
|-----------|------------|
| **Frontend** | React 18 + TypeScript + TailwindCSS + Vite |
| **API Gateway** | NestJS + Prisma ORM |
| **Analysis Service** | Go + Stockfish + gRPC |
| **Game Sync** | NestJS + Chess.com/Lichess APIs |
| **Database** | PostgreSQL 15+ |
| **Charts** | Recharts |
| **Chess Logic** | chess.js + react-chessboard |

---

**Need help?** Check the [GitHub Issues](https://github.com/yourusername/EloInsight/issues) or create a new one.
