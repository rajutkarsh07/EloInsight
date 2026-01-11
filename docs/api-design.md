# API Design

## Table of Contents
- [API Overview](#api-overview)
- [Authentication](#authentication)
- [REST Endpoints](#rest-endpoints)
- [Request/Response Format](#requestresponse-format)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Versioning](#versioning)

## API Overview

EloInsight provides a RESTful API for frontend-backend communication. All endpoints are prefixed with `/api/v1`.

**Base URL**: `https://api.eloinsight.dev/api/v1`  
**Protocol**: HTTPS only  
**Format**: JSON  
**Authentication**: JWT Bearer tokens

## Authentication

### Register
Create a new user account.

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "player@example.com",
  "username": "chessmaster",
  "password": "SecurePass123!"
}
```

**Response** (201 Created):
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "player@example.com",
    "username": "chessmaster",
    "createdAt": "2026-01-11T10:30:00Z"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}
```

### Login
Authenticate existing user.

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "player@example.com",
  "password": "SecurePass123!"
}
```

**Response** (200 OK):
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "player@example.com",
    "username": "chessmaster"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}
```

### Refresh Token
Get new access token using refresh token.

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response** (200 OK):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

## REST Endpoints

### Users

#### Get Current User
```http
GET /api/v1/users/me
Authorization: Bearer {accessToken}
```

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "player@example.com",
  "username": "chessmaster",
  "profile": {
    "firstName": "John",
    "lastName": "Doe",
    "avatarUrl": "https://cdn.eloinsight.dev/avatars/123.jpg",
    "country": "US",
    "timezone": "America/New_York"
  },
  "linkedAccounts": [
    {
      "platform": "chess.com",
      "username": "chessmaster2000",
      "linkedAt": "2026-01-01T00:00:00Z",
      "lastSyncAt": "2026-01-11T10:00:00Z"
    }
  ],
  "settings": {
    "theme": "dark",
    "boardStyle": "classic",
    "autoSync": true,
    "analysisDepth": 20
  }
}
```

#### Update Profile
```http
PUT /api/v1/users/me
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "profile": {
    "firstName": "John",
    "lastName": "Doe",
    "country": "US"
  }
}
```

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "profile": {
    "firstName": "John",
    "lastName": "Doe",
    "country": "US"
  }
}
```

#### Link Account
```http
POST /api/v1/users/link-account
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "platform": "chess.com",
  "username": "chessmaster2000"
}
```

**Response** (201 Created):
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "platform": "chess.com",
  "username": "chessmaster2000",
  "linkedAt": "2026-01-11T10:30:00Z",
  "status": "active"
}
```

### Games

#### List Games
```http
GET /api/v1/games?page=1&limit=20&platform=chess.com&sortBy=playedAt&order=desc
Authorization: Bearer {accessToken}
```

**Query Parameters**:
- `page` (number, default: 1): Page number
- `limit` (number, default: 20, max: 100): Items per page
- `platform` (string, optional): Filter by platform (chess.com, lichess)
- `sortBy` (string, default: playedAt): Sort field
- `order` (string, default: desc): Sort order (asc, desc)
- `result` (string, optional): Filter by result (win, loss, draw)
- `timeControl` (string, optional): Filter by time control

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "platform": "chess.com",
      "externalId": "12345678",
      "whitePlayer": "chessmaster2000",
      "blackPlayer": "opponent123",
      "whiteRating": 1500,
      "blackRating": 1520,
      "result": "1-0",
      "timeControl": "600",
      "openingName": "Sicilian Defense",
      "playedAt": "2026-01-10T15:30:00Z",
      "analysisStatus": "completed",
      "accuracy": {
        "white": 92.5,
        "black": 85.3
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

#### Get Game Details
```http
GET /api/v1/games/{gameId}
Authorization: Bearer {accessToken}
```

**Response** (200 OK):
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "platform": "chess.com",
  "pgn": "[Event \"Live Chess\"]\n[Site \"Chess.com\"]...",
  "whitePlayer": "chessmaster2000",
  "blackPlayer": "opponent123",
  "whiteRating": 1500,
  "blackRating": 1520,
  "result": "1-0",
  "timeControl": "600",
  "openingName": "Sicilian Defense",
  "playedAt": "2026-01-10T15:30:00Z",
  "moves": [
    {
      "moveNumber": 1,
      "white": "e4",
      "black": "c5"
    }
  ],
  "analysis": {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "accuracyWhite": 92.5,
    "accuracyBlack": 85.3,
    "acplWhite": 15.2,
    "acplBlack": 28.7,
    "blundersWhite": 0,
    "blundersBlack": 2,
    "mistakesWhite": 1,
    "mistakesBlack": 3,
    "inaccuraciesWhite": 2,
    "inaccuraciesBlack": 4
  }
}
```

#### Sync Games
Trigger game synchronization from linked platforms.

```http
POST /api/v1/games/sync
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "platform": "chess.com"
}
```

**Response** (202 Accepted):
```json
{
  "jobId": "sync-990e8400-e29b-41d4-a716-446655440004",
  "status": "queued",
  "message": "Game sync job has been queued"
}
```

#### Request Analysis
```http
POST /api/v1/games/{gameId}/analyze
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "depth": 20,
  "priority": "normal"
}
```

**Response** (202 Accepted):
```json
{
  "jobId": "analysis-aa0e8400-e29b-41d4-a716-446655440005",
  "gameId": "770e8400-e29b-41d4-a716-446655440002",
  "status": "queued",
  "estimatedTime": 45
}
```

### Analysis

#### Get Analysis
```http
GET /api/v1/analysis/{analysisId}
Authorization: Bearer {accessToken}
```

**Response** (200 OK):
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440003",
  "gameId": "770e8400-e29b-41d4-a716-446655440002",
  "accuracyWhite": 92.5,
  "accuracyBlack": 85.3,
  "acplWhite": 15.2,
  "acplBlack": 28.7,
  "blundersWhite": 0,
  "blundersBlack": 2,
  "mistakesWhite": 1,
  "mistakesBlack": 3,
  "inaccuraciesWhite": 2,
  "inaccuraciesBlack": 4,
  "performanceRatingWhite": 1650,
  "performanceRatingBlack": 1420,
  "positions": [
    {
      "moveNumber": 1,
      "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
      "evaluation": 25,
      "bestMove": "c5",
      "playedMove": "c5",
      "classification": "best"
    }
  ],
  "analyzedAt": "2026-01-10T15:35:00Z"
}
```

#### Analyze Position (FEN)
```http
POST /api/v1/analysis/position
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
  "depth": 20
}
```

**Response** (200 OK):
```json
{
  "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
  "evaluation": 25,
  "bestMove": "c5",
  "topMoves": [
    {
      "move": "c5",
      "evaluation": 25,
      "pv": "c5 Nf3 Nc6"
    },
    {
      "move": "e5",
      "evaluation": 30,
      "pv": "e5 Nf3 Nc6"
    }
  ],
  "depth": 20,
  "analyzedAt": "2026-01-11T10:30:00Z"
}
```

### Statistics

#### Get User Statistics
```http
GET /api/v1/stats/overview
Authorization: Bearer {accessToken}
```

**Response** (200 OK):
```json
{
  "totalGames": 150,
  "winRate": 52.3,
  "averageAccuracy": 88.5,
  "averageACPL": 22.3,
  "favoriteOpening": "Sicilian Defense",
  "ratingProgression": [
    {
      "date": "2026-01-01",
      "rating": 1450
    },
    {
      "date": "2026-01-11",
      "rating": 1500
    }
  ],
  "timeControlDistribution": {
    "blitz": 60,
    "rapid": 30,
    "classical": 10
  },
  "recentPerformance": {
    "last10Games": {
      "wins": 6,
      "losses": 3,
      "draws": 1
    },
    "averageAccuracy": 90.2
  }
}
```

## Request/Response Format

### Standard Response Envelope
```json
{
  "data": { },
  "meta": {
    "timestamp": "2026-01-11T10:30:00Z",
    "requestId": "req-123456"
  }
}
```

### Pagination
```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Error Handling

### Error Response Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-01-11T10:30:00Z",
    "requestId": "req-123456"
  }
}
```

### HTTP Status Codes
| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST |
| 202 | Accepted | Async operation queued |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Missing/invalid auth token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists |
| 422 | Unprocessable Entity | Validation failed |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service down |

### Error Codes
```typescript
enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}
```

## Rate Limiting

### Limits
- **Anonymous**: 10 requests/minute
- **Authenticated**: 100 requests/minute
- **Premium** (future): 1000 requests/minute

### Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1641900000
```

### Rate Limit Exceeded Response
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retryAfter": 60
  }
}
```

## Versioning

### URL Versioning
Current version: `v1`

```
/api/v1/games
/api/v2/games  (future)
```

### Deprecation Policy
- Minimum 6 months notice
- Deprecation warnings in headers
- Migration guide provided

```http
Deprecation: true
Sunset: Sat, 1 Jul 2026 00:00:00 GMT
Link: <https://docs.eloinsight.dev/migration/v2>; rel="deprecation"
```

---

**Next Steps**: See [grpc-design.md](grpc-design.md) for inter-service communication.
