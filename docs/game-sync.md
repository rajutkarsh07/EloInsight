# Game Synchronization

## Table of Contents
- [Overview](#overview)
- [Chess.com Integration](#chesscom-integration)
- [Lichess Integration](#lichess-integration)
- [Sync Strategy](#sync-strategy)
- [Error Handling](#error-handling)

## Overview

The Game Sync Service automatically fetches games from Chess.com and Lichess using their public APIs.

### Features
- **Automatic Sync**: Periodic background synchronization
- **Incremental Sync**: Only fetch new games
- **Deduplication**: Prevent duplicate games
- **Rate Limiting**: Respect API rate limits
- **Error Recovery**: Retry failed requests

## Chess.com Integration

### API Overview
Chess.com provides a public API (no authentication required for public data).

**Base URL**: `https://api.chess.com/pub/`

### Key Endpoints

#### 1. Get Player Profile
```http
GET /player/{username}
```

**Response**:
```json
{
  "@id": "https://api.chess.com/pub/player/hikaru",
  "username": "Hikaru",
  "player_id": 15448422,
  "title": "GM",
  "status": "premium",
  "name": "Hikaru Nakamura",
  "avatar": "https://...",
  "location": "United States",
  "country": "US",
  "joined": 1301270400,
  "last_online": 1641900000,
  "followers": 123456
}
```

#### 2. Get Game Archives
```http
GET /player/{username}/games/archives
```

**Response**:
```json
{
  "archives": [
    "https://api.chess.com/pub/player/hikaru/games/2026/01",
    "https://api.chess.com/pub/player/hikaru/games/2025/12",
    ...
  ]
}
```

#### 3. Get Monthly Games
```http
GET /player/{username}/games/{YYYY}/{MM}
```

**Response**:
```json
{
  "games": [
    {
      "url": "https://www.chess.com/game/live/12345678",
      "pgn": "[Event \"Live Chess\"]\n[Site \"Chess.com\"]...",
      "time_control": "600",
      "end_time": 1641900000,
      "rated": true,
      "tcn": "...",
      "uuid": "...",
      "initial_setup": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "fen": "...",
      "time_class": "rapid",
      "rules": "chess",
      "white": {
        "rating": 1500,
        "result": "win",
        "username": "player1",
        "@id": "https://api.chess.com/pub/player/player1"
      },
      "black": {
        "rating": 1520,
        "result": "checkmated",
        "username": "player2",
        "@id": "https://api.chess.com/pub/player/player2"
      }
    }
  ]
}
```

### Implementation

```go
package chesscom

import (
    "encoding/json"
    "fmt"
    "net/http"
    "time"
)

type Client struct {
    httpClient *http.Client
    baseURL    string
    userAgent  string
}

func NewClient() *Client {
    return &Client{
        httpClient: &http.Client{Timeout: 30 * time.Second},
        baseURL:    "https://api.chess.com/pub",
        userAgent:  "EloInsight/1.0 (contact@eloinsight.dev)",
    }
}

func (c *Client) GetArchives(username string) ([]string, error) {
    url := fmt.Sprintf("%s/player/%s/games/archives", c.baseURL, username)
    
    req, _ := http.NewRequest("GET", url, nil)
    req.Header.Set("User-Agent", c.userAgent)
    
    resp, err := c.httpClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    
    if resp.StatusCode != 200 {
        return nil, fmt.Errorf("API error: %d", resp.StatusCode)
    }
    
    var result struct {
        Archives []string `json:"archives"`
    }
    
    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        return nil, err
    }
    
    return result.Archives, nil
}

func (c *Client) GetMonthlyGames(archiveURL string) ([]Game, error) {
    req, _ := http.NewRequest("GET", archiveURL, nil)
    req.Header.Set("User-Agent", c.userAgent)
    
    resp, err := c.httpClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    
    var result struct {
        Games []Game `json:"games"`
    }
    
    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        return nil, err
    }
    
    return result.Games, nil
}

type Game struct {
    URL         string    `json:"url"`
    PGN         string    `json:"pgn"`
    TimeControl string    `json:"time_control"`
    EndTime     int64     `json:"end_time"`
    Rated       bool      `json:"rated"`
    TimeClass   string    `json:"time_class"`
    White       Player    `json:"white"`
    Black       Player    `json:"black"`
}

type Player struct {
    Username string `json:"username"`
    Rating   int    `json:"rating"`
    Result   string `json:"result"`
}
```

### Rate Limiting

Chess.com rate limits: **300 requests per minute**

```go
type RateLimiter struct {
    requests chan time.Time
    limit    int
    window   time.Duration
}

func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
    rl := &RateLimiter{
        requests: make(chan time.Time, limit),
        limit:    limit,
        window:   window,
    }
    
    // Cleanup old requests
    go rl.cleanup()
    
    return rl
}

func (rl *RateLimiter) Wait() {
    now := time.Now()
    
    if len(rl.requests) >= rl.limit {
        oldest := <-rl.requests
        waitTime := rl.window - time.Since(oldest)
        if waitTime > 0 {
            time.Sleep(waitTime)
        }
    }
    
    rl.requests <- now
}
```

## Lichess Integration

### API Overview
Lichess provides a comprehensive public API.

**Base URL**: `https://lichess.org/api/`

### Key Endpoints

#### 1. Get User Games
```http
GET /api/games/user/{username}?max=100&pgnInJson=true
```

**Headers**:
```
Accept: application/x-ndjson
```

**Response** (NDJSON - newline delimited JSON):
```json
{"id":"abc123","rated":true,"variant":"standard","speed":"blitz","perf":"blitz","createdAt":1641900000000,"lastMoveAt":1641900600000,"status":"mate","players":{"white":{"user":{"name":"player1","id":"player1"},"rating":1500},"black":{"user":{"name":"player2","id":"player2"},"rating":1520}},"winner":"white","moves":"e4 e5 Nf3...","pgn":"[Event \"Rated Blitz game\"]..."}
{"id":"def456",...}
```

#### 2. Export Game
```http
GET /game/export/{gameId}?pgnInJson=true
```

### Implementation

```go
package lichess

import (
    "bufio"
    "encoding/json"
    "fmt"
    "net/http"
    "time"
)

type Client struct {
    httpClient *http.Client
    baseURL    string
}

func NewClient() *Client {
    return &Client{
        httpClient: &http.Client{Timeout: 60 * time.Second},
        baseURL:    "https://lichess.org/api",
    }
}

func (c *Client) GetUserGames(username string, since time.Time) ([]Game, error) {
    url := fmt.Sprintf("%s/games/user/%s", c.baseURL, username)
    
    req, _ := http.NewRequest("GET", url, nil)
    req.Header.Set("Accept", "application/x-ndjson")
    
    // Query parameters
    q := req.URL.Query()
    q.Add("max", "100")
    q.Add("pgnInJson", "true")
    q.Add("since", fmt.Sprintf("%d", since.UnixMilli()))
    req.URL.RawQuery = q.Encode()
    
    resp, err := c.httpClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    
    var games []Game
    scanner := bufio.NewScanner(resp.Body)
    
    for scanner.Scan() {
        var game Game
        if err := json.Unmarshal(scanner.Bytes(), &game); err != nil {
            continue
        }
        games = append(games, game)
    }
    
    return games, nil
}

type Game struct {
    ID        string    `json:"id"`
    Rated     bool      `json:"rated"`
    Variant   string    `json:"variant"`
    Speed     string    `json:"speed"`
    Status    string    `json:"status"`
    CreatedAt int64     `json:"createdAt"`
    Players   Players   `json:"players"`
    Winner    string    `json:"winner"`
    PGN       string    `json:"pgn"`
}

type Players struct {
    White PlayerInfo `json:"white"`
    Black PlayerInfo `json:"black"`
}

type PlayerInfo struct {
    User   User `json:"user"`
    Rating int  `json:"rating"`
}

type User struct {
    Name string `json:"name"`
    ID   string `json:"id"`
}
```

### Rate Limiting

Lichess rate limits: **15 requests per second** for game export

```go
func (c *Client) GetUserGamesWithRateLimit(username string, since time.Time) ([]Game, error) {
    rateLimiter := time.NewTicker(70 * time.Millisecond) // ~14 req/sec
    defer rateLimiter.Stop()
    
    <-rateLimiter.C
    return c.GetUserGames(username, since)
}
```

## Sync Strategy

### Incremental Sync

```go
type SyncService struct {
    chesscomClient *chesscom.Client
    lichessClient  *lichess.Client
    db             *Database
    queue          *Queue
}

func (s *SyncService) SyncUser(userID string) error {
    // Get linked accounts
    accounts, err := s.db.GetLinkedAccounts(userID)
    if err != nil {
        return err
    }
    
    for _, account := range accounts {
        switch account.Platform {
        case "chess.com":
            s.syncChessCom(userID, account)
        case "lichess":
            s.syncLichess(userID, account)
        }
    }
    
    return nil
}

func (s *SyncService) syncChessCom(userID string, account LinkedAccount) error {
    // Get last sync time
    lastSync := account.LastSyncAt
    if lastSync.IsZero() {
        lastSync = time.Now().AddDate(0, -6, 0) // Last 6 months
    }
    
    // Get archives
    archives, err := s.chesscomClient.GetArchives(account.PlatformUsername)
    if err != nil {
        return err
    }
    
    // Filter archives after last sync
    relevantArchives := filterArchivesSince(archives, lastSync)
    
    // Fetch games from each archive
    for _, archiveURL := range relevantArchives {
        games, err := s.chesscomClient.GetMonthlyGames(archiveURL)
        if err != nil {
            continue
        }
        
        // Process games
        for _, game := range games {
            if time.Unix(game.EndTime, 0).After(lastSync) {
                s.processGame(userID, "chess.com", game)
            }
        }
    }
    
    // Update last sync time
    s.db.UpdateLastSync(account.ID, time.Now())
    
    return nil
}
```

### Deduplication

```go
func (s *SyncService) processGame(userID, platform string, game interface{}) error {
    // Extract game data
    gameData := s.extractGameData(platform, game)
    
    // Check if game already exists
    exists, err := s.db.GameExists(platform, gameData.ExternalID)
    if err != nil {
        return err
    }
    
    if exists {
        return nil // Skip duplicate
    }
    
    // Save game
    savedGame, err := s.db.CreateGame(userID, gameData)
    if err != nil {
        return err
    }
    
    // Queue for analysis
    s.queue.Publish("analysis-queue", AnalysisJob{
        GameID: savedGame.ID,
        UserID: userID,
        Depth:  20,
    })
    
    return nil
}
```

### Background Sync

```go
func (s *SyncService) StartBackgroundSync() {
    ticker := time.NewTicker(1 * time.Hour)
    
    go func() {
        for range ticker.C {
            users, _ := s.db.GetUsersWithAutoSync()
            
            for _, user := range users {
                go s.SyncUser(user.ID)
            }
        }
    }()
}
```

## Error Handling

### Retry Logic

```go
func (s *SyncService) fetchWithRetry(fn func() error, maxRetries int) error {
    var err error
    
    for i := 0; i < maxRetries; i++ {
        err = fn()
        if err == nil {
            return nil
        }
        
        // Exponential backoff
        backoff := time.Duration(math.Pow(2, float64(i))) * time.Second
        time.Sleep(backoff)
    }
    
    return err
}
```

### Error Classification

```go
func classifyError(err error) string {
    if err == nil {
        return "none"
    }
    
    switch {
    case strings.Contains(err.Error(), "404"):
        return "not_found"
    case strings.Contains(err.Error(), "429"):
        return "rate_limited"
    case strings.Contains(err.Error(), "timeout"):
        return "timeout"
    default:
        return "unknown"
    }
}
```

---

**Next Steps**: See [security.md](security.md) for security best practices.
