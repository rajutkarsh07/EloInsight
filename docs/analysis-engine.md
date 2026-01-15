# Analysis Engine

## Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Metrics Calculation](#metrics-calculation)
- [Classification System](#classification-system)
- [Performance Optimization](#performance-optimization)
- [Error Handling](#error-handling)

## Overview

The Analysis Engine is a high-performance Go service that interfaces with Stockfish to analyze chess games and calculate comprehensive metrics.

### Key Features
- **Stockfish Integration**: UCI protocol communication
- **Parallel Processing**: Worker pool for concurrent analysis
- **Metric Calculation**: Accuracy, ACPL, blunders, mistakes
- **Performance Rating**: Calculate performance rating per game
- **Position Classification**: Categorize each move
- **Caching**: Redis caching for analyzed positions

## Architecture

### Component Diagram
```
┌─────────────────────────────────────────────┐
│         Analysis Engine (Go)                 │
│                                              │
│  ┌──────────────┐      ┌─────────────────┐ │
│  │Queue Consumer│─────>│Analysis Manager │ │
│  └──────────────┘      └────────┬────────┘ │
│                                  │          │
│                         ┌────────▼────────┐ │
│                         │ Stockfish Pool  │ │
│                         │  ┌───┐ ┌───┐   │ │
│                         │  │SF1│ │SF2│...│ │
│                         │  └───┘ └───┘   │ │
│                         └────────┬────────┘ │
│                                  │          │
│                         ┌────────▼────────┐ │
│                         │Metrics Calculator│ │
│                         └────────┬────────┘ │
│                                  │          │
│                         ┌────────▼────────┐ │
│                         │  Result Saver   │ │
│                         └─────────────────┘ │
└─────────────────────────────────────────────┘
```

### Service Structure
```go
type AnalysisEngine struct {
    stockfishPool *StockfishPool
    db            *Database
    cache         *RedisCache
    queue         *RabbitMQ
    config        *Config
}

type StockfishPool struct {
    engines chan *Engine
    size    int
    config  EngineConfig
}

type Engine struct {
    process *exec.Cmd
    stdin   io.WriteCloser
    stdout  io.ReadCloser
    mu      sync.Mutex
}
```

## Metrics Calculation

### 1. Accuracy Percentage

Accuracy measures how close a player's moves are to the best moves.

**Formula**:
```
Accuracy = 100 - (Total Loss / Maximum Possible Loss) * 100
```

**Implementation**:
```go
func CalculateAccuracy(positions []PositionAnalysis) float64 {
    totalLoss := 0.0
    moveCount := 0
    
    for _, pos := range positions {
        if pos.CentipawnLoss > 0 {
            // Cap loss at 500 centipawns per move
            loss := math.Min(float64(pos.CentipawnLoss), 500.0)
            totalLoss += loss
            moveCount++
        }
    }
    
    if moveCount == 0 {
        return 100.0
    }
    
    // Maximum possible loss: 500 per move
    maxPossibleLoss := float64(moveCount) * 500.0
    accuracy := 100.0 - (totalLoss / maxPossibleLoss * 100.0)
    
    return math.Max(0, math.Min(100, accuracy))
}
```

### 2. Average Centipawn Loss (ACPL)

ACPL is the average evaluation loss per move.

**Formula**:
```
ACPL = Sum of Centipawn Losses / Number of Moves
```

**Implementation**:
```go
func CalculateACPL(positions []PositionAnalysis) float64 {
    totalLoss := 0.0
    moveCount := 0
    
    for _, pos := range positions {
        if pos.CentipawnLoss > 0 {
            totalLoss += float64(pos.CentipawnLoss)
            moveCount++
        }
    }
    
    if moveCount == 0 {
        return 0.0
    }
    
    return totalLoss / float64(moveCount)
}
```

### 3. Centipawn Loss Per Move

**Thresholds**:
```go
const (
    BestMoveThreshold        = 10   // ≤10cp loss
    ExcellentMoveThreshold   = 25   // ≤25cp loss
    GoodMoveThreshold        = 50   // ≤50cp loss
    InaccuracyThreshold      = 100  // ≤100cp loss
    MistakeThreshold         = 300  // ≤300cp loss
    BlunderThreshold         = 301  // >300cp loss
)
```

**Implementation**:
```go
func ClassifyMove(cpLoss int) string {
    switch {
    case cpLoss <= BestMoveThreshold:
        return "best"
    case cpLoss <= ExcellentMoveThreshold:
        return "excellent"
    case cpLoss <= GoodMoveThreshold:
        return "good"
    case cpLoss <= InaccuracyThreshold:
        return "inaccuracy"
    case cpLoss <= MistakeThreshold:
        return "mistake"
    default:
        return "blunder"
    }
}
```

### 4. Performance Rating

Estimate the player's performance rating based on the game.

**Formula** (simplified):
```
Performance Rating = Opponent Rating + K * (Accuracy - 50)
where K = 4 (scaling factor)
```

**Implementation**:
```go
func CalculatePerformanceRating(
    opponentRating int,
    accuracy float64,
    result string, // "win", "loss", "draw"
) int {
    baseRating := float64(opponentRating)
    
    // Adjust based on accuracy
    accuracyBonus := (accuracy - 50.0) * 4.0
    
    // Adjust based on result
    var resultBonus float64
    switch result {
    case "win":
        resultBonus = 200.0
    case "draw":
        resultBonus = 0.0
    case "loss":
        resultBonus = -200.0
    }
    
    performance := baseRating + accuracyBonus + resultBonus
    return int(math.Round(performance))
}
```

## Classification System

### Move Classifications

#### 1. Brilliant Move (!)
- Sacrifices material for a winning advantage
- Evaluation swing > 200cp in favor
- Requires complex calculation

```go
func IsBrilliantMove(pos, nextPos PositionAnalysis) bool {
    // Check for material sacrifice
    materialLost := CalculateMaterialDiff(pos.FEN, nextPos.FEN)
    
    // Check for evaluation improvement
    evalImprovement := nextPos.Evaluation - pos.Evaluation
    
    return materialLost > 300 && evalImprovement > 200
}
```

#### 2. Best Move
- Centipawn loss ≤ 10
- Matches or nearly matches engine's top choice

#### 3. Excellent Move
- Centipawn loss ≤ 25
- Strong move, minimal loss

#### 4. Good Move
- Centipawn loss ≤ 50
- Reasonable move

#### 5. Inaccuracy (?!)
- Centipawn loss 51-100
- Suboptimal but not critical

#### 6. Mistake (?)
- Centipawn loss 101-300
- Significant error

#### 7. Blunder (??)
- Centipawn loss > 300
- Major error, often game-changing

### Position Evaluation

```go
type PositionEvaluation struct {
    Centipawns int    // Evaluation in centipawns
    MateIn     *int   // Moves to mate (nil if not mate)
    BestMove   string // UCI format (e.g., "e2e4")
    PV         []string // Principal variation
}

func EvaluatePosition(engine *Engine, fen string, depth int) (*PositionEvaluation, error) {
    // Set position
    engine.SendCommand(fmt.Sprintf("position fen %s", fen))
    
    // Start analysis
    engine.SendCommand(fmt.Sprintf("go depth %d", depth))
    
    // Parse output
    eval := &PositionEvaluation{}
    for {
        line := engine.ReadLine()
        
        if strings.HasPrefix(line, "info") {
            // Parse evaluation
            if strings.Contains(line, "score cp") {
                eval.Centipawns = parseCP(line)
            } else if strings.Contains(line, "score mate") {
                mateIn := parseMate(line)
                eval.MateIn = &mateIn
            }
            
            // Parse PV
            if strings.Contains(line, "pv") {
                eval.PV = parsePV(line)
            }
        }
        
        if strings.HasPrefix(line, "bestmove") {
            eval.BestMove = parseBestMove(line)
            break
        }
    }
    
    return eval, nil
}
```

## Performance Optimization

### 1. Stockfish Pool Management

```go
type StockfishPool struct {
    engines chan *Engine
    size    int
    config  EngineConfig
}

func NewStockfishPool(size int, config EngineConfig) (*StockfishPool, error) {
    pool := &StockfishPool{
        engines: make(chan *Engine, size),
        size:    size,
        config:  config,
    }
    
    // Initialize engines
    for i := 0; i < size; i++ {
        engine, err := NewEngine(config)
        if err != nil {
            return nil, err
        }
        pool.engines <- engine
    }
    
    return pool, nil
}

func (p *StockfishPool) Get() *Engine {
    return <-p.engines
}

func (p *StockfishPool) Put(engine *Engine) {
    p.engines <- engine
}
```

### 2. Parallel Position Analysis

```go
func (a *AnalysisEngine) AnalyzeGameParallel(gameID string) error {
    game, err := a.db.GetGame(gameID)
    if err != nil {
        return err
    }
    
    positions := ParsePGN(game.PGN)
    results := make([]PositionAnalysis, len(positions))
    
    // Worker pool
    numWorkers := a.stockfishPool.size
    jobs := make(chan AnalysisJob, len(positions))
    resultsChan := make(chan AnalysisResult, len(positions))
    
    // Start workers
    var wg sync.WaitGroup
    for i := 0; i < numWorkers; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            engine := a.stockfishPool.Get()
            defer a.stockfishPool.Put(engine)
            
            for job := range jobs {
                result := a.analyzePosition(engine, job)
                resultsChan <- result
            }
        }()
    }
    
    // Send jobs
    go func() {
        for i, pos := range positions {
            jobs <- AnalysisJob{Index: i, Position: pos}
        }
        close(jobs)
    }()
    
    // Collect results
    go func() {
        wg.Wait()
        close(resultsChan)
    }()
    
    for result := range resultsChan {
        results[result.Index] = result.Analysis
    }
    
    // Calculate metrics and save
    return a.saveAnalysis(gameID, results)
}
```

### 3. Position Caching

```go
func (a *AnalysisEngine) analyzePosition(engine *Engine, job AnalysisJob) AnalysisResult {
    // Check cache
    cacheKey := fmt.Sprintf("pos:%s:d%d", job.Position.FEN, a.config.Depth)
    if cached, err := a.cache.Get(cacheKey); err == nil {
        return AnalysisResult{
            Index:    job.Index,
            Analysis: cached,
        }
    }
    
    // Analyze position
    eval, err := EvaluatePosition(engine, job.Position.FEN, a.config.Depth)
    if err != nil {
        return AnalysisResult{Index: job.Index, Error: err}
    }
    
    analysis := PositionAnalysis{
        FEN:       job.Position.FEN,
        Evaluation: eval.Centipawns,
        BestMove:  eval.BestMove,
        PV:        eval.PV,
    }
    
    // Cache result
    a.cache.Set(cacheKey, analysis, 24*time.Hour)
    
    return AnalysisResult{Index: job.Index, Analysis: analysis}
}
```

### 4. Progressive Analysis

```go
func (a *AnalysisEngine) AnalyzeGameProgressive(gameID string) error {
    // Start with low depth for quick feedback
    depths := []int{10, 15, 20}
    
    for _, depth := range depths {
        err := a.analyzeAtDepth(gameID, depth)
        if err != nil {
            return err
        }
        
        // Publish progress update
        a.publishProgress(gameID, depth)
    }
    
    return nil
}
```

## Error Handling

### 1. Engine Crashes

```go
func (e *Engine) SendCommand(cmd string) error {
    e.mu.Lock()
    defer e.mu.Unlock()
    
    // Check if process is alive
    if e.process.ProcessState != nil && e.process.ProcessState.Exited() {
        return errors.New("engine process has exited")
    }
    
    _, err := e.stdin.Write([]byte(cmd + "\n"))
    return err
}

func (p *StockfishPool) handleCrashedEngine(engine *Engine) {
    // Remove crashed engine
    // Create new engine
    newEngine, err := NewEngine(p.config)
    if err != nil {
        log.Printf("Failed to create replacement engine: %v", err)
        return
    }
    
    // Add to pool
    p.Put(newEngine)
}
```

### 2. Timeout Handling

```go
func (a *AnalysisEngine) analyzeWithTimeout(
    engine *Engine,
    fen string,
    depth int,
    timeout time.Duration,
) (*PositionEvaluation, error) {
    resultChan := make(chan *PositionEvaluation, 1)
    errorChan := make(chan error, 1)
    
    go func() {
        result, err := EvaluatePosition(engine, fen, depth)
        if err != nil {
            errorChan <- err
            return
        }
        resultChan <- result
    }()
    
    select {
    case result := <-resultChan:
        return result, nil
    case err := <-errorChan:
        return nil, err
    case <-time.After(timeout):
        engine.SendCommand("stop")
        return nil, errors.New("analysis timeout")
    }
}
```

### 3. Invalid Positions

```go
func ValidateFEN(fen string) error {
    // Basic FEN validation
    parts := strings.Split(fen, " ")
    if len(parts) < 4 {
        return errors.New("invalid FEN: too few parts")
    }
    
    // Validate piece placement
    ranks := strings.Split(parts[0], "/")
    if len(ranks) != 8 {
        return errors.New("invalid FEN: must have 8 ranks")
    }
    
    // More validation...
    return nil
}
```

## Go Evaluation Module

The evaluation module is implemented in Go at `/backend/analysis-service/internal/evaluation/`.

### Module Structure

```
internal/evaluation/
├── evaluation.go       # Core evaluation logic
└── evaluation_test.go  # Unit tests (50+ test cases)
```

### Thresholds & Constants

```go
// Move Classification Thresholds (centipawns)
const (
    BestMoveThreshold      = 10   // ≤10cp = Best move
    ExcellentMoveThreshold = 25   // ≤25cp = Excellent
    GoodMoveThreshold      = 50   // ≤50cp = Good
    InaccuracyThreshold    = 100  // ≤100cp = Inaccuracy
    MistakeThreshold       = 300  // ≤300cp = Mistake
    BlunderThreshold       = 301  // >300cp = Blunder
)

// Accuracy Calculation
const (
    MaxCPLossPerMove = 500.0  // Cap per move for accuracy
    WinningThreshold = 200    // Position considered winning
)

// Performance Rating
const (
    WinBonus        = 400    // Rating bonus for win
    LossPenalty     = -400   // Rating penalty for loss
    AccuracyWeight  = 8.0    // Accuracy multiplier
)
```

### Core Functions

#### Accuracy Calculation

```go
// Standard Accuracy (0-100%)
// Formula: 100 - (TotalLoss / MaxPossibleLoss) * 100
func CalculateAccuracy(moves []MoveEvaluation, color string) float64

// T1 Accuracy (Lichess formula)
// Formula: 103.1668 * exp(-0.04354 * ACPL) - 3.1669
func CalculateT1Accuracy(acpl float64) float64
```

**Example:**
```go
moves := []MoveEvaluation{
    {Color: "white", CentipawnLoss: 10},
    {Color: "white", CentipawnLoss: 50},
    {Color: "white", CentipawnLoss: 100},
}
accuracy := CalculateAccuracy(moves, "white")
// Result: ~89.3% (160 loss / 1500 max = 10.7% loss)
```

#### ACPL (Average Centipawn Loss)

```go
func CalculateACPL(moves []MoveEvaluation, color string) float64
```

**Example:**
```go
// Player with losses: 10, 20, 30, 40, 50
acpl := CalculateACPL(moves, "white")
// Result: 30.0 (average of losses)
```

#### Move Classification

```go
func ClassifyMove(
    cpLoss int,
    wasBestMove bool,
    evalBefore, evalAfter int,
    isMateScore bool,
) MoveClassification
```

**Classification Table:**

| Classification | CP Loss | Description |
|----------------|---------|-------------|
| `ClassBest` | ≤10 or best move | Optimal play |
| `ClassExcellent` | 11-25 | Very strong |
| `ClassGood` | 26-50 | Solid |
| `ClassInaccuracy` | 51-100 | Minor mistake |
| `ClassMistake` | 101-300 | Significant error |
| `ClassBlunder` | >300 | Major mistake |
| `ClassMissedWin` | - | Lost winning position |
| `ClassBrilliant` | - | Sacrifice + advantage |

#### Brilliant Move Detection

```go
func IsBrilliantMove(evalBefore, evalAfter int, materialSacrificed int) bool
```

A move is brilliant if:
1. Sacrifices at least 100cp of material (≥1 pawn)
2. Position improves by ≥100cp OR maintains ≥300cp advantage

#### Performance Rating

```go
func CalculatePerformanceRating(opponentRating int, accuracy float64, result GameResult) int
```

**Formula:**
```
Performance = OpponentRating + (Accuracy - 50) * 8 + ResultBonus
```

| Result | Bonus |
|--------|-------|
| Win | +400 |
| Draw | 0 |
| Loss | -400 |

**Example:**
```go
// Beat a 1500-rated opponent with 85% accuracy
perf := CalculatePerformanceRating(1500, 85.0, ResultWin)
// Result: 1500 + (35 * 8) + 400 = 2180
```

#### Win Probability

```go
// Converts centipawn evaluation to win probability
func EvalToWinProbability(centipawns int) float64
```

**Formula:**
```
P(win) = 1 / (1 + 10^(-cp/400))
```

| Eval (cp) | Win Probability |
|-----------|-----------------|
| 0 | 50% |
| 100 | 64% |
| 200 | 76% |
| 300 | 85% |
| 500 | 95% |

### Player Metrics

```go
type PlayerMetrics struct {
    Accuracy          float64  // 0-100%
    ACPL              float64  // Average CP Loss
    TotalCPLoss       int      // Sum of all losses
    Blunders          int      // >300cp moves
    Mistakes          int      // 101-300cp moves
    Inaccuracies      int      // 51-100cp moves
    GoodMoves         int      // 26-50cp moves
    ExcellentMoves    int      // 11-25cp moves
    BestMoves         int      // ≤10cp moves
    BrilliantMoves    int      // Special moves
    TotalMoves        int      // Total analyzed
    PerformanceRating int      // Estimated rating
    T1Accuracy        float64  // Alternative calculation
}
```

### Running Tests

```bash
cd backend/analysis-service

# Run all evaluation tests
go test -v ./internal/evaluation/...

# Run with coverage
go test -cover ./internal/evaluation/...

# Run benchmarks
go test -bench=. ./internal/evaluation/...
```

### Test Coverage

The evaluation module includes 50+ test cases covering:

- Move classification across all thresholds
- Edge cases (0 loss, max loss, negative values)
- Color filtering (white vs black moves)
- Accuracy capping (prevents single blunder destroying score)
- Performance rating bounds
- Brilliant move detection
- Win probability calculations

## Frontend Analysis Features

The frontend (`AnalysisViewer.tsx`) provides rich visualization of analysis data:

### Phase Breakdown

Divides game into phases and shows move quality per phase:

```typescript
// Phase boundaries (half-moves)
const openingEnd = Math.min(20, totalMoves);    // Moves 1-10
const middlegameEnd = Math.min(40, totalMoves); // Moves 11-20
const endgame = totalMoves;                      // Moves 21+

// Stats per phase include:
interface PhaseStats {
  brilliant: number;
  best: number;
  good: number;
  book: number;
  inaccuracies: number;
  mistakes: number;
  blunders: number;
  acpl: number;
}
```

### Key Moments Detection

Automatically identifies critical positions:

```typescript
// Detected moments:
// 1. Blunders (cpLoss > 300)
// 2. Turning Points (eval swing > 200cp crossing 0)
// 3. Brilliant Moves
// 4. Missed Wins (was winning, now losing)
```

### Win Probability Visualization

Converts evaluation to visual win/draw/loss probability:

```typescript
// Sigmoid formula for win probability
const calculateWinProbability = (cp: number) => {
  if (mateIn !== null) return mateIn > 0 ? 100 : 0;
  const winProb = 50 + 50 * (2 / (1 + Math.exp(-0.004 * cp)) - 1);
  return { white: winProb, draw: 10, black: 100 - winProb - 10 };
};
```

### Suggested Focus Areas

AI-powered recommendations based on phase performance:

| Condition | Suggestion |
|-----------|------------|
| Opening ACPL > 30 | "Opening Preparation" |
| Middlegame blunders | "Tactical Awareness" |
| Multiple middlegame mistakes | "Calculation & Visualization" |
| Endgame errors | "Endgame Technique" |
| 2+ total blunders | "Blunder Prevention" |
| Many inaccuracies | "Positional Understanding" |

### Game Rating Display

Frontend calculation of "You played like a XXXX":

```typescript
// Skill descriptions based on rating:
// <800: "Beginner"
// 800-1000: "Casual Player"
// 1000-1200: "Intermediate"
// 1200-1400: "Club Player"
// 1400-1600: "Tournament Player"
// 1600-1800: "Advanced Player"
// 1800-2000: "Expert"
// 2000-2200: "Candidate Master"
// 2200-2400: "Master"
// 2400-2600: "International Master"
// 2600+: "Grandmaster"
```

---

**Related Documentation:**
- [Stockfish Integration](stockfish-integration.md) - UCI protocol details
- [Game Sync](game-sync.md) - Game data source
- [gRPC Design](grpc-design.md) - Analysis API definition

