# Tech Stack

## Table of Contents
- [Overview](#overview)
- [Frontend Technologies](#frontend-technologies)
- [Backend Technologies](#backend-technologies)
- [Infrastructure](#infrastructure)
- [Development Tools](#development-tools)
- [Why These Choices](#why-these-choices)

## Overview

EloInsight uses a modern, polyglot tech stack optimized for performance, developer experience, and scalability.

## Frontend Technologies

### Core Framework
**React 18.2+**
- Component-based architecture
- Hooks for state management
- Concurrent rendering
- Server components ready

**TypeScript 5.0+**
- Type safety
- Better IDE support
- Reduced runtime errors
- Self-documenting code

### UI Framework
**TailwindCSS**
- Utility-first CSS framework
- Highly customizable
- No CSS files needed
- Dark theme built-in

**Why TailwindCSS?**
- ✅ Faster development with utility classes
- ✅ Smaller bundle size (purges unused CSS)
- ✅ Easy dark mode support
- ✅ Consistent design system

### Component Libraries
**Lucide React**
- Beautiful icon library
- Tree-shakeable
- Consistent design

**Sonner**
- Toast notifications
- Beautiful animations
- Easy to use

### State Management
**React Context + Hooks**
- Built-in React state management
- AuthContext for authentication
- GamesContext for game data caching
- No external dependencies needed

**Why not Redux?**
- App complexity doesn't require it
- Context + hooks sufficient for our needs
- Less boilerplate code

### Data Visualization
**Recharts**
- React-based charts
- Responsive and customizable
- Good performance
- TypeScript support

**Alternative Considered**: Chart.js, D3.js (too complex for our needs)

### Chess Components
**react-chessboard**
- Interactive chessboard
- Drag and drop moves
- Position validation
- Customizable pieces

**chess.js**
- Move validation
- Game state management
- PGN parsing
- FEN support

### Build Tools
**Vite**
- Lightning-fast HMR
- Optimized builds
- Plugin ecosystem
- TypeScript support

### Testing
**Vitest**
- Fast unit testing
- Compatible with Vite
- Jest-compatible API

**React Testing Library**
- User-centric testing
- Best practices enforced

**Playwright**
- E2E testing
- Cross-browser support
- Auto-wait functionality

## Backend Technologies

### API Gateway & User Service

**NestJS**
- TypeScript-first framework
- Modular architecture
- Built-in dependency injection
- Excellent documentation

**Key Libraries**:
```json
{
  "@nestjs/core": "^10.0.0",
  "@nestjs/common": "^10.0.0",
  "@nestjs/microservices": "^10.0.0",
  "@nestjs/typeorm": "^10.0.0",
  "@nestjs/jwt": "^10.0.0",
  "@nestjs/passport": "^10.0.0",
  "@nestjs/throttler": "^5.0.0",
  "@nestjs/websockets": "^10.0.0",
  "typeorm": "^0.3.17",
  "passport-jwt": "^4.0.1",
  "bcrypt": "^5.1.1",
  "class-validator": "^0.14.0",
  "class-transformer": "^0.5.1"
}
```

### Game Sync & Analysis Engine

**Go 1.21+**
- High performance
- Excellent concurrency
- Low memory footprint
- Fast compilation

**Key Libraries**:
```go
require (
    github.com/jackc/pgx/v5 v5.4.3        // PostgreSQL driver
    github.com/notnil/chess v1.9.0         // Chess logic
    google.golang.org/grpc v1.58.0         // gRPC
    google.golang.org/protobuf v1.31.0     // Protocol Buffers
    github.com/redis/go-redis/v9 v9.2.1    // Redis client
    github.com/rabbitmq/amqp091-go v1.9.0  // RabbitMQ
    github.com/gin-gonic/gin v1.9.1        // HTTP framework
)
```

**Why Go?**
- ✅ Perfect for CPU-intensive tasks
- ✅ Built-in concurrency (goroutines)
- ✅ Fast execution (Stockfish communication)
- ✅ Low resource usage

### Metadata Service

**Python 3.11+**
- Rich data science ecosystem
- Easy to write and maintain
- Excellent for statistics

**FastAPI**
- Modern Python web framework
- Automatic OpenAPI docs
- Type hints support
- Async support

**Key Libraries**:
```python
fastapi==0.104.0
uvicorn==0.24.0
asyncpg==0.29.0          # PostgreSQL async driver
python-chess==1.999      # Chess library
numpy==1.26.0            # Numerical computing
pandas==2.1.0            # Data analysis
grpcio==1.59.0           # gRPC
protobuf==4.24.0         # Protocol Buffers
pydantic==2.4.0          # Data validation
```

**Why Python?**
- ✅ Best for data analysis
- ✅ Rich chess libraries
- ✅ Easy pattern recognition
- ✅ Future ML capabilities

## Infrastructure

### Database

**PostgreSQL 15+**
- ACID compliance
- JSON/JSONB support
- Full-text search
- Excellent performance

**Extensions**:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- Fuzzy text search
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- Better indexing
```

**Why PostgreSQL?**
- ✅ Robust and reliable
- ✅ Great JSON support (for PGN data)
- ✅ Advanced indexing
- ✅ Open source

### Caching

**Redis 7.0+**
- In-memory data store
- Pub/Sub messaging
- Session storage
- Rate limiting

**Use Cases**:
- User sessions
- API response caching
- Rate limit counters
- Real-time pub/sub

### Message Queue

**RabbitMQ 3.12+**
- Reliable message delivery
- Multiple queue types
- Dead letter queues
- Management UI

**Queue Configuration**:
```javascript
{
  "analysis-queue": {
    "durable": true,
    "priority": true,
    "maxPriority": 10,
    "deadLetterExchange": "dlx"
  }
}
```

### Chess Engine

**Stockfish 16**
- World's strongest open-source engine
- UCI protocol
- Multi-threaded
- Configurable depth

**Configuration**:
```
setoption name Threads value 4
setoption name Hash value 2048
setoption name MultiPV value 3
```

## Development Tools

### Version Control
**Git + GitHub**
- Source control
- Issue tracking
- Pull requests
- Actions (CI/CD)

### Containerization
**Docker**
- Consistent environments
- Easy deployment
- Service isolation

**Docker Compose**
- Multi-container orchestration
- Local development
- Service dependencies

### API Documentation
**OpenAPI/Swagger**
- Auto-generated docs
- Interactive testing
- Client generation

**Postman**
- API testing
- Collection sharing
- Environment management

### Code Quality

**ESLint + Prettier** (Frontend)
```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "prettier"
  ]
}
```

**golangci-lint** (Go services)
```yaml
linters:
  enable:
    - gofmt
    - golint
    - govet
    - errcheck
    - staticcheck
```

**Black + Pylint** (Python)
```ini
[tool.black]
line-length = 100

[tool.pylint]
max-line-length = 100
```

### Monitoring & Logging

**Prometheus**
- Metrics collection
- Time-series database
- Alerting rules

**Grafana**
- Visualization dashboards
- Alert management
- Data exploration

**ELK Stack** (Optional)
- Elasticsearch: Log storage
- Logstash: Log processing
- Kibana: Log visualization

### CI/CD

**GitHub Actions**
```yaml
name: CI/CD Pipeline
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: npm test
  
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Build Docker images
        run: docker-compose build
```

## Why These Choices

### Performance
- **Go** for CPU-intensive analysis
- **Redis** for fast caching
- **PostgreSQL** for reliable data storage
- **Vite** for fast development builds

### Developer Experience
- **TypeScript** everywhere possible
- **Hot reload** in all services
- **Auto-generated** API docs
- **Type-safe** gRPC communication

### Scalability
- **Microservices** for independent scaling
- **Message queues** for async processing
- **Horizontal scaling** ready
- **Stateless services**

### Cost Efficiency
- **Open source** everything
- **Self-hosted** option
- **Efficient** resource usage
- **Cloud-agnostic** design

### Community & Support
- All technologies have:
  - Active communities
  - Good documentation
  - Regular updates
  - Security patches

## Technology Comparison

### Frontend Framework
| Framework | Pros | Cons | Choice |
|-----------|------|------|--------|
| React | Large ecosystem, flexible | Boilerplate | ✅ Chosen |
| Vue | Easy to learn, lightweight | Smaller ecosystem | ❌ |
| Angular | Full framework, TypeScript | Steep learning curve | ❌ |

### Backend Language
| Language | Pros | Cons | Choice |
|----------|------|------|--------|
| TypeScript | Type safety, familiar | Not as fast as Go | ✅ API Gateway |
| Go | Fast, concurrent | Verbose | ✅ Analysis |
| Python | Great for data | Slower | ✅ Metadata |
| Rust | Fastest, safe | Steep learning curve | ❌ |

### Database
| Database | Pros | Cons | Choice |
|----------|------|------|--------|
| PostgreSQL | Robust, JSON support | Setup complexity | ✅ Chosen |
| MongoDB | Flexible schema | No transactions | ❌ |
| MySQL | Popular, fast | Limited JSON | ❌ |

---

**Next Steps**: See [api-design.md](api-design.md) for API specifications.
