# EloInsight Game Sync Service

A NestJS microservice that fetches and synchronizes chess games from Chess.com and Lichess platforms.

## 🎯 Features

- **Multi-Platform Support**: Fetches games from Chess.com and Lichess public APIs
- **Cron-Based Sync**: Automatic periodic synchronization (every 6 hours by default)
- **Deduplication**: Prevents duplicate games using external IDs
- **Rate Limiting**: Respects API rate limits (300/min for Chess.com, 15/sec for Lichess)
- **Retry Logic**: Exponential backoff for failed requests
- **Incremental Sync**: Only fetches new games since last sync

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+ (with EloInsight database schema)
- npm or yarn

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Start the service:**
   ```bash
   # Development
   npm run start:dev

   # Production
   npm run build
   npm run start:prod
   ```

## 📁 Project Structure

```
game-sync-service/
├── src/
│   ├── main.ts                  # Application entry point
│   ├── app.module.ts            # Root module
│   ├── health.controller.ts     # Health check endpoint
│   │
│   ├── prisma/                  # Database layer
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   │
│   ├── common/                  # Shared utilities
│   │   ├── types.ts             # Type definitions
│   │   ├── utils.ts             # Utility functions
│   │   ├── rate-limiter.service.ts
│   │   └── retry.service.ts
│   │
│   ├── chess-com/               # Chess.com integration
│   │   ├── chess-com.module.ts
│   │   └── chess-com.service.ts
│   │
│   ├── lichess/                 # Lichess integration
│   │   ├── lichess.module.ts
│   │   └── lichess.service.ts
│   │
│   └── sync/                    # Sync orchestration
│       ├── sync.module.ts
│       ├── sync.service.ts
│       └── sync.controller.ts
│
├── package.json
├── tsconfig.json
├── nest-cli.json
└── .env.example
```

## 🔌 API Endpoints

### Health Check
```
GET /health
```
Returns service health status and database connectivity.

### Sync User
```
POST /sync/user/:userId
```
Triggers sync for all linked accounts of a user.

### Sync Account
```
POST /sync/account/:accountId
```
Triggers sync for a specific linked account.

### Get Sync Status
```
GET /sync/status/:userId
```
Returns recent sync jobs for a user.

### Trigger Scheduled Sync
```
POST /sync/scheduled
```
Manually triggers the scheduled sync for all users.

## ⚙️ Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3002` | Service port |
| `DATABASE_URL` | - | PostgreSQL connection string |
| `SYNC_CRON` | `0 */6 * * *` | Cron schedule (every 6 hours) |
| `SYNC_DEFAULT_LOOKBACK_MONTHS` | `6` | Default history to fetch |
| `SYNC_MAX_GAMES_PER_FETCH` | `500` | Max games per API request |
| `CHESS_COM_RATE_LIMIT` | `300` | Requests per minute |
| `LICHESS_RATE_LIMIT` | `15` | Requests per second |
| `MAX_RETRIES` | `3` | Max retry attempts |
| `RETRY_DELAY_MS` | `1000` | Initial retry delay |

## 🔄 Sync Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      SYNC FLOW                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────┐     ┌─────────────┐     ┌─────────────┐      │
│   │  Cron    │────▶│   Sync      │────▶│  Get Linked │      │
│   │  Trigger │     │   Service   │     │  Accounts   │      │
│   └──────────┘     └─────────────┘     └─────────────┘      │
│                           │                    │             │
│                           ▼                    ▼             │
│                    ┌─────────────┐      ┌───────────┐       │
│                    │  For Each   │      │  Calculate │       │
│                    │  Account    │◀─────│  Since Date│       │
│                    └─────────────┘      └───────────┘       │
│                           │                                  │
│              ┌────────────┴────────────┐                    │
│              ▼                         ▼                    │
│       ┌─────────────┐           ┌─────────────┐            │
│       │  Chess.com  │           │   Lichess   │            │
│       │   Service   │           │   Service   │            │
│       └─────────────┘           └─────────────┘            │
│              │                         │                    │
│              │    Rate Limiting        │                    │
│              │    Retry Logic          │                    │
│              ▼                         ▼                    │
│       ┌─────────────┐           ┌─────────────┐            │
│       │   Fetch     │           │   Fetch     │            │
│       │   Games     │           │   Games     │            │
│       └─────────────┘           └─────────────┘            │
│              │                         │                    │
│              └────────────┬────────────┘                    │
│                           ▼                                  │
│                    ┌─────────────┐                          │
│                    │  Dedup &    │                          │
│                    │  Save Games │                          │
│                    └─────────────┘                          │
│                           │                                  │
│                           ▼                                  │
│                    ┌─────────────┐                          │
│                    │  Update     │                          │
│                    │  Last Sync  │                          │
│                    └─────────────┘                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Rate Limiting

### Chess.com
- **Limit**: 300 requests per minute
- **Strategy**: Token bucket with Bottleneck
- **Backoff**: Exponential (1s, 2s, 4s...)

### Lichess
- **Limit**: 15 requests per second
- **Strategy**: Token bucket with Bottleneck
- **Backoff**: Exponential (500ms, 1s, 2s...)

## 🔁 Retry Logic

The service implements smart retry with:

1. **Exponential Backoff**: Delay doubles on each retry
2. **Max Retries**: 3 attempts by default
3. **Error Classification**:
   - **Retryable**: 429 (rate limit), 5xx (server errors), timeouts
   - **Non-Retryable**: 400, 401, 403, 404

## 🧪 Testing

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov
```

## 📝 License

MIT License - See [LICENSE](../../LICENSE) for details.
