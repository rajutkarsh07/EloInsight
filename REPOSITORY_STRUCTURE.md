# EloInsight - Repository Structure

## Complete Directory Tree

```
EloInsight/
├── README.md                          # Project overview and quick start
├── CHANGELOG.md                       # Version history and changes
├── LICENSE                            # MIT License
├── SECURITY.md                        # Security policy
├── REPOSITORY_STRUCTURE.md            # This file
├── .gitignore                         # Git ignore rules
├── .env.example                       # Environment variables template
├── docker-compose.yml                 # Docker services configuration
├── Makefile                           # Common development commands
│
├── .github/                           # GitHub specific files
│   ├── workflows/                     # CI/CD workflows
│   │   ├── ci.yml                    # Continuous Integration
│   │   └── deploy.yml                # Deployment workflow
│   ├── ISSUE_TEMPLATE/               # Issue templates
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── PULL_REQUEST_TEMPLATE.md      # PR template
│
├── docs/                              # 📚 Documentation
│   ├── README.md                      # Documentation index
│   ├── local-setup.md                 # Local development setup guide
│   ├── architecture.md                # System architecture overview
│   ├── system-design.md               # Design decisions and patterns
│   ├── services.md                    # Microservices documentation
│   ├── tech-stack.md                  # Technology choices
│   ├── api-design.md                  # REST API specification
│   ├── grpc-design.md                 # gRPC service definitions
│   ├── database-design.md             # Database schema (Prisma)
│   ├── analysis-engine.md             # Analysis engine & metrics
│   ├── stockfish-integration.md       # Stockfish UCI protocol
│   ├── game-sync.md                   # Game synchronization
│   ├── security.md                    # Security best practices
│   ├── deployment.md                  # Deployment guide
│   ├── contributing.md                # Contribution guidelines
│   └── faq.md                         # Frequently asked questions
│
├── frontend/                          # 🎨 React Frontend (Vite + TailwindCSS)
│   ├── public/                        # Static assets
│   │   └── vite.svg
│   ├── src/
│   │   ├── components/               # React components
│   │   │   ├── chess/               # Chess-specific components
│   │   │   │   └── ChessBoardViewer.tsx  # Interactive board
│   │   │   ├── layout/              # Layout components
│   │   │   │   └── MainLayout.tsx   # App shell with sidebar
│   │   │   └── ui/                  # UI primitives
│   │   ├── contexts/                # React context providers
│   │   │   ├── AuthContext.tsx      # Authentication state
│   │   │   └── GamesContext.tsx     # Games cache & state
│   │   ├── pages/                   # Page components (routes)
│   │   │   ├── Login.tsx            # Authentication
│   │   │   ├── Register.tsx         # User registration
│   │   │   ├── Dashboard.tsx        # Overview statistics
│   │   │   ├── GamesList.tsx        # Games table with filters
│   │   │   ├── AnalysisList.tsx     # Analyzed games list
│   │   │   ├── AnalysisViewer.tsx   # Full game analysis ⭐
│   │   │   ├── Settings.tsx         # User settings
│   │   │   └── Profile.tsx          # User profile
│   │   ├── services/                # API service layer
│   │   │   └── apiClient.ts         # Axios with interceptors
│   │   ├── lib/                     # Utility functions
│   │   │   └── utils.ts             # cn() helper
│   │   ├── App.tsx                  # Root component & routes
│   │   ├── main.tsx                 # Entry point
│   │   └── index.css                # TailwindCSS imports
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── Dockerfile
│
├── backend/                           # 🔧 Backend Services
│   │
│   ├── api-gateway/                  # NestJS API Gateway
│   │   ├── src/
│   │   │   ├── auth/                # Authentication module
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   └── jwt.strategy.ts
│   │   │   ├── users/               # User management
│   │   │   │   ├── users.controller.ts
│   │   │   │   └── users.service.ts
│   │   │   ├── games/               # Games module
│   │   │   │   ├── games.controller.ts
│   │   │   │   └── games.service.ts
│   │   │   ├── analysis/            # Analysis module
│   │   │   │   ├── analysis.controller.ts
│   │   │   │   ├── analysis.service.ts
│   │   │   │   └── analysis-grpc.service.ts  # gRPC client
│   │   │   ├── prisma/              # Prisma ORM
│   │   │   │   └── prisma.service.ts
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma        # Database schema
│   │   │   └── migrations/          # Database migrations
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   ├── game-sync-service/            # NestJS Game Sync Service
│   │   ├── src/
│   │   │   ├── sync/                # Sync logic
│   │   │   │   ├── chesscom.service.ts
│   │   │   │   └── lichess.service.ts
│   │   │   ├── prisma/
│   │   │   │   └── prisma.service.ts
│   │   │   └── main.ts
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   ├── analysis-service/             # Go Analysis Engine
│   │   ├── cmd/
│   │   │   └── server/
│   │   │       └── main.go          # Entry point
│   │   ├── internal/
│   │   │   ├── config/
│   │   │   │   └── config.go        # Configuration
│   │   │   ├── evaluation/
│   │   │   │   ├── evaluation.go    # Metrics calculation
│   │   │   │   └── evaluation_test.go
│   │   │   ├── stockfish/
│   │   │   │   ├── pool.go          # Engine pool
│   │   │   │   └── engine.go        # UCI communication
│   │   │   ├── analysis/
│   │   │   │   └── analyzer.go      # Game analysis
│   │   │   └── grpc/
│   │   │       └── server.go        # gRPC server
│   │   ├── proto/
│   │   │   └── analysis.proto       # gRPC definitions
│   │   ├── pkg/
│   │   │   └── pb/                   # Generated protobuf
│   │   ├── go.mod
│   │   ├── go.sum
│   │   ├── Makefile
│   │   └── Dockerfile
│   │
│   └── database/                     # Database utilities
│       ├── README.md
│       └── seeds/                    # Seed data
│
└── monitoring/                        # 📊 Monitoring (Optional)
    ├── prometheus/
    │   └── prometheus.yml
    └── grafana/
        └── dashboards/
```

## Key Features by Component

### Frontend (`/frontend`)

**Analysis Viewer** (`AnalysisViewer.tsx`) - Main feature:
- Interactive chess board with exploration mode
- Phase Breakdown (Opening/Middlegame/Endgame)
- Evaluation graph with click-to-navigate
- Key moments detection
- Win probability visualization
- Engine lines (PV)
- Suggested focus areas
- Auto-play mode with speed control
- Keyboard shortcuts
- Move sounds
- Time analysis
- Copy FEN

**Games List** (`GamesList.tsx`):
- Multi-platform game sync
- Advanced filtering
- Pagination
- One-click analysis

### Backend Services (`/backend`)

**API Gateway** (NestJS - Port 4000):
- JWT authentication
- REST API endpoints
- gRPC client for analysis
- Swagger documentation

**Game Sync Service** (NestJS - Port 3002):
- Chess.com API integration
- Lichess API integration
- PGN parsing

**Analysis Service** (Go - Port 50051):
- Stockfish integration
- Move classification
- Accuracy calculation
- Performance rating
- gRPC server

## Service Ports

| Service | Port | URL |
|---------|------|-----|
| Frontend (Vite) | 5173 | http://localhost:5173 |
| API Gateway | 4000 | http://localhost:4000/api/v1 |
| Swagger Docs | 4000 | http://localhost:4000/api/docs |
| Game Sync | 3002 | http://localhost:3002 |
| Analysis (gRPC) | 50051 | grpc://localhost:50051 |
| PostgreSQL | 5432 | localhost:5432 |

## File Count Summary

- **Documentation**: 15+ markdown files
- **Frontend**: ~30 TypeScript/React files
- **Backend Services**: ~50 Go/TypeScript files
- **Configuration**: ~15 YAML/JSON files
- **Total**: ~120 files (excluding node_modules, build artifacts)

## Quick Start

```bash
# 1. Clone repository
git clone https://github.com/yourusername/EloInsight.git
cd EloInsight

# 2. Start all services
make dev

# Or manually:
# Terminal 1: cd backend/analysis-service && ./bin/analysis-service
# Terminal 2: cd backend/api-gateway && npm run start:dev
# Terminal 3: cd backend/game-sync-service && npm run start:dev
# Terminal 4: cd frontend && npm run dev
```

## Next Steps

1. **Read** [README.md](./README.md) for project overview
2. **Setup** [docs/local-setup.md](./docs/local-setup.md) for local development
3. **Review** [docs/architecture.md](./docs/architecture.md) for system design
4. **Contribute** using [docs/contributing.md](./docs/contributing.md)

---

**Repository**: https://github.com/yourusername/EloInsight  
**License**: MIT  
**Status**: In Development (MVP Phase)
