# gRPC Design

## Table of Contents
- [Overview](#overview)
- [Protocol Buffers](#protocol-buffers)
- [Service Definitions](#service-definitions)
- [Communication Patterns](#communication-patterns)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

## Overview

EloInsight uses gRPC for inter-service communication to achieve:
- **High Performance**: Binary protocol (Protocol Buffers)
- **Type Safety**: Strongly typed contracts
- **Code Generation**: Auto-generate client/server code
- **Streaming**: Support for bi-directional streaming

## Protocol Buffers

### Directory Structure
```
proto/
├── user/
│   └── user.proto
├── game/
│   ├── game.proto
│   └── sync.proto
├── analysis/
│   └── analysis.proto
├── metadata/
│   └── metadata.proto
└── common/
    ├── pagination.proto
    └── timestamp.proto
```

### Common Types

#### pagination.proto
```protobuf
syntax = "proto3";

package common;

message PaginationRequest {
  int32 page = 1;
  int32 limit = 2;
  string sort_by = 3;
  string order = 4; // "asc" or "desc"
}

message PaginationResponse {
  int32 page = 1;
  int32 limit = 2;
  int64 total = 3;
  int32 total_pages = 4;
  bool has_next = 5;
  bool has_prev = 6;
}
```

## Service Definitions

### User Service

#### user.proto
```protobuf
syntax = "proto3";

package user;

import "google/protobuf/timestamp.proto";
import "common/pagination.proto";

service UserService {
  // User management
  rpc CreateUser(CreateUserRequest) returns (User);
  rpc GetUser(GetUserRequest) returns (User);
  rpc UpdateUser(UpdateUserRequest) returns (User);
  rpc DeleteUser(DeleteUserRequest) returns (Empty);
  
  // Authentication
  rpc ValidateToken(ValidateTokenRequest) returns (ValidateTokenResponse);
  
  // Account linking
  rpc LinkAccount(LinkAccountRequest) returns (LinkedAccount);
  rpc UnlinkAccount(UnlinkAccountRequest) returns (Empty);
  rpc GetLinkedAccounts(GetLinkedAccountsRequest) returns (LinkedAccountsList);
  
  // Settings
  rpc UpdateSettings(UpdateSettingsRequest) returns (UserSettings);
  rpc GetSettings(GetSettingsRequest) returns (UserSettings);
}

message User {
  string id = 1;
  string email = 2;
  string username = 3;
  UserProfile profile = 4;
  repeated LinkedAccount linked_accounts = 5;
  UserSettings settings = 6;
  google.protobuf.Timestamp created_at = 7;
  google.protobuf.Timestamp updated_at = 8;
}

message UserProfile {
  string first_name = 1;
  string last_name = 2;
  string avatar_url = 3;
  string bio = 4;
  string country = 5;
  string timezone = 6;
}

message LinkedAccount {
  string id = 1;
  string user_id = 2;
  string platform = 3; // "chess.com" or "lichess"
  string platform_username = 4;
  google.protobuf.Timestamp linked_at = 5;
  google.protobuf.Timestamp last_sync_at = 6;
}

message UserSettings {
  string user_id = 1;
  string theme = 2;
  string board_style = 3;
  string piece_set = 4;
  bool auto_sync = 5;
  bool email_notifications = 6;
  int32 analysis_depth = 7;
}

message CreateUserRequest {
  string email = 1;
  string username = 2;
  string password = 3;
}

message GetUserRequest {
  string id = 1;
}

message UpdateUserRequest {
  string id = 1;
  UserProfile profile = 2;
}

message DeleteUserRequest {
  string id = 1;
}

message ValidateTokenRequest {
  string token = 1;
}

message ValidateTokenResponse {
  bool valid = 1;
  string user_id = 2;
}

message LinkAccountRequest {
  string user_id = 1;
  string platform = 2;
  string platform_username = 3;
  string access_token = 4;
}

message UnlinkAccountRequest {
  string user_id = 1;
  string platform = 2;
}

message GetLinkedAccountsRequest {
  string user_id = 1;
}

message LinkedAccountsList {
  repeated LinkedAccount accounts = 1;
}

message UpdateSettingsRequest {
  string user_id = 1;
  UserSettings settings = 2;
}

message GetSettingsRequest {
  string user_id = 1;
}

message Empty {}
```

### Game Service

#### game.proto
```protobuf
syntax = "proto3";

package game;

import "google/protobuf/timestamp.proto";
import "common/pagination.proto";

service GameService {
  // Game CRUD
  rpc CreateGame(CreateGameRequest) returns (Game);
  rpc GetGame(GetGameRequest) returns (Game);
  rpc ListGames(ListGamesRequest) returns (ListGamesResponse);
  rpc DeleteGame(DeleteGameRequest) returns (Empty);
  
  // Batch operations
  rpc BatchCreateGames(BatchCreateGamesRequest) returns (BatchCreateGamesResponse);
}

message Game {
  string id = 1;
  string user_id = 2;
  string platform = 3;
  string external_id = 4;
  string pgn = 5;
  string white_player = 6;
  string black_player = 7;
  int32 white_rating = 8;
  int32 black_rating = 9;
  string result = 10; // "1-0", "0-1", "1/2-1/2"
  string time_control = 11;
  string opening_name = 12;
  google.protobuf.Timestamp played_at = 13;
  google.protobuf.Timestamp synced_at = 14;
  string analysis_status = 15; // "pending", "processing", "completed", "failed"
}

message CreateGameRequest {
  string user_id = 1;
  string platform = 2;
  string external_id = 3;
  string pgn = 4;
  string white_player = 5;
  string black_player = 6;
  int32 white_rating = 7;
  int32 black_rating = 8;
  string result = 9;
  string time_control = 10;
  string opening_name = 11;
  google.protobuf.Timestamp played_at = 12;
}

message GetGameRequest {
  string id = 1;
}

message ListGamesRequest {
  string user_id = 1;
  string platform = 2;
  string result = 3;
  string time_control = 4;
  common.PaginationRequest pagination = 5;
}

message ListGamesResponse {
  repeated Game games = 1;
  common.PaginationResponse pagination = 2;
}

message DeleteGameRequest {
  string id = 1;
}

message BatchCreateGamesRequest {
  repeated CreateGameRequest games = 1;
}

message BatchCreateGamesResponse {
  repeated Game games = 1;
  int32 created_count = 2;
  int32 skipped_count = 3;
}

message Empty {}
```

#### sync.proto
```protobuf
syntax = "proto3";

package game;

import "google/protobuf/timestamp.proto";

service GameSyncService {
  // Sync operations
  rpc SyncGames(SyncGamesRequest) returns (stream SyncProgress);
  rpc GetSyncStatus(GetSyncStatusRequest) returns (SyncStatus);
}

message SyncGamesRequest {
  string user_id = 1;
  string platform = 2; // "chess.com" or "lichess"
  string platform_username = 3;
  google.protobuf.Timestamp since = 4; // Optional: sync games after this date
}

message SyncProgress {
  string job_id = 1;
  string status = 2; // "started", "fetching", "parsing", "saving", "completed", "failed"
  int32 total_games = 3;
  int32 processed_games = 4;
  int32 new_games = 5;
  string current_archive = 6;
  string error_message = 7;
}

message GetSyncStatusRequest {
  string job_id = 1;
}

message SyncStatus {
  string job_id = 1;
  string status = 2;
  int32 total_games = 3;
  int32 processed_games = 4;
  google.protobuf.Timestamp started_at = 5;
  google.protobuf.Timestamp completed_at = 6;
}
```

### Analysis Service

#### analysis.proto
```protobuf
syntax = "proto3";

package analysis;

import "google/protobuf/timestamp.proto";

service AnalysisService {
  // Analysis operations
  rpc AnalyzeGame(AnalyzeGameRequest) returns (stream AnalysisProgress);
  rpc GetAnalysis(GetAnalysisRequest) returns (Analysis);
  rpc AnalyzePosition(AnalyzePositionRequest) returns (PositionAnalysis);
  
  // Batch operations
  rpc BatchAnalyzeGames(BatchAnalyzeGamesRequest) returns (BatchAnalyzeGamesResponse);
}

message AnalyzeGameRequest {
  string game_id = 1;
  int32 depth = 2;
  int32 priority = 3; // 1-10, higher = more priority
}

message AnalysisProgress {
  string job_id = 1;
  string game_id = 2;
  string status = 3; // "queued", "analyzing", "completed", "failed"
  int32 total_positions = 4;
  int32 analyzed_positions = 5;
  int32 current_move = 6;
  string error_message = 7;
}

message GetAnalysisRequest {
  string game_id = 1;
}

message Analysis {
  string id = 1;
  string game_id = 2;
  double accuracy_white = 3;
  double accuracy_black = 4;
  double acpl_white = 5;
  double acpl_black = 6;
  int32 blunders_white = 7;
  int32 blunders_black = 8;
  int32 mistakes_white = 9;
  int32 mistakes_black = 10;
  int32 inaccuracies_white = 11;
  int32 inaccuracies_black = 12;
  int32 performance_rating_white = 13;
  int32 performance_rating_black = 14;
  repeated PositionAnalysis positions = 15;
  google.protobuf.Timestamp analyzed_at = 16;
  int32 analysis_depth = 17;
}

message PositionAnalysis {
  int32 move_number = 1;
  string fen = 2;
  int32 evaluation = 3; // in centipawns
  string best_move = 4;
  string played_move = 5;
  bool is_blunder = 6;
  bool is_mistake = 7;
  bool is_inaccuracy = 8;
  string classification = 9; // "best", "excellent", "good", "inaccuracy", "mistake", "blunder"
  repeated string pv = 10; // Principal variation
}

message AnalyzePositionRequest {
  string fen = 1;
  int32 depth = 2;
  int32 multi_pv = 3; // Number of top moves to return
}

message BatchAnalyzeGamesRequest {
  repeated string game_ids = 1;
  int32 depth = 2;
}

message BatchAnalyzeGamesResponse {
  repeated string job_ids = 1;
  int32 queued_count = 2;
}
```

### Metadata Service

#### metadata.proto
```protobuf
syntax = "proto3";

package metadata;

import "google/protobuf/timestamp.proto";

service MetadataService {
  // Statistics
  rpc GetUserStatistics(GetUserStatisticsRequest) returns (UserStatistics);
  rpc GetOpeningStatistics(GetOpeningStatisticsRequest) returns (OpeningStatistics);
  
  // Insights
  rpc GenerateInsights(GenerateInsightsRequest) returns (Insights);
  
  // Patterns
  rpc IdentifyPatterns(IdentifyPatternsRequest) returns (Patterns);
}

message GetUserStatisticsRequest {
  string user_id = 1;
  google.protobuf.Timestamp start_date = 2;
  google.protobuf.Timestamp end_date = 3;
}

message UserStatistics {
  int32 total_games = 1;
  double win_rate = 2;
  double average_accuracy = 3;
  double average_acpl = 4;
  string favorite_opening = 5;
  repeated RatingPoint rating_progression = 6;
  map<string, int32> time_control_distribution = 7;
  RecentPerformance recent_performance = 8;
}

message RatingPoint {
  google.protobuf.Timestamp date = 1;
  int32 rating = 2;
}

message RecentPerformance {
  int32 wins = 1;
  int32 losses = 2;
  int32 draws = 3;
  double average_accuracy = 4;
}

message GetOpeningStatisticsRequest {
  string user_id = 1;
  string opening_name = 2;
}

message OpeningStatistics {
  string opening_name = 1;
  int32 games_played = 2;
  double win_rate = 3;
  double average_accuracy = 4;
  repeated string common_variations = 5;
}

message GenerateInsightsRequest {
  string user_id = 1;
}

message Insights {
  repeated string strengths = 1;
  repeated string weaknesses = 2;
  repeated string recommendations = 3;
  repeated TacticalPattern common_patterns = 4;
}

message IdentifyPatternsRequest {
  string user_id = 1;
}

message Patterns {
  repeated TacticalPattern patterns = 1;
}

message TacticalPattern {
  string pattern_type = 1; // "fork", "pin", "skewer", etc.
  int32 occurrences = 2;
  double success_rate = 3;
}
```

## Communication Patterns

### Unary RPC
Simple request-response pattern.

```go
// Client
ctx := context.Background()
user, err := client.GetUser(ctx, &pb.GetUserRequest{
    Id: "user-123",
})
```

### Server Streaming
Server sends multiple responses.

```go
// Client
stream, err := client.SyncGames(ctx, &pb.SyncGamesRequest{
    UserId: "user-123",
    Platform: "chess.com",
})

for {
    progress, err := stream.Recv()
    if err == io.EOF {
        break
    }
    fmt.Printf("Progress: %d/%d\n", progress.ProcessedGames, progress.TotalGames)
}
```

### Client Streaming
Client sends multiple requests.

```go
// Client
stream, err := client.BatchCreateGames(ctx)
for _, game := range games {
    stream.Send(&pb.CreateGameRequest{...})
}
response, err := stream.CloseAndRecv()
```

### Bidirectional Streaming
Both client and server send streams.

```go
// Client
stream, err := client.AnalyzeGames(ctx)

go func() {
    for _, gameId := range gameIds {
        stream.Send(&pb.AnalyzeGameRequest{GameId: gameId})
    }
    stream.CloseSend()
}()

for {
    result, err := stream.Recv()
    if err == io.EOF {
        break
    }
    // Process result
}
```

## Error Handling

### gRPC Status Codes
```go
import "google.golang.org/grpc/codes"
import "google.golang.org/grpc/status"

// Return error
return nil, status.Errorf(codes.NotFound, "game not found: %s", gameId)

// Check error
if err != nil {
    st, ok := status.FromError(err)
    if ok {
        switch st.Code() {
        case codes.NotFound:
            // Handle not found
        case codes.InvalidArgument:
            // Handle invalid argument
        }
    }
}
```

### Custom Error Details
```protobuf
message ErrorDetails {
  string code = 1;
  string message = 2;
  map<string, string> metadata = 3;
}
```

```go
st := status.New(codes.InvalidArgument, "validation failed")
st, _ = st.WithDetails(&pb.ErrorDetails{
    Code: "VALIDATION_ERROR",
    Message: "Invalid email format",
    Metadata: map[string]string{
        "field": "email",
    },
})
return st.Err()
```

## Best Practices

### 1. Use Streaming for Long Operations
```protobuf
// Good: Stream progress updates
rpc AnalyzeGame(AnalyzeGameRequest) returns (stream AnalysisProgress);

// Bad: Single response after long wait
rpc AnalyzeGame(AnalyzeGameRequest) returns (Analysis);
```

### 2. Include Pagination
```protobuf
message ListGamesRequest {
  string user_id = 1;
  common.PaginationRequest pagination = 2;
}
```

### 3. Use Timestamps
```protobuf
import "google/protobuf/timestamp.proto";

message Game {
  google.protobuf.Timestamp played_at = 1;
}
```

### 4. Version Your Services
```protobuf
package game.v1;

service GameService {
  // ...
}
```

### 5. Add Metadata
```go
// Client
md := metadata.Pairs(
    "user-id", "123",
    "request-id", "req-456",
)
ctx := metadata.NewOutgoingContext(context.Background(), md)
```

### 6. Implement Timeouts
```go
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

response, err := client.GetUser(ctx, request)
```

### 7. Use Interceptors
```go
// Logging interceptor
func loggingInterceptor(
    ctx context.Context,
    req interface{},
    info *grpc.UnaryServerInfo,
    handler grpc.UnaryHandler,
) (interface{}, error) {
    start := time.Now()
    resp, err := handler(ctx, req)
    log.Printf("Method: %s, Duration: %v", info.FullMethod, time.Since(start))
    return resp, err
}
```

## NestJS gRPC Client Implementation

The API Gateway connects to backend gRPC services using NestJS microservices.

### Setup

#### 1. Install Dependencies

```bash
npm install @nestjs/microservices @grpc/grpc-js @grpc/proto-loader
```

#### 2. Project Structure

```
api-gateway/
├── proto/
│   └── analysis.proto       # Shared proto file
├── src/
│   └── analysis/
│       ├── analysis.module.ts
│       ├── analysis.controller.ts
│       ├── analysis-grpc.service.ts   # gRPC client
│       └── dto/
│           └── analysis.dto.ts
```

#### 3. gRPC Client Service

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ClientProxyFactory, Transport, ClientGrpc } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { Observable, firstValueFrom, timeout } from 'rxjs';
import { join } from 'path';
import { Metadata } from '@grpc/grpc-js';

@Injectable()
export class AnalysisGrpcService implements OnModuleInit {
  private analysisClient: AnalysisServiceClient;
  private grpcClient: ClientGrpc;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const host = this.configService.get('ANALYSIS_SERVICE_HOST', 'localhost');
    const port = this.configService.get('ANALYSIS_SERVICE_PORT', 50051);

    this.grpcClient = ClientProxyFactory.create({
      transport: Transport.GRPC,
      options: {
        package: 'analysis',
        protoPath: join(__dirname, '../../proto/analysis.proto'),
        url: `${host}:${port}`,
        loader: {
          keepCase: false,  // Convert to camelCase
          longs: Number,
          enums: Number,
          defaults: true,
          oneofs: true,
        },
      },
    }) as ClientGrpc;

    this.analysisClient = this.grpcClient.getService('AnalysisService');
  }

  // Unary call with auth propagation
  async analyzePosition(request: AnalyzePositionRequest, userId?: string) {
    const metadata = new Metadata();
    if (userId) metadata.set('x-user-id', userId);

    return firstValueFrom(
      this.analysisClient.analyzePosition(request, metadata).pipe(
        timeout(60000),
      ),
    );
  }

  // Server streaming
  analyzeGameStream(request: AnalyzeGameRequest): Observable<GameAnalysisProgress> {
    return this.analysisClient.analyzeGameStream(request);
  }
}
```

### Auth Propagation

Pass authentication context via gRPC metadata:

```typescript
private createMetadata(userId?: string, requestId?: string): Metadata {
  const metadata = new Metadata();
  if (userId) {
    metadata.set('x-user-id', userId);
  }
  if (requestId) {
    metadata.set('x-request-id', requestId);
  }
  metadata.set('x-client', 'api-gateway');
  return metadata;
}
```

### Error Handling

Map gRPC status codes to HTTP exceptions:

```typescript
import { status } from '@grpc/grpc-js';
import { HttpException, HttpStatus } from '@nestjs/common';

private handleGrpcError(error: any): never {
  const grpcStatus = error.code || status.UNKNOWN;

  const statusMap: Record<number, HttpStatus> = {
    [status.INVALID_ARGUMENT]: HttpStatus.BAD_REQUEST,
    [status.NOT_FOUND]: HttpStatus.NOT_FOUND,
    [status.UNAVAILABLE]: HttpStatus.SERVICE_UNAVAILABLE,
    [status.DEADLINE_EXCEEDED]: HttpStatus.GATEWAY_TIMEOUT,
    [status.RESOURCE_EXHAUSTED]: HttpStatus.TOO_MANY_REQUESTS,
    [status.INTERNAL]: HttpStatus.INTERNAL_SERVER_ERROR,
  };

  throw new HttpException(
    { message: error.details || 'Service error' },
    statusMap[grpcStatus] || HttpStatus.INTERNAL_SERVER_ERROR,
  );
}
```

### Streaming with SSE

Expose gRPC streams as Server-Sent Events:

```typescript
@Sse()
@Post('game/:gameId/stream')
analyzeGameStream(
  @Param('gameId') gameId: string,
  @Body() dto: AnalyzeGameDto,
): Observable<MessageEvent> {
  return this.analysisService.analyzeGameStream({
    gameId,
    pgn: dto.pgn,
  }).pipe(
    map((progress) => ({
      data: {
        currentMove: progress.currentMove,
        totalMoves: progress.totalMoves,
        status: progress.status,
      },
    } as MessageEvent)),
    catchError((err) => of({
      data: { error: err.message },
    } as MessageEvent)),
  );
}
```

### Service Configuration

Environment variables in `.env`:

```bash
# gRPC Services
ANALYSIS_SERVICE_HOST=localhost
ANALYSIS_SERVICE_PORT=50051
ANALYSIS_TIMEOUT_MS=60000
```

### Testing gRPC Connections

```bash
# Test with grpcurl
grpcurl -plaintext localhost:50051 list
grpcurl -plaintext localhost:50051 analysis.AnalysisService/HealthCheck

# Test with curl through API Gateway
curl -X GET http://localhost:4000/api/v1/analysis/health
```

### Service Communication Flow

```
┌─────────────────┐     REST/SSE      ┌─────────────────┐
│                 │◄─────────────────►│                 │
│    Frontend     │                   │   API Gateway   │
│   (Next.js)     │                   │    (NestJS)     │
│                 │                   │                 │
└─────────────────┘                   └────────┬────────┘
                                               │
                                               │ gRPC
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          │                          │
                    ▼                          ▼                          ▼
           ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
           │                 │      │                 │      │                 │
           │ Analysis Service│      │ Game Sync       │      │ User Service    │
           │     (Go)        │      │ Service (NestJS)│      │   (NestJS)      │
           │                 │      │                 │      │                 │
           └────────┬────────┘      └────────┬────────┘      └────────┬────────┘
                    │                        │                        │
                    │                        │                        │
                    ▼                        ▼                        ▼
           ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
           │   Stockfish     │      │   Chess.com     │      │   PostgreSQL    │
           │                 │      │   Lichess APIs  │      │                 │
           └─────────────────┘      └─────────────────┘      └─────────────────┘
```

---

**Related Documentation:**
- [Stockfish Integration](stockfish-integration.md) - Analysis service details
- [Game Sync](game-sync.md) - Game sync service
- [API Design](api-design.md) - REST API specifications

