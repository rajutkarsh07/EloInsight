# EloInsight - Repository Structure

## Complete Directory Tree

```
EloInsight/
├── README.md                          # Project overview and quick start
├── LICENSE                            # MIT License
├── .gitignore                         # Git ignore rules
├── .env.example                       # Environment variables template
├── docker-compose.yml                 # Docker services configuration
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
│   ├── architecture.md                # System architecture overview
│   ├── system-design.md               # Design decisions and patterns
│   ├── services.md                    # Microservices documentation
│   ├── tech-stack.md                  # Technology choices
│   ├── api-design.md                  # REST API specification
│   ├── grpc-design.md                 # gRPC service definitions
│   ├── database-design.md             # Database schema and design
│   ├── analysis-engine.md             # Analysis engine details
│   ├── stockfish-integration.md       # Stockfish UCI protocol
│   ├── game-sync.md                   # Game synchronization
│   ├── security.md                    # Security best practices
│   ├── deployment.md                  # Deployment guide
│   ├── roadmap.md                     # Feature roadmap
│   ├── contributing.md                # Contribution guidelines
│   └── faq.md                         # Frequently asked questions
│
├── frontend/                          # 🎨 React Frontend
│   ├── public/
│   │   ├── index.html
│   │   ├── favicon.ico
│   │   └── assets/
│   ├── src/
│   │   ├── components/               # React components
│   │   │   ├── common/              # Reusable components
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   └── Modal.tsx
│   │   │   ├── chess/               # Chess-specific components
│   │   │   │   ├── ChessBoard.tsx
│   │   │   │   ├── MoveList.tsx
│   │   │   │   └── PositionAnalysis.tsx
│   │   │   ├── analysis/            # Analysis components
│   │   │   │   ├── AnalysisPanel.tsx
│   │   │   │   ├── MetricsCard.tsx
│   │   │   │   ├── EvaluationGraph.tsx
│   │   │   │   └── MoveClassification.tsx
│   │   │   └── layout/              # Layout components
│   │   │       ├── Header.tsx
│   │   │       ├── Sidebar.tsx
│   │   │       └── Footer.tsx
│   │   ├── pages/                   # Page components
│   │   │   ├── Home.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Games.tsx
│   │   │   ├── GameDetail.tsx
│   │   │   ├── Analysis.tsx
│   │   │   ├── Statistics.tsx
│   │   │   ├── Settings.tsx
│   │   │   └── Profile.tsx
│   │   ├── store/                   # Redux store
│   │   │   ├── index.ts
│   │   │   ├── slices/
│   │   │   │   ├── authSlice.ts
│   │   │   │   ├── gamesSlice.ts
│   │   │   │   ├── analysisSlice.ts
│   │   │   │   └── statsSlice.ts
│   │   │   └── hooks.ts
│   │   ├── services/                # API clients
│   │   │   ├── api.ts
│   │   │   ├── authService.ts
│   │   │   ├── gamesService.ts
│   │   │   ├── analysisService.ts
│   │   │   └── statsService.ts
│   │   ├── hooks/                   # Custom hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useGames.ts
│   │   │   ├── useAnalysis.ts
│   │   │   └── useWebSocket.ts
│   │   ├── utils/                   # Utility functions
│   │   │   ├── chess.ts
│   │   │   ├── format.ts
│   │   │   └── validation.ts
│   │   ├── types/                   # TypeScript types
│   │   │   ├── game.ts
│   │   │   ├── analysis.ts
│   │   │   ├── user.ts
│   │   │   └── api.ts
│   │   ├── styles/                  # Global styles
│   │   │   ├── index.css
│   │   │   └── theme.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── Dockerfile
│
├── services/                          # 🔧 Backend Services
│   │
│   ├── api-gateway/                  # NestJS API Gateway
│   │   ├── src/
│   │   │   ├── auth/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   └── guards/
│   │   │   ├── users/
│   │   │   │   ├── users.controller.ts
│   │   │   │   ├── users.service.ts
│   │   │   │   └── dto/
│   │   │   ├── games/
│   │   │   │   ├── games.controller.ts
│   │   │   │   ├── games.service.ts
│   │   │   │   └── dto/
│   │   │   ├── analysis/
│   │   │   │   ├── analysis.controller.ts
│   │   │   │   ├── analysis.service.ts
│   │   │   │   └── dto/
│   │   │   ├── stats/
│   │   │   │   ├── stats.controller.ts
│   │   │   │   └── stats.service.ts
│   │   │   ├── common/
│   │   │   │   ├── filters/
│   │   │   │   ├── interceptors/
│   │   │   │   ├── guards/
│   │   │   │   └── decorators/
│   │   │   ├── config/
│   │   │   │   └── configuration.ts
│   │   │   ├── database/
│   │   │   │   ├── migrations/
│   │   │   │   └── entities/
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   ├── test/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   └── Dockerfile
│   │
│   ├── user-service/                 # NestJS User Service
│   │   ├── src/
│   │   │   ├── users/
│   │   │   ├── profiles/
│   │   │   ├── linked-accounts/
│   │   │   ├── settings/
│   │   │   ├── database/
│   │   │   ├── grpc/
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   ├── game-sync-service/            # Go Game Sync Service
│   │   ├── cmd/
│   │   │   └── server/
│   │   │       └── main.go
│   │   ├── internal/
│   │   │   ├── api/
│   │   │   │   ├── chesscom.go
│   │   │   │   └── lichess.go
│   │   │   ├── parser/
│   │   │   │   └── pgn.go
│   │   │   ├── storage/
│   │   │   │   └── postgres.go
│   │   │   ├── sync/
│   │   │   │   ├── sync.go
│   │   │   │   └── dedup.go
│   │   │   ├── queue/
│   │   │   │   └── rabbitmq.go
│   │   │   └── grpc/
│   │   │       └── server.go
│   │   ├── pkg/
│   │   │   └── models/
│   │   │       └── game.go
│   │   ├── proto/
│   │   │   └── game_sync.proto
│   │   ├── go.mod
│   │   ├── go.sum
│   │   └── Dockerfile
│   │
│   ├── analysis-engine/              # Go Analysis Engine
│   │   ├── cmd/
│   │   │   └── server/
│   │   │       └── main.go
│   │   ├── internal/
│   │   │   ├── stockfish/
│   │   │   │   ├── pool.go
│   │   │   │   ├── engine.go
│   │   │   │   └── uci.go
│   │   │   ├── analyzer/
│   │   │   │   ├── position.go
│   │   │   │   ├── metrics.go
│   │   │   │   └── accuracy.go
│   │   │   ├── queue/
│   │   │   │   ├── consumer.go
│   │   │   │   └── publisher.go
│   │   │   ├── storage/
│   │   │   │   └── postgres.go
│   │   │   ├── cache/
│   │   │   │   └── redis.go
│   │   │   └── grpc/
│   │   │       └── server.go
│   │   ├── pkg/
│   │   │   └── models/
│   │   │       └── analysis.go
│   │   ├── proto/
│   │   │   └── analysis.proto
│   │   ├── go.mod
│   │   ├── go.sum
│   │   └── Dockerfile
│   │
│   └── metadata-service/             # Python Metadata Service
│       ├── src/
│       │   ├── api/
│       │   │   ├── routes.py
│       │   │   └── models.py
│       │   ├── services/
│       │   │   ├── statistics.py
│       │   │   ├── patterns.py
│       │   │   └── insights.py
│       │   ├── db/
│       │   │   └── postgres.py
│       │   ├── grpc/
│       │   │   └── server.py
│       │   └── main.py
│       ├── proto/
│       │   └── metadata.proto
│       ├── requirements.txt
│       ├── Dockerfile
│       └── pyproject.toml
│
├── proto/                             # 📡 Protocol Buffers
│   ├── common/
│   │   ├── pagination.proto
│   │   └── timestamp.proto
│   ├── user/
│   │   └── user.proto
│   ├── game/
│   │   ├── game.proto
│   │   └── sync.proto
│   ├── analysis/
│   │   └── analysis.proto
│   └── metadata/
│       └── metadata.proto
│
├── scripts/                           # 🔨 Utility Scripts
│   ├── setup.sh                      # Initial setup script
│   ├── migrate.sh                    # Database migration
│   ├── seed.sh                       # Database seeding
│   ├── test.sh                       # Run all tests
│   ├── build.sh                      # Build all services
│   └── deploy.sh                     # Deployment script
│
├── k8s/                              # ☸️ Kubernetes Manifests
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secrets.yaml
│   ├── postgres/
│   │   ├── statefulset.yaml
│   │   └── service.yaml
│   ├── redis/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   ├── rabbitmq/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   ├── api-gateway/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   ├── analysis-engine/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   ├── metadata-service/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   ├── frontend/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   └── ingress.yaml
│
└── monitoring/                        # 📊 Monitoring Configuration
    ├── prometheus/
    │   └── prometheus.yml
    ├── grafana/
    │   └── dashboards/
    └── alertmanager/
        └── config.yml
```

## File Count Summary

- **Documentation**: 15 markdown files
- **Frontend**: ~50 TypeScript/React files
- **Backend Services**: ~100 Go/TypeScript/Python files
- **Configuration**: ~20 YAML/JSON files
- **Total**: ~200 files (excluding node_modules, build artifacts)

## Key Directories

### `/docs` - Documentation
Complete technical documentation covering architecture, design, APIs, deployment, and contribution guidelines.

### `/frontend` - React Application
Modern React application with TypeScript, Material UI, Redux Toolkit, and React Query.

### `/services` - Microservices
- **api-gateway**: NestJS-based API gateway
- **user-service**: User management service
- **game-sync-service**: Go service for fetching games
- **analysis-engine**: Go service with Stockfish integration
- **metadata-service**: Python service for statistics

### `/proto` - Protocol Buffers
gRPC service definitions for inter-service communication.

### `/k8s` - Kubernetes
Production-ready Kubernetes manifests for deployment.

## Next Steps

1. **Read** [README.md](../README.md) for project overview
2. **Review** [docs/architecture.md](architecture.md) for system design
3. **Follow** [docs/deployment.md](deployment.md) for setup
4. **Contribute** using [docs/contributing.md](contributing.md)

---

**Repository**: https://github.com/yourusername/EloInsight  
**License**: MIT  
**Status**: In Development (MVP Phase)
