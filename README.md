# EloInsight ♟️

> **Free, open-source chess game analysis platform powered by Stockfish**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

## 🎯 Vision

EloInsight democratizes chess game analysis by providing a completely free, open-source platform that rivals premium chess analysis tools. We believe every chess player, regardless of their financial situation, deserves access to powerful game analysis tools to improve their skills.

## ✨ Features

### Current Roadmap
- 🔗 **Multi-Platform Integration**: Link your Chess.com and Lichess accounts
- 📥 **Automatic Game Sync**: Fetch and analyze all your completed games automatically
- 🤖 **Free Stockfish Analysis**: Powered by the world's strongest open-source chess engine
- 📊 **Comprehensive Metrics**: 
  - Accuracy percentage
  - Average Centipawn Loss (ACPL)
  - Blunders, mistakes, and inaccuracies detection
  - Performance rating calculation
- 🎯 **Manual Analysis**: Analyze any position using FEN notation
- 📈 **Progress Tracking**: Track your improvement over time
- 🎨 **Modern UI**: Beautiful, responsive interface built with Material UI

### Future Enhancements
- Opening repertoire analysis
- Tactical pattern recognition
- Personalized improvement suggestions
- Tournament preparation tools
- Social features and game sharing

## 🛠️ Tech Stack

### Frontend
- **React** with TypeScript
- **Material UI** for component library
- **Redux Toolkit** for state management
- **React Query** for data fetching
- **Recharts** for data visualization

### Backend Services
- **NestJS** (API Gateway & User Service)
- **Go** (Stockfish Analysis Engine)
- **Python** (Game Metadata & Statistics)

### Infrastructure
- **PostgreSQL** - Primary database
- **Redis** - Caching and session management
- **RabbitMQ** - Message queue for async analysis
- **Docker** - Containerization
- **Kubernetes** - Orchestration (production)

### Communication
- **REST API** - Frontend to backend
- **gRPC** - Inter-service communication
- **WebSockets** - Real-time analysis updates

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
