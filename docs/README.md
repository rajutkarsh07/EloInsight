# EloInsight Documentation

Welcome to the EloInsight documentation. This folder contains all technical documentation for the chess analysis platform.

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
| Frontend | 3000 | http://localhost:3000 |
| API Gateway | 4000 | http://localhost:4000 |
| Game Sync | 3002 | http://localhost:3002 |
| Analysis (gRPC) | 50051 | grpc://localhost:50051 |

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
