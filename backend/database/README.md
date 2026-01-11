# EloInsight Database

PostgreSQL database layer using Prisma ORM for the EloInsight chess analysis platform.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+  
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

3. **Generate Prisma Client:**
   ```bash
   npm run db:generate
   ```

4. **Run migrations:**
   ```bash
   npm run db:migrate
   ```

5. **Seed the database:**
   ```bash
   npm run db:seed
   ```

## 📁 Project Structure

```
backend/database/
├── prisma/
│   ├── schema.prisma    # Database schema definition
│   ├── seed.ts          # Database seeding script
│   └── migrations/      # Generated migration files
├── src/
│   ├── index.ts         # Main exports
│   └── client.ts        # Prisma client singleton
├── package.json
├── tsconfig.json
└── .env.example
```

## 📜 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:push` | Push schema to database (dev only) |
| `npm run db:migrate` | Create and run migrations |
| `npm run db:migrate:prod` | Deploy migrations to production |
| `npm run db:seed` | Seed database with sample data |
| `npm run db:reset` | Reset database and re-seed |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm run db:format` | Format schema file |
| `npm run build` | Build TypeScript |

## 📊 Schema Overview

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           USERS DOMAIN                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌────────┐    ┌──────────────┐    ┌──────────────┐                │
│   │  User  │───▶│ UserProfile  │    │ UserSettings │                │
│   └────────┘    └──────────────┘    └──────────────┘                │
│       │                                                              │
│       ├─────────────────────────────────────────────┐               │
│       ▼                                             ▼               │
│   ┌───────────────┐                          ┌──────────────┐       │
│   │ LinkedAccount │                          │   SyncJob    │       │
│   └───────────────┘                          └──────────────┘       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                           GAMES DOMAIN                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   User ─────────▶ ┌────────┐ ◀──────── ┌─────────────┐              │
│                   │  Game  │           │ AnalysisJob │              │
│                   └────────┘           └─────────────┘              │
│                       │                                              │
│           ┌───────────┴───────────┐                                 │
│           ▼                       ▼                                 │
│       ┌────────┐             ┌──────────┐                           │
│       │  Move  │             │ Analysis │                           │
│       └────────┘             └──────────┘                           │
│           │                       │                                 │
│           ▼                       ▼                                 │
│   ┌────────────────┐    ┌──────────────────┐                        │
│   │ MoveEvaluation │    │ PositionAnalysis │                        │
│   └────────────────┘    └──────────────────┘                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        STATISTICS DOMAIN                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   User ─────────▶ ┌─────────────────┐                               │
│                   │ UserStatistics  │  (daily, weekly, monthly...)  │
│                   └─────────────────┘                               │
│                                                                      │
│   User ─────────▶ ┌─────────────────────┐                           │
│                   │ OpeningStatistics   │  (per ECO code)           │
│                   └─────────────────────┘                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Core Models

| Model | Description |
|-------|-------------|
| `User` | User accounts with authentication |
| `UserProfile` | Extended user information |
| `UserSettings` | User preferences |
| `LinkedAccount` | Chess.com/Lichess connections |
| `Game` | Chess games with PGN |
| `Move` | Individual moves in games |
| `Analysis` | Game-level analysis results |
| `PositionAnalysis` | Per-move analysis |
| `MoveEvaluation` | Move classifications |
| `UserStatistics` | Aggregated user stats |
| `OpeningStatistics` | Opening-specific stats |
| `SyncJob` | Game synchronization jobs |
| `AnalysisJob` | Analysis queue jobs |

## 🔧 Usage

### Importing the Client

```typescript
import { prisma, db } from '@eloinsight/database';

// Using the Prisma client directly
const users = await prisma.user.findMany({
  include: {
    profile: true,
    linkedAccounts: true,
  },
});

// Using the DatabaseClient wrapper
await db.connect();
const isHealthy = await db.healthCheck();

// Transactions
const result = await db.transaction(async (tx) => {
  const user = await tx.user.create({ ... });
  const settings = await tx.userSettings.create({ ... });
  return { user, settings };
});
```

### Type-Safe Queries

```typescript
import { 
  prisma, 
  User, 
  Game, 
  Platform, 
  TimeClass 
} from '@eloinsight/database';

// Create a user with profile
const user: User = await prisma.user.create({
  data: {
    email: 'player@chess.com',
    username: 'chessmaster',
    passwordHash: 'hashed_password',
    profile: {
      create: {
        firstName: 'Magnus',
        lastName: 'Carlsen',
        country: 'NO',
      },
    },
    settings: {
      create: {
        theme: 'DARK',
        analysisDepth: 25,
      },
    },
  },
  include: {
    profile: true,
    settings: true,
  },
});

// Query games with filters
const games: Game[] = await prisma.game.findMany({
  where: {
    userId: user.id,
    platform: Platform.CHESS_COM,
    timeClass: TimeClass.BLITZ,
    playedAt: {
      gte: new Date('2026-01-01'),
    },
  },
  orderBy: {
    playedAt: 'desc',
  },
  take: 10,
});
```

## 🔒 Security

- Password hashing using bcrypt
- Soft deletes for data integrity
- Row-level security considerations
- UUID primary keys

## 📈 Performance

### Indexes

The schema includes optimized indexes for:
- User lookups (email, username)
- Game queries (user + date)
- Analysis status filtering
- Statistics aggregation

### Best Practices

- Use `select` to limit returned fields
- Use `include` sparingly for relations
- Paginate large result sets
- Use `findFirst` when expecting single results
- Batch operations with `createMany`

## 🧪 Testing

For testing, use a separate test database:

```bash
DATABASE_URL="postgresql://localhost/eloinsight_test" npm test
```

## 📝 License

MIT License - See [LICENSE](../../LICENSE) for details.
