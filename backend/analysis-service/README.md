# EloInsight Analysis Service

Go gRPC service for chess analysis using Stockfish.

## Quick Start

```bash
# Install Stockfish
brew install stockfish  # macOS
# or: sudo apt install stockfish  # Ubuntu

# Configure environment
cp .env.example .env

# Build
make build

# Run
./bin/analysis-service
```

## gRPC API

| Method | Description |
|--------|-------------|
| `AnalyzePosition` | Analyze single FEN |
| `AnalyzePositionStream` | Stream analysis depths |
| `AnalyzeGame` | Full game analysis |
| `AnalyzeGameStream` | Stream game progress |
| `GetBestMoves` | MultiPV best moves |
| `HealthCheck` | Service health |

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `GRPC_PORT` | `50051` | gRPC port |
| `WORKER_POOL_SIZE` | `4` | Engine count |
| `DEFAULT_DEPTH` | `20` | Analysis depth |
| `STOCKFISH_PATH` | `/usr/local/bin/stockfish` | Binary path |

## Documentation

See the main documentation:
- [Stockfish Integration](../../docs/stockfish-integration.md)
- [Analysis Engine](../../docs/analysis-engine.md)
- [gRPC Design](../../docs/grpc-design.md)
