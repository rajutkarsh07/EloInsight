# EloInsight Game Sync Service

NestJS microservice for fetching games from Chess.com and Lichess.

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Development
npm run start:dev

# Production
npm run build && npm run start:prod
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/sync/user/:userId` | Sync user's games |
| `GET` | `/sync/status/:userId` | Get sync status |
| `POST` | `/sync/scheduled` | Trigger scheduled sync |

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3002` | Service port |
| `SYNC_CRON` | `0 */6 * * *` | Sync schedule |
| `CHESS_COM_RATE_LIMIT` | `300` | Req/min |
| `LICHESS_RATE_LIMIT` | `15` | Req/sec |

## Documentation

See [Game Sync Documentation](../../docs/game-sync.md) for:
- Platform integration details
- Rate limiting strategy
- Sync flow diagrams
- Error handling
