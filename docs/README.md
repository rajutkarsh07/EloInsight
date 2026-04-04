# EloInsight Documentation

Welcome to the EloInsight documentation. This folder contains all technical documentation for the chess analysis, training, and improvement platform.

## 📚 Documentation Index

### Architecture & Design
| Document | Description |
|----------|-------------|
| [Architecture](./architecture.md) | System architecture overview |
| [System Design](./system-design.md) | Detailed system design decisions |
| [Services](./services.md) | Microservices overview |
| [Tech Stack](./tech-stack.md) | Technologies used |

### API & Protocols
| Document | Description |
|----------|-------------|
| [API Design](./api-design.md) | REST API specifications |
| [gRPC Design](./grpc-design.md) | gRPC service definitions |

### Database & Storage
| Document | Description |
|----------|-------------|
| [Database Design](./database-design.md) | PostgreSQL schema & Prisma ORM |

### Core Features
| Document | Description |
|----------|-------------|
| [Game Sync](./game-sync.md) | Chess.com & Lichess integration |
| [Stockfish Integration](./stockfish-integration.md) | Chess engine integration |
| [Analysis Engine](./analysis-engine.md) | Analysis metrics & algorithms |

### Operations
| Document | Description |
|----------|-------------|
| [Deployment](./deployment.md) | Deployment guides |
| [Security](./security.md) | Security practices |

### Contributing
| Document | Description |
|----------|-------------|
| [Contributing](./contributing.md) | Contribution guidelines |
| [Roadmap](./roadmap.md) | Project roadmap |
| [FAQ](./faq.md) | Frequently asked questions |

## 🚀 Quick Links

### Getting Started
```bash
# Clone repository
git clone https://github.com/eloinsight/eloinsight.git
cd eloinsight

# Start frontend
cd frontend && npm install && npm run dev

# Start API Gateway
cd backend/api-gateway && npm install && npm run start:dev

# Start Game Sync Service
cd backend/game-sync-service && npm install && npm run start:dev

# Start Analysis Service (requires Stockfish)
cd backend/analysis-service && make build && ./bin/analysis-service
```

### Service Ports
| Service | Port | URL |
|---------|------|-----|
| Frontend (Vite) | 13000 | http://localhost:13000 |
| Admin Panel | 13001 | http://localhost:13001 |
| API Gateway | 14000 | http://localhost:14000/api/v1 |
| Swagger Docs | 14000 | http://localhost:14000/api/docs |
| Game Sync | 14002 | http://localhost:14002 |
| Analysis (gRPC) | 50051 | grpc://localhost:50051 |

## ✨ Key Features

### Analysis Viewer
- **Phase Breakdown**: Move quality breakdown by Opening/Middlegame/Endgame with visual icons
- **Evaluation Graph**: Interactive chart with click-to-navigate
- **Key Moments**: Auto-detected blunders, turning points, brilliant moves
- **Win Probability**: Real-time win/draw/loss probability bar
- **Engine Lines**: Top engine continuations (PV)
- **Suggested Focus Areas**: AI-powered study recommendations
- **Auto-play Mode**: Advance through moves automatically (adjustable speed)
- **Keyboard Shortcuts**: Full navigation with hotkeys (arrows, space, F, C, M, ?)
- **Exploration Mode**: Make moves to analyze alternative lines
- **Move Sounds**: Audio feedback for moves, captures, checks
- **Time Analysis**: Time spent per move statistics
- **Similar Games**: Quick links to Lichess/Chess.com position explorers

### Game Management
- **Multi-platform Sync**: Import from Chess.com and Lichess
- **Advanced Filtering**: Platform, result, time control, analysis status, date
- **Pagination**: Efficient browsing of large game collections
- **Concurrent Analysis**: Up to 3 simultaneous analyses

### Training & Improvement
- **Chess Puzzles**: Interactive tactical puzzle trainer with Lichess database import (streaming 1 GB+ CSV files)
  - Practice mode (unlimited retries, hints) and Challenge mode (one mistake = fail, timer)
  - Filter by rating, themes (fork, pin, skewer, mate-in-N, etc.), and difficulty
  - Streak tracking and session statistics
- **Memory Training**: Board visualization training — memorize and recreate random piece positions
  - Configurable piece count, timer, color filter, and difficulty mode (Normal / Hard)
  - Drag-and-drop or click-to-place recall with per-square accuracy feedback

### Admin Panel
- **Dashboard**: Real-time stats and activity overview
- **User Management**: CRUD, soft-delete, restore
- **Game & Analysis Management**: View, edit, requeue analysis, fix data
- **Sync & Analysis Jobs**: Monitor, cancel, retry
- **Statistics**: Per-user and opening statistics with recalculation

## 📁 Documentation Structure

```
docs/
├── README.md              # This file
├── architecture.md        # System architecture
├── system-design.md       # Design decisions
├── services.md            # Services overview
├── tech-stack.md          # Technology stack
├── api-design.md          # REST API specs
├── grpc-design.md         # gRPC definitions
├── database-design.md     # Database schema
├── game-sync.md           # Game synchronization
├── stockfish-integration.md # Stockfish integration
├── analysis-engine.md     # Analysis algorithms
├── deployment.md          # Deployment guides
├── security.md            # Security practices
├── contributing.md        # Contribution guide
├── roadmap.md             # Project roadmap
└── faq.md                 # FAQ
```

---

**Repository**: [github.com/eloinsight/eloinsight](https://github.com/eloinsight/eloinsight)
