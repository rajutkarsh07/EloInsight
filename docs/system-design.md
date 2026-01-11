# System Design

## Table of Contents
- [Design Goals](#design-goals)
- [Key Design Decisions](#key-design-decisions)
- [Component Design](#component-design)
- [Communication Patterns](#communication-patterns)
- [Data Consistency](#data-consistency)
- [Performance Optimization](#performance-optimization)
- [Failure Handling](#failure-handling)

## Design Goals

### Primary Goals
1. **Free and Accessible**: Provide professional-grade chess analysis at zero cost
2. **Scalable**: Support thousands of concurrent users and millions of games
3. **Fast**: Real-time analysis feedback and responsive UI
4. **Reliable**: 99.9% uptime with graceful degradation
5. **Maintainable**: Clean code, good documentation, easy to contribute

### Non-Functional Requirements
- **Performance**: API response time < 200ms (p95)
- **Availability**: 99.9% uptime
- **Scalability**: Handle 10K concurrent users
- **Security**: SOC 2 compliance ready
- **Data Retention**: Unlimited game history

## Key Design Decisions

### 1. Microservices vs Monolith
**Decision**: Microservices architecture  
**Rationale**:
- Different services have different performance characteristics
- Independent scaling of compute-intensive analysis engine
- Technology diversity (NestJS, Go, Python)
- Team can work independently on services
- Easier to maintain and debug

**Trade-offs**:
- ✅ Better scalability and flexibility
- ✅ Technology diversity
- ❌ Increased operational complexity
- ❌ Network latency between services

### 2. Synchronous vs Asynchronous Analysis
**Decision**: Asynchronous analysis with queue  
**Rationale**:
- Stockfish analysis can take 10-60 seconds per game
- Don't block user requests
- Better resource utilization
- Can prioritize analysis jobs

**Implementation**:
```
User Request → Queue Job → Return Job ID
                    ↓
            Background Worker
                    ↓
            WebSocket Update
```

### 3. REST vs GraphQL for Frontend API
**Decision**: REST API  
**Rationale**:
- Simpler to implement and understand
- Better caching with HTTP
- Sufficient for our use case
- Easier to document with OpenAPI

**Trade-offs**:
- ✅ Simplicity and wide adoption
- ✅ Better HTTP caching
- ❌ Over-fetching/under-fetching
- ❌ Multiple round trips for related data

### 4. gRPC for Inter-Service Communication
**Decision**: gRPC for service-to-service communication  
**Rationale**:
- Better performance than REST (binary protocol)
- Strong typing with Protocol Buffers
- Bi-directional streaming support
- Built-in code generation

**Trade-offs**:
- ✅ High performance
- ✅ Type safety
- ❌ Steeper learning curve
- ❌ Debugging is harder

### 5. PostgreSQL as Primary Database
**Decision**: PostgreSQL  
**Rationale**:
- Excellent JSON support for game data
- ACID compliance
- Rich indexing capabilities
- Great community and tooling
- Free and open-source

**Alternatives Considered**:
- MongoDB: Rejected due to lack of transactions
- MySQL: PostgreSQL has better JSON support

### 6. Redis for Caching
**Decision**: Redis  
**Rationale**:
- In-memory performance
- Rich data structures
- Pub/Sub for real-time updates
- Session management
- Rate limiting

### 7. RabbitMQ for Message Queue
**Decision**: RabbitMQ  
**Rationale**:
- Reliable message delivery
- Dead letter queues
- Priority queues
- Good monitoring tools
- Battle-tested in production

**Alternatives Considered**:
- Kafka: Overkill for our use case
- AWS SQS: Want to stay cloud-agnostic

## Component Design

### Frontend Architecture

```
src/
├── components/          # Reusable UI components
│   ├── common/         # Buttons, inputs, cards
│   ├── chess/          # Chessboard, move list
│   └── analysis/       # Analysis charts, metrics
├── pages/              # Route components
├── store/              # Redux slices
├── services/           # API clients
├── hooks/              # Custom React hooks
├── utils/              # Helper functions
└── types/              # TypeScript definitions
```

**State Management**:
- **Redux Toolkit**: Global state (user, games, analysis)
- **React Query**: Server state and caching
- **Local State**: Component-specific state

**Key Components**:
- `ChessBoard`: Interactive board with move validation
- `AnalysisPanel`: Display engine evaluation and best moves
- `GameList`: Virtualized list for thousands of games
- `StatsDashboard`: Charts and metrics visualization

### Backend Service Design

#### API Gateway Pattern
```typescript
@Controller('games')
export class GamesController {
  constructor(
    @Inject('GAME_SERVICE') private gameClient: ClientGrpc,
  ) {}

  @Get(':id')
  async getGame(@Param('id') id: string) {
    // Validate request
    // Call game service via gRPC
    // Transform response
    // Return to client
  }
}
```

#### Service Layer Pattern
```go
type AnalysisService struct {
    stockfish *StockfishPool
    db        *Database
    queue     *Queue
}

func (s *AnalysisService) AnalyzeGame(gameID string) (*Analysis, error) {
    // Fetch game from database
    // Get Stockfish engine from pool
    // Analyze each position
    // Calculate metrics
    // Save results
    // Publish completion event
}
```

## Communication Patterns

### 1. Request-Response (REST)
**Use Case**: Frontend to API Gateway  
**Pattern**: Synchronous HTTP requests  
**Example**: Fetch user profile, game list

```
GET /api/users/me
Authorization: Bearer <token>

Response:
{
  "id": "123",
  "username": "player1",
  "rating": 1500
}
```

### 2. RPC (gRPC)
**Use Case**: Service-to-service communication  
**Pattern**: Synchronous RPC calls  
**Example**: API Gateway calls User Service

```protobuf
service UserService {
  rpc GetUser(GetUserRequest) returns (User);
  rpc UpdateProfile(UpdateProfileRequest) returns (User);
}
```

### 3. Event-Driven (Message Queue)
**Use Case**: Asynchronous processing  
**Pattern**: Publish-subscribe  
**Example**: Game analysis workflow

```
Publisher: Game Sync Service
Message: { gameId: "123", userId: "456" }
Queue: analysis-queue
Consumer: Analysis Engine
```

### 4. Real-Time (WebSocket)
**Use Case**: Live updates to frontend  
**Pattern**: Bi-directional streaming  
**Example**: Analysis progress updates

```javascript
socket.on('analysis:progress', (data) => {
  // Update progress bar
  // Show current move being analyzed
});
```

## Data Consistency

### Eventual Consistency
Most operations use eventual consistency:
- Game sync: Games appear after processing
- Analysis: Results appear after completion
- Statistics: Updated periodically

### Strong Consistency
Critical operations require strong consistency:
- User authentication
- Account linking
- Payment processing (future)

### Consistency Patterns

#### 1. Idempotency
All API endpoints are idempotent:
```typescript
@Post('games/:id/analyze')
async analyzeGame(@Param('id') id: string) {
  // Check if analysis already exists
  const existing = await this.findAnalysis(id);
  if (existing) return existing;
  
  // Create new analysis job
  return this.createAnalysisJob(id);
}
```

#### 2. Optimistic Locking
Prevent concurrent updates:
```sql
UPDATE games 
SET analysis_status = 'completed', version = version + 1
WHERE id = $1 AND version = $2
```

#### 3. Saga Pattern
Distributed transactions:
```
1. Create analysis job → Success
2. Deduct credits → Success
3. Queue analysis → Failure
   ↓
Compensate: Refund credits
```

## Performance Optimization

### Database Optimization

#### Indexing Strategy
```sql
-- User lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- Game queries
CREATE INDEX idx_games_user_id ON games(user_id);
CREATE INDEX idx_games_date ON games(played_at DESC);
CREATE INDEX idx_games_platform ON games(platform, external_id);

-- Analysis queries
CREATE INDEX idx_analysis_game_id ON analysis(game_id);
CREATE INDEX idx_analysis_status ON analysis(status) WHERE status != 'completed';
```

#### Query Optimization
```typescript
// Bad: N+1 query problem
const games = await Game.findAll();
for (const game of games) {
  game.analysis = await Analysis.findOne({ gameId: game.id });
}

// Good: Join query
const games = await Game.findAll({
  include: [{ model: Analysis }]
});
```

### Caching Strategy

#### Multi-Level Caching
```
1. Browser Cache (Static assets)
2. CDN Cache (Public data)
3. Redis Cache (Dynamic data)
4. Application Cache (In-memory)
```

#### Cache Invalidation
```typescript
// Write-through cache
async updateUser(id: string, data: UpdateUserDto) {
  const user = await this.db.users.update(id, data);
  await this.cache.set(`user:${id}`, user, 3600);
  return user;
}

// Cache-aside pattern
async getUser(id: string) {
  let user = await this.cache.get(`user:${id}`);
  if (!user) {
    user = await this.db.users.findById(id);
    await this.cache.set(`user:${id}`, user, 3600);
  }
  return user;
}
```

### API Optimization

#### Pagination
```typescript
@Get('games')
async getGames(
  @Query('page') page = 1,
  @Query('limit') limit = 20,
) {
  const offset = (page - 1) * limit;
  return this.gamesService.findAll({ offset, limit });
}
```

#### Field Selection
```typescript
@Get('games')
async getGames(@Query('fields') fields?: string) {
  const select = fields ? fields.split(',') : undefined;
  return this.gamesService.findAll({ select });
}
```

#### Compression
```typescript
// Enable gzip compression
app.use(compression());
```

## Failure Handling

### Circuit Breaker Pattern
```typescript
class CircuitBreaker {
  private failures = 0;
  private state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  
  async call(fn: Function) {
    if (this.state === 'OPEN') {
      throw new Error('Circuit breaker is OPEN');
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
}
```

### Retry Strategy
```typescript
async function retryWithBackoff(
  fn: Function,
  maxRetries = 3,
  baseDelay = 1000,
) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(baseDelay * Math.pow(2, i));
    }
  }
}
```

### Graceful Degradation
```typescript
async getGameAnalysis(gameId: string) {
  try {
    // Try to get full analysis
    return await this.analysisService.getFullAnalysis(gameId);
  } catch (error) {
    // Fallback to basic analysis
    return await this.analysisService.getBasicAnalysis(gameId);
  }
}
```

### Health Checks
```typescript
@Get('health')
async healthCheck() {
  return {
    status: 'ok',
    timestamp: new Date(),
    services: {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
      queue: await this.checkQueue(),
    }
  };
}
```

## Monitoring & Observability

### Metrics Collection
- Request rate and latency
- Error rates
- Queue depth
- Database connection pool
- Cache hit rate

### Logging Strategy
```typescript
logger.info('Game analysis started', {
  gameId,
  userId,
  timestamp: new Date(),
  metadata: { platform: 'chess.com' }
});
```

### Distributed Tracing
```typescript
const span = tracer.startSpan('analyze-game');
span.setTag('game.id', gameId);
try {
  const result = await analyzeGame(gameId);
  span.setTag('status', 'success');
  return result;
} catch (error) {
  span.setTag('error', true);
  throw error;
} finally {
  span.finish();
}
```

---

**Next Steps**: See [services.md](services.md) for detailed service specifications.
