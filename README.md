# EloInsight ♟️

> **Free, open-source chess game analysis platform powered by Stockfish**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

## 🎯 Vision

EloInsight democratizes chess game analysis by providing a completely free, open-source platform that rivals premium chess analysis tools. We believe every chess player, regardless of their financial situation, deserves access to powerful game analysis tools to improve their skills.

## ✨ Features

### Core Analysis
- 🔗 **Multi-Platform Integration**: Link your Chess.com and Lichess accounts
- 📥 **Automatic Game Sync**: Fetch and analyze all your completed games automatically
- 🤖 **Free Stockfish Analysis**: Powered by the world's strongest open-source chess engine (depth 20)
- 📊 **Comprehensive Metrics**: 
  - Accuracy percentage for both players
  - Average Centipawn Loss (ACPL)
  - Blunders, mistakes, and inaccuracies detection
  - Performance rating calculation ("You played like a XXXX")

### Advanced Analysis Features
- 📈 **Phase Breakdown**: Move quality breakdown by game phase (Opening/Middlegame/Endgame) with visual icons
- 📉 **Evaluation Graph**: Interactive game evaluation chart with click-to-navigate
- 🎯 **Key Moments**: Auto-detected critical positions (blunders, turning points, brilliant moves)
- 📊 **Win Probability**: Real-time win/draw/loss probability bar
- 🔍 **Engine Lines (PV)**: Top engine continuations with evaluations
- 💡 **Suggested Focus Areas**: AI-powered study recommendations based on your mistakes
- ⏱️ **Time Analysis**: Time spent per move with statistics
- 🔗 **Similar Games**: Quick links to explore positions on Lichess/Chess.com

### Interactive Board Features
- 🎮 **Exploration Mode**: Make moves on the board to analyze alternative lines
- ▶️ **Auto-play Mode**: Automatically advance through moves with adjustable speed (0.5s - 3s)
- 🔊 **Move Sounds**: Audio feedback for moves, captures, checks, and blunders
- ⌨️ **Keyboard Shortcuts**: Full keyboard navigation (arrows, space, F, C, M, ?)
- 📋 **Copy FEN**: One-click FEN copying for any position
- 🔄 **Board Flip**: View from either player's perspective

### Game Management
- 🎯 **Manual Analysis**: Analyze any position using FEN notation
- 📈 **Progress Tracking**: Track your improvement over time
- 🔍 **Advanced Filtering**: Filter games by platform, result, time control, analysis status, and date
- 📄 **Pagination**: Efficient browsing of large game collections

### Future Enhancements
- Opening repertoire analysis
- Tactical pattern recognition (pins, forks, skewers)
- Tournament preparation tools
- Social features and game sharing
- Board themes and piece styles

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **TailwindCSS** for utility-first styling
- **Recharts** for evaluation graphs and data visualization
- **React Router v6** for navigation
- **Lucide React** for icons
- **react-chessboard** for interactive chess board
- **chess.js** for move validation and game logic

### Backend Services
- **NestJS** (API Gateway - TypeScript)
- **Go** (Analysis Service with Stockfish integration)
- **NestJS** (Game Sync Service - TypeScript)

### Infrastructure
- **PostgreSQL** - Primary database with Prisma ORM
- **Redis** - Caching and session management
- **Docker** - Containerization
- **Docker Compose** - Local development orchestration

### Communication
- **REST API** - Frontend to API Gateway
- **gRPC** - API Gateway to Analysis Service
- **JWT** - Authentication tokens

## 🏗️ Architecture Overview

EloInsight follows a microservices architecture for scalability and maintainability:

```
┌─────────────────┐
│  React Frontend │
└────────┬────────┘
         │ REST API
         ▼
┌─────────────────┐
│  API Gateway    │
│    (NestJS)     │
└────────┬────────┘
         │ gRPC
    ┌────┴────┬──────────┬──────────┐
    ▼         ▼          ▼          ▼
┌────────┐ ┌──────┐ ┌─────────┐ ┌──────────┐
│  User  │ │ Game │ │Analysis │ │Metadata  │
│Service │ │Sync  │ │ Engine  │ │ Service  │
│(NestJS)│ │(Go)  │ │  (Go)   │ │ (Python) │
└────────┘ └──────┘ └─────────┘ └──────────┘
    │         │          │            │
    └─────────┴──────────┴────────────┘
                     │
              ┌──────┴──────┐
              ▼             ▼
         ┌──────────┐  ┌───────┐
         │PostgreSQL│  │ Redis │
         └──────────┘  └───────┘
```

For detailed architecture documentation, see [docs/architecture.md](docs/architecture.md).

## 🚀 Quick Start

### Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/EloInsight.git
cd EloInsight

# Copy environment file
cp .env.example .env

# Start everything with one command
make dev
```

That's it! 🎉 All services will start with hot reloading enabled.

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API Gateway | http://localhost:4000/api/v1 |
| Swagger Docs | http://localhost:4000/api/docs |
| Game Sync | http://localhost:3002 |

### Common Commands

```bash
make help          # Show all commands
make dev           # Start development stack
make down          # Stop all containers
make logs          # View all logs
make db-migrate    # Run database migrations
make db-seed       # Seed sample data
```

### Manual Setup (Without Docker)

<details>
<summary>Click to expand manual setup instructions</summary>

#### Prerequisites
- **Node.js** >= 18.x
- **Go** >= 1.21
- **PostgreSQL** >= 15
- **Redis** >= 7.0
- **Stockfish** chess engine

#### Steps

1. **Start infrastructure services**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d postgres redis
   ```

2. **Install dependencies and start services**
   
   **Frontend:**
   ```bash
   cd frontend && npm install && npm run dev
   ```
   
   **API Gateway:**
   ```bash
   cd backend/api-gateway && npm install && npm run start:dev
   ```
   
   **Game Sync Service:**
   ```bash
   cd backend/game-sync-service && npm install && npm run start:dev
   ```
   
   **Analysis Engine:**
   ```bash
   cd backend/analysis-service && make build && ./bin/analysis-service
   ```

</details>

For detailed setup instructions, see [docs/local-setup.md](docs/local-setup.md).

## 📚 Documentation

- [Local Development Setup](docs/local-setup.md)
- [Architecture Overview](docs/architecture.md)
- [System Design](docs/system-design.md)
- [Services Documentation](docs/services.md)
- [Tech Stack Details](docs/tech-stack.md)
- [API Design](docs/api-design.md)
- [gRPC Design](docs/grpc-design.md)
- [Database Design](docs/database-design.md)
- [Analysis Engine](docs/analysis-engine.md)
- [Stockfish Integration](docs/stockfish-integration.md)
- [Game Synchronization](docs/game-sync.md)
- [Security](docs/security.md)
- [Deployment Guide](docs/deployment.md)
- [Roadmap](docs/roadmap.md)
- [Contributing](docs/contributing.md)
- [FAQ](docs/faq.md)

## 🤝 Contributing

We welcome contributions from the community! Whether you're fixing bugs, adding features, or improving documentation, your help is appreciated.

Please read our [Contributing Guide](docs/contributing.md) to get started.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Stockfish](https://stockfishchess.org/) - The powerful chess engine that powers our analysis
- [Chess.com](https://www.chess.com/) - For their public API
- [Lichess](https://lichess.org/) - For their excellent open API
- All our contributors and supporters

## 📧 Contact

- **Issues**: [GitHub Issues](https://github.com/yourusername/EloInsight/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/EloInsight/discussions)

---

**Made with ♟️ by chess players, for chess players**
