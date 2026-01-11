# Database Design

## Table of Contents
- [Overview](#overview)
- [Schema Design](#schema-design)
- [Indexing Strategy](#indexing-strategy)
- [Data Relationships](#data-relationships)
- [Migrations](#migrations)
- [Performance Optimization](#performance-optimization)

## Overview

EloInsight uses **PostgreSQL 15+** as the primary database for its ACID compliance, JSON support, and robust feature set.

### Design Principles
- **Normalization**: 3NF for most tables
- **Denormalization**: Strategic denormalization for performance
- **Soft Deletes**: Preserve data integrity
- **Audit Trails**: Track changes with timestamps
- **UUID Primary Keys**: Distributed system friendly

## Prisma ORM Implementation

EloInsight uses **Prisma ORM** for type-safe database access with PostgreSQL.

### Location
```
backend/database/
├── prisma/
│   ├── schema.prisma    # Database schema definition
│   ├── seed.ts          # Database seeding script
│   └── migrations/      # Auto-generated migrations
├── src/
│   ├── index.ts         # Main exports
│   └── client.ts        # Prisma client singleton
├── package.json
└── .env.example
```

### Quick Setup
```bash
cd backend/database
npm install
cp .env.example .env
# Edit .env with your DATABASE_URL
npm run db:generate
npm run db:migrate
npm run db:seed
```

### Available Scripts
| Script | Description |
|--------|-------------|
| `db:generate` | Generate Prisma Client types |
| `db:migrate` | Run database migrations |
| `db:seed` | Seed with sample data |
| `db:studio` | Open Prisma Studio GUI |
| `db:reset` | Reset and reseed database |

### Usage Example
```typescript
import { prisma, User, Game, Platform } from '@eloinsight/database';

// Create user with relations
const user = await prisma.user.create({
  data: {
    email: 'player@chess.com',
    username: 'chessmaster',
    passwordHash: 'hashed',
    profile: { create: { firstName: 'Magnus', country: 'NO' } },
    settings: { create: { theme: 'DARK', analysisDepth: 25 } },
  },
  include: { profile: true, settings: true },
});

// Query games with filters
const games = await prisma.game.findMany({
  where: {
    userId: user.id,
    platform: Platform.CHESS_COM,
    playedAt: { gte: new Date('2026-01-01') },
  },
  orderBy: { playedAt: 'desc' },
  take: 10,
});
```

## Schema Design

### Users Domain

#### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_username ON users(username) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_created_at ON users(created_at DESC);
```

#### user_profiles
```sql
CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  avatar_url TEXT,
  bio TEXT,
  country VARCHAR(2), -- ISO 3166-1 alpha-2
  timezone VARCHAR(50),
  date_of_birth DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_country ON user_profiles(country);
```

#### linked_accounts
```sql
CREATE TABLE linked_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('chess.com', 'lichess')),
  platform_username VARCHAR(100) NOT NULL,
  platform_user_id VARCHAR(100),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  linked_at TIMESTAMP DEFAULT NOW(),
  last_sync_at TIMESTAMP,
  sync_enabled BOOLEAN DEFAULT TRUE,
  UNIQUE(user_id, platform)
);

CREATE INDEX idx_linked_accounts_user_id ON linked_accounts(user_id);
CREATE INDEX idx_linked_accounts_platform ON linked_accounts(platform, platform_username);
CREATE INDEX idx_linked_accounts_sync ON linked_accounts(user_id, sync_enabled) 
  WHERE sync_enabled = TRUE;
```

#### user_settings
```sql
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme VARCHAR(20) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
  board_style VARCHAR(50) DEFAULT 'classic',
  piece_set VARCHAR(50) DEFAULT 'standard',
  auto_sync BOOLEAN DEFAULT TRUE,
  sync_frequency VARCHAR(20) DEFAULT 'daily',
  email_notifications BOOLEAN DEFAULT TRUE,
  analysis_depth INTEGER DEFAULT 20 CHECK (analysis_depth BETWEEN 10 AND 30),
  show_coordinates BOOLEAN DEFAULT TRUE,
  highlight_last_move BOOLEAN DEFAULT TRUE,
  auto_promote_queen BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Games Domain

#### games
```sql
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('chess.com', 'lichess', 'manual')),
  external_id VARCHAR(100),
  pgn TEXT NOT NULL,
  fen_final TEXT,
  
  -- Players
  white_player VARCHAR(100) NOT NULL,
  black_player VARCHAR(100) NOT NULL,
  white_rating INTEGER,
  black_rating INTEGER,
  user_color VARCHAR(5) CHECK (user_color IN ('white', 'black')),
  
  -- Game info
  result VARCHAR(10) NOT NULL CHECK (result IN ('1-0', '0-1', '1/2-1/2', '*')),
  termination VARCHAR(50), -- 'checkmate', 'resignation', 'timeout', etc.
  time_control VARCHAR(50),
  time_class VARCHAR(20), -- 'bullet', 'blitz', 'rapid', 'classical'
  
  -- Opening
  opening_eco VARCHAR(3),
  opening_name VARCHAR(200),
  opening_variation VARCHAR(200),
  
  -- Metadata
  event_name VARCHAR(200),
  site VARCHAR(200),
  round VARCHAR(20),
  played_at TIMESTAMP NOT NULL,
  
  -- Analysis
  analysis_status VARCHAR(20) DEFAULT 'pending' 
    CHECK (analysis_status IN ('pending', 'queued', 'processing', 'completed', 'failed')),
  analysis_requested_at TIMESTAMP,
  
  -- Timestamps
  synced_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(platform, external_id) WHERE external_id IS NOT NULL
);

CREATE INDEX idx_games_user_id ON games(user_id);
CREATE INDEX idx_games_platform_external ON games(platform, external_id);
CREATE INDEX idx_games_played_at ON games(played_at DESC);
CREATE INDEX idx_games_user_played ON games(user_id, played_at DESC);
CREATE INDEX idx_games_analysis_status ON games(analysis_status) 
  WHERE analysis_status IN ('pending', 'queued', 'processing');
CREATE INDEX idx_games_opening ON games(opening_eco);
CREATE INDEX idx_games_time_class ON games(time_class);
CREATE INDEX idx_games_result ON games(user_id, result);
```

### Analysis Domain

#### analysis
```sql
CREATE TABLE analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID UNIQUE NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  
  -- Accuracy metrics
  accuracy_white DECIMAL(5,2) CHECK (accuracy_white BETWEEN 0 AND 100),
  accuracy_black DECIMAL(5,2) CHECK (accuracy_black BETWEEN 0 AND 100),
  
  -- ACPL (Average Centipawn Loss)
  acpl_white DECIMAL(8,2),
  acpl_black DECIMAL(8,2),
  
  -- Move classifications
  blunders_white INTEGER DEFAULT 0,
  blunders_black INTEGER DEFAULT 0,
  mistakes_white INTEGER DEFAULT 0,
  mistakes_black INTEGER DEFAULT 0,
  inaccuracies_white INTEGER DEFAULT 0,
  inaccuracies_black INTEGER DEFAULT 0,
  brilliant_moves_white INTEGER DEFAULT 0,
  brilliant_moves_black INTEGER DEFAULT 0,
  
  -- Performance ratings
  performance_rating_white INTEGER,
  performance_rating_black INTEGER,
  
  -- Analysis metadata
  analysis_depth INTEGER NOT NULL,
  engine_version VARCHAR(50),
  total_positions INTEGER,
  
  -- Timestamps
  analyzed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_analysis_game_id ON analysis(game_id);
CREATE INDEX idx_analysis_accuracy ON analysis(accuracy_white, accuracy_black);
CREATE INDEX idx_analysis_analyzed_at ON analysis(analyzed_at DESC);
```

#### position_analysis
```sql
CREATE TABLE position_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES analysis(id) ON DELETE CASCADE,
  
  -- Position info
  move_number INTEGER NOT NULL,
  half_move INTEGER NOT NULL,
  fen TEXT NOT NULL,
  
  -- Evaluation
  evaluation INTEGER, -- in centipawns, NULL for mate
  mate_in INTEGER, -- positive for white, negative for black
  
  -- Moves
  best_move VARCHAR(10) NOT NULL,
  played_move VARCHAR(10) NOT NULL,
  
  -- Classification
  is_blunder BOOLEAN DEFAULT FALSE,
  is_mistake BOOLEAN DEFAULT FALSE,
  is_inaccuracy BOOLEAN DEFAULT FALSE,
  is_brilliant BOOLEAN DEFAULT FALSE,
  is_best BOOLEAN DEFAULT FALSE,
  classification VARCHAR(20) NOT NULL,
  
  -- Loss
  centipawn_loss INTEGER,
  
  -- Principal variation
  pv JSONB, -- Array of moves
  
  -- Metadata
  depth INTEGER,
  nodes BIGINT,
  time_ms INTEGER,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_position_analysis_id ON position_analysis(analysis_id);
CREATE INDEX idx_position_move ON position_analysis(analysis_id, move_number);
CREATE INDEX idx_position_classification ON position_analysis(classification);
CREATE INDEX idx_position_blunders ON position_analysis(analysis_id) 
  WHERE is_blunder = TRUE;
```

### Statistics Domain

#### user_statistics
```sql
CREATE TABLE user_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Time period
  period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'yearly', 'all_time')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Game counts
  total_games INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  
  -- Win rates
  win_rate DECIMAL(5,2),
  win_rate_white DECIMAL(5,2),
  win_rate_black DECIMAL(5,2),
  
  -- Accuracy
  average_accuracy DECIMAL(5,2),
  average_accuracy_white DECIMAL(5,2),
  average_accuracy_black DECIMAL(5,2),
  
  -- ACPL
  average_acpl DECIMAL(8,2),
  average_acpl_white DECIMAL(8,2),
  average_acpl_black DECIMAL(8,2),
  
  -- Move classifications
  total_blunders INTEGER DEFAULT 0,
  total_mistakes INTEGER DEFAULT 0,
  total_inaccuracies INTEGER DEFAULT 0,
  
  -- Time controls
  games_by_time_control JSONB, -- {"bullet": 10, "blitz": 20, ...}
  
  -- Openings
  favorite_opening VARCHAR(200),
  openings_distribution JSONB,
  
  -- Ratings
  peak_rating INTEGER,
  current_rating INTEGER,
  rating_change INTEGER,
  
  -- Timestamps
  calculated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, period_type, period_start)
);

CREATE INDEX idx_user_stats_user_period ON user_statistics(user_id, period_type, period_start DESC);
```

#### opening_statistics
```sql
CREATE TABLE opening_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opening_eco VARCHAR(3) NOT NULL,
  opening_name VARCHAR(200) NOT NULL,
  
  -- As white
  games_as_white INTEGER DEFAULT 0,
  wins_as_white INTEGER DEFAULT 0,
  losses_as_white INTEGER DEFAULT 0,
  draws_as_white INTEGER DEFAULT 0,
  win_rate_white DECIMAL(5,2),
  average_accuracy_white DECIMAL(5,2),
  
  -- As black
  games_as_black INTEGER DEFAULT 0,
  wins_as_black INTEGER DEFAULT 0,
  losses_as_black INTEGER DEFAULT 0,
  draws_as_black INTEGER DEFAULT 0,
  win_rate_black DECIMAL(5,2),
  average_accuracy_black DECIMAL(5,2),
  
  -- Overall
  total_games INTEGER DEFAULT 0,
  overall_win_rate DECIMAL(5,2),
  average_accuracy DECIMAL(5,2),
  
  -- Common variations
  common_variations JSONB,
  
  -- Timestamps
  last_played_at TIMESTAMP,
  calculated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, opening_eco)
);

CREATE INDEX idx_opening_stats_user ON opening_statistics(user_id);
CREATE INDEX idx_opening_stats_eco ON opening_statistics(opening_eco);
CREATE INDEX idx_opening_stats_games ON opening_statistics(user_id, total_games DESC);
```

### Jobs Domain

#### sync_jobs
```sql
CREATE TABLE sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  linked_account_id UUID NOT NULL REFERENCES linked_accounts(id) ON DELETE CASCADE,
  
  status VARCHAR(20) NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  
  -- Progress
  total_games INTEGER,
  processed_games INTEGER DEFAULT 0,
  new_games INTEGER DEFAULT 0,
  skipped_games INTEGER DEFAULT 0,
  
  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Timestamps
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sync_jobs_user ON sync_jobs(user_id);
CREATE INDEX idx_sync_jobs_status ON sync_jobs(status) WHERE status IN ('queued', 'running');
CREATE INDEX idx_sync_jobs_created ON sync_jobs(created_at DESC);
```

#### analysis_jobs
```sql
CREATE TABLE analysis_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  status VARCHAR(20) NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  
  -- Configuration
  depth INTEGER NOT NULL DEFAULT 20,
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  
  -- Progress
  total_positions INTEGER,
  analyzed_positions INTEGER DEFAULT 0,
  current_move INTEGER,
  
  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Timestamps
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_analysis_jobs_game ON analysis_jobs(game_id);
CREATE INDEX idx_analysis_jobs_user ON analysis_jobs(user_id);
CREATE INDEX idx_analysis_jobs_status ON analysis_jobs(status, priority DESC) 
  WHERE status IN ('queued', 'running');
CREATE INDEX idx_analysis_jobs_created ON analysis_jobs(created_at DESC);
```

## Data Relationships

```
users (1) ─────< (N) linked_accounts
  │
  ├─────< (N) games
  │         │
  │         └─────< (1) analysis
  │                   │
  │                   └─────< (N) position_analysis
  │
  ├─────< (N) user_statistics
  ├─────< (N) opening_statistics
  ├─────< (N) sync_jobs
  └─────< (N) analysis_jobs
```

## Indexing Strategy

### Primary Indexes
- All primary keys (UUID)
- Foreign keys
- Unique constraints

### Query Optimization Indexes
- User lookups: email, username
- Game queries: user_id + played_at
- Analysis status: pending/queued jobs
- Statistics: user_id + period

### Partial Indexes
```sql
-- Only index active records
CREATE INDEX idx_users_active ON users(email) WHERE deleted_at IS NULL;

-- Only index pending analysis
CREATE INDEX idx_games_pending ON games(id) WHERE analysis_status = 'pending';
```

## Migrations

### Migration Tool
Use **TypeORM** migrations for version control.

```typescript
// migrations/1641900000000-CreateUsers.ts
export class CreateUsers1641900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ...
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE users`);
  }
}
```

### Migration Strategy
1. **Never modify existing migrations**
2. **Always create new migrations for changes**
3. **Test migrations on staging first**
4. **Backup before production migrations**
5. **Keep migrations reversible**

## Performance Optimization

### Partitioning
```sql
-- Partition games by year
CREATE TABLE games_2026 PARTITION OF games
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
```

### Materialized Views
```sql
CREATE MATERIALIZED VIEW user_stats_summary AS
SELECT 
  user_id,
  COUNT(*) as total_games,
  AVG(accuracy_white) as avg_accuracy,
  ...
FROM games
JOIN analysis ON games.id = analysis.game_id
GROUP BY user_id;

CREATE UNIQUE INDEX ON user_stats_summary(user_id);
```

### Query Optimization
```sql
-- Use EXPLAIN ANALYZE
EXPLAIN ANALYZE
SELECT * FROM games WHERE user_id = '...' ORDER BY played_at DESC LIMIT 20;

-- Add covering indexes
CREATE INDEX idx_games_user_played_covering 
  ON games(user_id, played_at DESC) 
  INCLUDE (white_player, black_player, result);
```

---

**Next Steps**: See [analysis-engine.md](analysis-engine.md) for Stockfish integration details.
