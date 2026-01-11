# Architecture Overview

## Table of Contents
- [Introduction](#introduction)
- [Architectural Principles](#architectural-principles)
- [System Architecture](#system-architecture)
- [Service Architecture](#service-architecture)
- [Data Flow](#data-flow)
- [Scalability Considerations](#scalability-considerations)

## Introduction

EloInsight is built on a **microservices architecture** to ensure scalability, maintainability, and independent deployment of services. This document provides a comprehensive overview of the system's architecture.

## Architectural Principles

### 1. **Separation of Concerns**
Each service has a single, well-defined responsibility:
- **API Gateway**: Request routing and authentication
- **User Service**: User management and authentication
- **Game Sync Service**: Fetching games from external platforms
- **Analysis Engine**: Chess position analysis using Stockfish
- **Metadata Service**: Game statistics and metadata extraction

### 2. **Technology Diversity**
We use the best tool for each job:
- **NestJS**: For API Gateway and User Service (TypeScript, excellent for REST APIs)
- **Go**: For high-performance services (Game Sync, Analysis Engine)
- **Python**: For data processing and ML capabilities (Metadata Service)

### 3. **Asynchronous Processing**
Heavy operations (game analysis) are processed asynchronously using message queues to ensure responsive user experience.

### 4. **Data Ownership**
Each service owns its data and exposes it through well-defined APIs. No direct database access between services.

### 5. **Fault Tolerance**
Services are designed to fail gracefully and recover automatically.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              React Frontend (TypeScript)                  │  │
│  │  - Material UI Components                                 │  │
│  │  - Redux Toolkit (State Management)                       │  │
│  │  - React Query (Data Fetching)                            │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS/REST
                            │ WebSocket (Real-time updates)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                           │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              API Gateway (NestJS)                         │  │
│  │  - Request Routing                                        │  │
│  │  - Authentication & Authorization (JWT)                   │  │
│  │  - Rate Limiting                                          │  │
│  │  - Request Validation                                     │  │
│  │  - Response Transformation                                │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ gRPC
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Service Layer                               │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ User Service │  │  Game Sync   │  │   Analysis   │          │
│  │   (NestJS)   │  │  Service(Go) │  │  Engine (Go) │          │
│  │              │  │              │  │              │          │
│  │ - Auth       │  │ - Chess.com  │  │ - Stockfish  │          │
│  │ - Profiles   │  │ - Lichess    │  │ - Position   │          │
│  │ - Settings   │  │ - PGN Parse  │  │   Analysis   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
│  ┌──────────────┐                                                │
│  │  Metadata    │                                                │
│  │Service (Py)  │                                                │
│  │              │                                                │
│  │ - Statistics │                                                │
│  │ - Patterns   │                                                │
│  │ - Insights   │                                                │
│  └──────────────┘                                                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Data Layer                                  │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  PostgreSQL  │  │    Redis     │  │  RabbitMQ    │          │
│  │              │  │              │  │              │          │
│  │ - Users      │  │ - Sessions   │  │ - Analysis   │          │
│  │ - Games      │  │ - Cache      │  │   Queue      │          │
│  │ - Analysis   │  │ - Rate Limit │  │ - Sync Queue │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## Service Architecture

### API Gateway (NestJS)
**Port**: 4000  
**Responsibilities**:
- Route incoming requests to appropriate services
- JWT authentication and authorization
- Request validation and sanitization
- Rate limiting and throttling
- Response caching
- WebSocket gateway for real-time updates

**Key Technologies**:
- NestJS framework
- Passport.js for authentication
- class-validator for validation
- @nestjs/throttler for rate limiting

### User Service (NestJS)
**Port**: 4001  
**Responsibilities**:
- User registration and authentication
- Profile management
- Account linking (Chess.com, Lichess)
- User preferences and settings
- OAuth token management

**Database Tables**:
- `users`
- `user_profiles`
- `linked_accounts`
- `user_settings`

### Game Sync Service (Go)
**Port**: 5000  
**Responsibilities**:
- Fetch games from Chess.com API
- Fetch games from Lichess API
- Parse PGN format
- Store games in database
- Handle incremental sync
- Manage API rate limits

**Key Features**:
- Concurrent API requests
- Efficient PGN parsing
- Deduplication logic
- Error handling and retry mechanisms

### Analysis Engine (Go)
**Port**: 5001  
**Responsibilities**:
- Interface with Stockfish engine
- Analyze chess positions
- Calculate metrics (accuracy, ACPL, blunders)
- Generate move evaluations
- Process analysis queue

**Key Features**:
- Stockfish process pool management
- UCI protocol implementation
- Parallel position analysis
- Result caching

### Metadata Service (Python)
**Port**: 6000  
**Responsibilities**:
- Extract game metadata
- Calculate statistics
- Identify tactical patterns
- Generate insights
- Performance rating calculation

**Key Features**:
- NumPy/Pandas for data processing
- Pattern recognition algorithms
- Statistical analysis
- Opening classification

## Data Flow

### 1. User Registration Flow
```
User → API Gateway → User Service → PostgreSQL
                                  ↓
                              JWT Token
                                  ↓
                            Redis (Session)
```

### 2. Game Sync Flow
```
User Request → API Gateway → Game Sync Service
                                    ↓
                            Chess.com/Lichess API
                                    ↓
                              Parse PGN
                                    ↓
                              PostgreSQL
                                    ↓
                            RabbitMQ (Analysis Queue)
```

### 3. Game Analysis Flow
```
RabbitMQ → Analysis Engine → Stockfish
              ↓
         PostgreSQL (Save Results)
              ↓
         WebSocket → Frontend (Real-time Update)
```

### 4. Statistics Generation Flow
```
Scheduled Job → Metadata Service → PostgreSQL (Read Games)
                       ↓
                  Process Data
                       ↓
                PostgreSQL (Save Stats)
                       ↓
                  Redis (Cache)
```

## Scalability Considerations

### Horizontal Scaling
- **Stateless Services**: All services are stateless and can be scaled horizontally
- **Load Balancing**: NGINX or cloud load balancer distributes traffic
- **Database Replication**: PostgreSQL read replicas for read-heavy operations

### Caching Strategy
- **Redis**: Cache frequently accessed data
- **API Gateway**: Response caching for public endpoints
- **CDN**: Static assets served via CDN

### Queue Management
- **RabbitMQ**: Handles async processing
- **Dead Letter Queue**: Failed jobs for manual review
- **Priority Queues**: Premium users get priority

### Database Optimization
- **Indexing**: Proper indexes on frequently queried columns
- **Partitioning**: Large tables partitioned by date
- **Connection Pooling**: Efficient database connection management

### Monitoring & Observability
- **Prometheus**: Metrics collection
- **Grafana**: Visualization dashboards
- **ELK Stack**: Centralized logging
- **Jaeger**: Distributed tracing

## Security Architecture

### Authentication & Authorization
- JWT tokens with short expiration
- Refresh token rotation
- Role-based access control (RBAC)

### Data Protection
- Encryption at rest (PostgreSQL)
- Encryption in transit (TLS/SSL)
- Sensitive data hashing (bcrypt)

### API Security
- Rate limiting per user/IP
- Request validation
- CORS configuration
- API key management for external services

## Deployment Architecture

### Development
- Docker Compose for local development
- Hot reload for all services
- Shared volumes for code

### Production
- Kubernetes cluster
- Helm charts for deployment
- Auto-scaling based on metrics
- Rolling updates with zero downtime

---

**Next Steps**: See [system-design.md](system-design.md) for detailed system design decisions.
