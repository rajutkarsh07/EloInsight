# Services Documentation

## Table of Contents
- [Service Overview](#service-overview)
- [API Gateway](#api-gateway)
- [User Service](#user-service)
- [Game Sync Service](#game-sync-service)
- [Analysis Engine](#analysis-engine)
- [Metadata Service](#metadata-service)
- [Service Communication](#service-communication)

## Service Overview

| Service | Language | Port | Purpose | Database |
|---------|----------|------|---------|----------|
| API Gateway | NestJS | 4000 | Request routing, auth | - |
| User Service | NestJS | 4001 | User management | PostgreSQL |
| Game Sync | Go | 5000 | Fetch games from platforms | PostgreSQL |
| Analysis Engine | Go | 5001 | Stockfish analysis | PostgreSQL |
| Metadata Service | Python | 6000 | Statistics & insights | PostgreSQL |

## API Gateway

### Overview
The API Gateway is the single entry point for all client requests. It handles authentication, routing, rate limiting, and response transformation.

### Responsibilities
- **Authentication**: Validate JWT tokens
- **Authorization**: Check user permissions
- **Routing**: Forward requests to appropriate services
- **Rate Limiting**: Prevent abuse
- **Request Validation**: Validate input data
- **Response Transformation**: Format responses
- **WebSocket Gateway**: Real-time updates

### Technology Stack
- **Framework**: NestJS
- **Authentication**: Passport.js + JWT
- **Validation**: class-validator, class-transformer
- **Rate Limiting**: @nestjs/throttler
- **WebSocket**: Socket.io

### Project Structure
```
api-gateway/
├── src/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── jwt.strategy.ts
│   │   └── guards/
│   ├── users/
│   │   ├── users.controller.ts
│   │   └── users.gateway.ts
│   ├── games/
│   │   ├── games.controller.ts
│   │   └── games.gateway.ts
│   ├── analysis/
│   │   ├── analysis.controller.ts
│   │   └── analysis.gateway.ts
│   ├── common/
│   │   ├── filters/
│   │   ├── interceptors/
│   │   └── guards/
│   ├── config/
│   └── main.ts
├── test/
├── package.json
└── tsconfig.json
```

### Key Endpoints
```
POST   /auth/register          - Register new user
POST   /auth/login             - Login user
POST   /auth/refresh           - Refresh access token
GET    /users/me               - Get current user
PUT    /users/me               - Update profile
POST   /users/link-account     - Link Chess.com/Lichess
GET    /games                  - List user games
GET    /games/:id              - Get game details
POST   /games/sync             - Trigger game sync
POST   /games/:id/analyze      - Request analysis
GET    /analysis/:id           - Get analysis results
GET    /stats/overview         - Get user statistics
```

### Configuration
```typescript
// config/configuration.ts
export default () => ({
  port: parseInt(process.env.PORT, 10) || 4000,
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: '15m',
  },
  services: {
    user: {
      host: process.env.USER_SERVICE_HOST || 'localhost',
      port: parseInt(process.env.USER_SERVICE_PORT, 10) || 4001,
    },
    gameSync: {
      host: process.env.GAME_SYNC_HOST || 'localhost',
      port: parseInt(process.env.GAME_SYNC_PORT, 10) || 5000,
    },
    analysis: {
      host: process.env.ANALYSIS_ENGINE_HOST || 'localhost',
      port: parseInt(process.env.ANALYSIS_ENGINE_PORT, 10) || 5001,
    },
  },
  rateLimit: {
    ttl: 60,
    limit: 100,
  },
});
```

## User Service

### Overview
Manages user accounts, authentication, and profile data. Handles account linking with Chess.com and Lichess.

### Responsibilities
- User registration and login
- Profile management
- Account linking (Chess.com, Lichess)
- OAuth token storage and refresh
- User preferences and settings

### Technology Stack
- **Framework**: NestJS
- **ORM**: TypeORM
- **Database**: PostgreSQL
- **Password Hashing**: bcrypt
- **Validation**: class-validator

### Database Schema
```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User profiles
CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  avatar_url TEXT,
  bio TEXT,
  country VARCHAR(2),
  timezone VARCHAR(50),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Linked accounts
CREATE TABLE linked_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  platform VARCHAR(20) NOT NULL, -- 'chess.com' or 'lichess'
  platform_username VARCHAR(100) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  linked_at TIMESTAMP DEFAULT NOW(),
  last_sync_at TIMESTAMP,
  UNIQUE(user_id, platform)
);

-- User settings
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  theme VARCHAR(20) DEFAULT 'light',
  board_style VARCHAR(50) DEFAULT 'classic',
  piece_set VARCHAR(50) DEFAULT 'standard',
  auto_sync BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  analysis_depth INTEGER DEFAULT 20,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### gRPC Service Definition
```protobuf
syntax = "proto3";

package user;

service UserService {
  rpc CreateUser(CreateUserRequest) returns (User);
  rpc GetUser(GetUserRequest) returns (User);
  rpc UpdateUser(UpdateUserRequest) returns (User);
  rpc DeleteUser(DeleteUserRequest) returns (Empty);
  rpc LinkAccount(LinkAccountRequest) returns (LinkedAccount);
  rpc GetLinkedAccounts(GetLinkedAccountsRequest) returns (LinkedAccountsList);
}

message User {
  string id = 1;
  string email = 2;
  string username = 3;
  UserProfile profile = 4;
  repeated LinkedAccount linked_accounts = 5;
  UserSettings settings = 6;
}

message CreateUserRequest {
  string email = 1;
  string username = 2;
  string password = 3;
}

message LinkAccountRequest {
  string user_id = 1;
  string platform = 2;
  string platform_username = 3;
  string access_token = 4;
}
```

## Game Sync Service

### Overview
Fetches games from Chess.com and Lichess APIs, parses PGN data, and stores games in the database.

### Responsibilities
- Fetch games from Chess.com API
- Fetch games from Lichess API
- Parse PGN format
- Deduplicate games
- Handle API rate limits
- Incremental sync

### Technology Stack
- **Language**: Go
- **HTTP Client**: net/http with retry logic
- **PGN Parser**: notnil/chess
- **Database**: pgx (PostgreSQL driver)
- **Concurrency**: goroutines and channels

### Project Structure
```
game-sync-service/
├── cmd/
│   └── server/
│       └── main.go
├── internal/
│   ├── api/
│   │   ├── chesscom.go
│   │   └── lichess.go
│   ├── parser/
│   │   └── pgn.go
│   ├── storage/
│   │   └── postgres.go
│   ├── sync/
│   │   ├── sync.go
│   │   └── dedup.go
│   └── grpc/
│       └── server.go
├── pkg/
│   └── models/
│       └── game.go
├── proto/
│   └── game_sync.proto
├── go.mod
└── go.sum
```

### Database Schema
```sql
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  platform VARCHAR(20) NOT NULL, -- 'chess.com' or 'lichess'
  external_id VARCHAR(100) NOT NULL,
  pgn TEXT NOT NULL,
  white_player VARCHAR(100),
  black_player VARCHAR(100),
  white_rating INTEGER,
  black_rating INTEGER,
  result VARCHAR(10), -- '1-0', '0-1', '1/2-1/2'
  time_control VARCHAR(50),
  opening_name VARCHAR(200),
  played_at TIMESTAMP NOT NULL,
  synced_at TIMESTAMP DEFAULT NOW(),
  analysis_status VARCHAR(20) DEFAULT 'pending',
  UNIQUE(platform, external_id)
);

CREATE INDEX idx_games_user_id ON games(user_id);
CREATE INDEX idx_games_platform_external ON games(platform, external_id);
CREATE INDEX idx_games_played_at ON games(played_at DESC);
CREATE INDEX idx_games_analysis_status ON games(analysis_status) 
  WHERE analysis_status != 'completed';
```

### Key Functions
```go
// Sync games from Chess.com
func (s *SyncService) SyncChessComGames(userID, username string) error {
    archives, err := s.chessComAPI.GetArchives(username)
    if err != nil {
        return err
    }
    
    for _, archiveURL := range archives {
        games, err := s.chessComAPI.GetGames(archiveURL)
        if err != nil {
            continue // Log and continue
        }
        
        for _, game := range games {
            if err := s.processGame(userID, "chess.com", game); err != nil {
                log.Printf("Error processing game: %v", err)
            }
        }
    }
    
    return nil
}

// Parse PGN and extract metadata
func (p *PGNParser) Parse(pgn string) (*Game, error) {
    game, err := chess.PGN(strings.NewReader(pgn))
    if err != nil {
        return nil, err
    }
    
    return &Game{
        PGN:         pgn,
        WhitePlayer: game.GetTagPair("White").Value,
        BlackPlayer: game.GetTagPair("Black").Value,
        Result:      game.GetTagPair("Result").Value,
        // ... extract more fields
    }, nil
}
```

## Analysis Engine

### Overview
High-performance service that interfaces with Stockfish to analyze chess positions and calculate game metrics.

### Responsibilities
- Manage Stockfish engine pool
- Analyze chess positions
- Calculate accuracy, ACPL, blunders
- Process analysis queue
- Cache analysis results

### Technology Stack
- **Language**: Go
- **Chess Engine**: Stockfish 16
- **UCI Protocol**: Custom implementation
- **Concurrency**: Worker pool pattern
- **Cache**: Redis

### Project Structure
```
analysis-engine/
├── cmd/
│   └── server/
│       └── main.go
├── internal/
│   ├── stockfish/
│   │   ├── pool.go
│   │   ├── engine.go
│   │   └── uci.go
│   ├── analyzer/
│   │   ├── position.go
│   │   ├── metrics.go
│   │   └── accuracy.go
│   ├── queue/
│   │   ├── consumer.go
│   │   └── publisher.go
│   ├── storage/
│   │   └── postgres.go
│   └── grpc/
│       └── server.go
├── pkg/
│   └── models/
│       └── analysis.go
├── proto/
│   └── analysis.proto
├── go.mod
└── go.sum
```

### Database Schema
```sql
CREATE TABLE analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id),
  accuracy_white DECIMAL(5,2),
  accuracy_black DECIMAL(5,2),
  acpl_white DECIMAL(8,2),
  acpl_black DECIMAL(8,2),
  blunders_white INTEGER,
  blunders_black INTEGER,
  mistakes_white INTEGER,
  mistakes_black INTEGER,
  inaccuracies_white INTEGER,
  inaccuracies_black INTEGER,
  performance_rating_white INTEGER,
  performance_rating_black INTEGER,
  analyzed_at TIMESTAMP DEFAULT NOW(),
  analysis_depth INTEGER,
  UNIQUE(game_id)
);

CREATE TABLE position_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID REFERENCES analysis(id),
  move_number INTEGER,
  fen TEXT NOT NULL,
  evaluation INTEGER, -- in centipawns
  best_move VARCHAR(10),
  played_move VARCHAR(10),
  is_blunder BOOLEAN,
  is_mistake BOOLEAN,
  is_inaccuracy BOOLEAN,
  classification VARCHAR(20)
);

CREATE INDEX idx_analysis_game_id ON analysis(game_id);
CREATE INDEX idx_position_analysis_id ON position_analysis(analysis_id);
```

### Stockfish Pool Management
```go
type StockfishPool struct {
    engines chan *Engine
    size    int
}

func NewStockfishPool(size int) *StockfishPool {
    pool := &StockfishPool{
        engines: make(chan *Engine, size),
        size:    size,
    }
    
    for i := 0; i < size; i++ {
        engine, err := NewEngine()
        if err != nil {
            log.Fatal(err)
        }
        pool.engines <- engine
    }
    
    return pool
}

func (p *StockfishPool) Get() *Engine {
    return <-p.engines
}

func (p *StockfishPool) Put(engine *Engine) {
    p.engines <- engine
}
```

## Metadata Service

### Overview
Python service for advanced statistics, pattern recognition, and insights generation.

### Responsibilities
- Calculate detailed statistics
- Identify tactical patterns
- Generate insights
- Opening classification
- Performance rating calculation

### Technology Stack
- **Language**: Python 3.11
- **Framework**: FastAPI
- **Data Processing**: NumPy, Pandas
- **Chess Library**: python-chess
- **Database**: asyncpg

### Project Structure
```
metadata-service/
├── src/
│   ├── main.py
│   ├── api/
│   │   ├── routes.py
│   │   └── models.py
│   ├── services/
│   │   ├── statistics.py
│   │   ├── patterns.py
│   │   └── insights.py
│   ├── db/
│   │   └── postgres.py
│   └── grpc/
│       └── server.py
├── proto/
│   └── metadata.proto
├── requirements.txt
└── Dockerfile
```

### Key Services
```python
class StatisticsService:
    async def calculate_user_stats(self, user_id: str) -> UserStats:
        """Calculate comprehensive user statistics"""
        games = await self.db.get_user_games(user_id)
        
        return UserStats(
            total_games=len(games),
            win_rate=self._calculate_win_rate(games),
            average_accuracy=self._calculate_avg_accuracy(games),
            favorite_opening=self._find_favorite_opening(games),
            rating_progression=self._calculate_rating_trend(games),
            time_control_distribution=self._analyze_time_controls(games),
        )
    
    def _calculate_win_rate(self, games: List[Game]) -> float:
        wins = sum(1 for g in games if g.result == 'win')
        return (wins / len(games)) * 100 if games else 0
```

## Service Communication

### gRPC Communication Flow
```
API Gateway → User Service (gRPC)
API Gateway → Game Sync Service (gRPC)
API Gateway → Analysis Engine (gRPC)
API Gateway → Metadata Service (gRPC)
```

### Message Queue Flow
```
Game Sync Service → RabbitMQ → Analysis Engine
Analysis Engine → RabbitMQ → Metadata Service
```

### WebSocket Updates
```
Analysis Engine → API Gateway (WebSocket) → Frontend
```

---

**Next Steps**: See [api-design.md](api-design.md) for detailed API specifications.
