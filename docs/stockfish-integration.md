# Stockfish Integration

## Table of Contents
- [Overview](#overview)
- [UCI Protocol](#uci-protocol)
- [Engine Configuration](#engine-configuration)
- [Communication Flow](#communication-flow)
- [Best Practices](#best-practices)

## Overview

Stockfish is the world's strongest open-source chess engine. EloInsight uses Stockfish 16 via the UCI (Universal Chess Interface) protocol.

### Why Stockfish?
- **Free and Open Source**: No licensing costs
- **Strongest Engine**: Elo rating > 3500
- **Active Development**: Regular updates
- **Cross-Platform**: Works on Linux, macOS, Windows
- **Well-Documented**: UCI protocol is standard

## UCI Protocol

### Protocol Basics

UCI is a text-based protocol for chess engine communication.

**Command Flow**:
```
Application → Engine: uci
Engine → Application: id name Stockfish 16
Engine → Application: id author T. Romstad, M. Costalba, J. Kiiski, G. Linscott
Engine → Application: option name Hash type spin default 16 min 1 max 33554432
Engine → Application: uciok

Application → Engine: setoption name Hash value 2048
Application → Engine: isready
Engine → Application: readyok

Application → Engine: position fen rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1
Application → Engine: go depth 20
Engine → Application: info depth 1 score cp 25 nodes 20 ...
Engine → Application: info depth 2 score cp 30 nodes 45 ...
...
Engine → Application: bestmove e2e4 ponder e7e5
```

### Key Commands

#### 1. Initialize Engine
```
→ uci
← id name Stockfish 16
← id author ...
← option name ...
← uciok
```

#### 2. Set Options
```
→ setoption name Hash value 2048
→ setoption name Threads value 4
→ setoption name MultiPV value 3
```

#### 3. Check Readiness
```
→ isready
← readyok
```

#### 4. Set Position
```
// From FEN
→ position fen rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1

// From starting position with moves
→ position startpos moves e2e4 e7e5 g1f3

// From FEN with moves
→ position fen ... moves e2e4 e7e5
```

#### 5. Start Analysis
```
// Fixed depth
→ go depth 20

// Fixed time
→ go movetime 5000

// Time control
→ go wtime 300000 btime 300000 winc 0 binc 0

// Infinite (until stop)
→ go infinite
```

#### 6. Stop Analysis
```
→ stop
← bestmove e2e4
```

#### 7. Quit
```
→ quit
```

### Info Output

During analysis, engine sends `info` lines:

```
info depth 20 seldepth 28 multipv 1 score cp 25 nodes 1234567 nps 500000 
     tbhits 0 time 2468 pv e2e4 e7e5 g1f3 b8c6 f1c4
```

**Fields**:
- `depth`: Search depth
- `seldepth`: Selective search depth
- `score cp 25`: Evaluation in centipawns (+25 = white is 0.25 pawns ahead)
- `score mate 3`: Mate in 3 moves
- `nodes`: Nodes searched
- `nps`: Nodes per second
- `time`: Time in milliseconds
- `pv`: Principal variation (best line)
- `multipv 1`: Multi-PV number (when analyzing multiple lines)

## Engine Configuration

### Recommended Settings

```go
type EngineConfig struct {
    // Binary path
    BinaryPath string
    
    // Performance
    Threads    int    // Number of CPU threads (default: 4)
    Hash       int    // Hash table size in MB (default: 2048)
    
    // Analysis
    MultiPV    int    // Number of lines to analyze (default: 1)
    
    // Syzygy Tablebases (optional)
    SyzygyPath string
}

func DefaultConfig() EngineConfig {
    return EngineConfig{
        BinaryPath: "/usr/local/bin/stockfish",
        Threads:    4,
        Hash:       2048,
        MultiPV:    1,
        SyzygyPath: "",
    }
}
```

### Performance Tuning

**Hash Table Size**:
- Larger = better performance, more memory
- Recommended: 2048 MB (2 GB)
- Maximum: 33554432 MB (32 GB)

**Threads**:
- More threads = faster analysis
- Diminishing returns after 8 threads
- Recommended: 4-8 threads per engine

**MultiPV**:
- Analyze multiple best moves
- Useful for showing alternatives
- Slower than single-PV

## Communication Flow

### Go Implementation

```go
package stockfish

import (
    "bufio"
    "fmt"
    "io"
    "os/exec"
    "strings"
    "sync"
)

type Engine struct {
    cmd    *exec.Cmd
    stdin  io.WriteCloser
    stdout io.ReadCloser
    scanner *bufio.Scanner
    mu     sync.Mutex
}

func NewEngine(config EngineConfig) (*Engine, error) {
    cmd := exec.Command(config.BinaryPath)
    
    stdin, err := cmd.StdinPipe()
    if err != nil {
        return nil, err
    }
    
    stdout, err := cmd.StdoutPipe()
    if err != nil {
        return nil, err
    }
    
    if err := cmd.Start(); err != nil {
        return nil, err
    }
    
    engine := &Engine{
        cmd:     cmd,
        stdin:   stdin,
        stdout:  stdout,
        scanner: bufio.NewScanner(stdout),
    }
    
    // Initialize
    if err := engine.init(config); err != nil {
        engine.Close()
        return nil, err
    }
    
    return engine, nil
}

func (e *Engine) init(config EngineConfig) error {
    // Send UCI
    if err := e.SendCommand("uci"); err != nil {
        return err
    }
    
    // Wait for uciok
    for e.scanner.Scan() {
        line := e.scanner.Text()
        if line == "uciok" {
            break
        }
    }
    
    // Set options
    e.SendCommand(fmt.Sprintf("setoption name Threads value %d", config.Threads))
    e.SendCommand(fmt.Sprintf("setoption name Hash value %d", config.Hash))
    if config.MultiPV > 1 {
        e.SendCommand(fmt.Sprintf("setoption name MultiPV value %d", config.MultiPV))
    }
    
    // Check ready
    e.SendCommand("isready")
    for e.scanner.Scan() {
        if e.scanner.Text() == "readyok" {
            break
        }
    }
    
    return nil
}

func (e *Engine) SendCommand(cmd string) error {
    e.mu.Lock()
    defer e.mu.Unlock()
    
    _, err := e.stdin.Write([]byte(cmd + "\n"))
    return err
}

func (e *Engine) ReadLine() string {
    if e.scanner.Scan() {
        return e.scanner.Text()
    }
    return ""
}

func (e *Engine) Close() error {
    e.SendCommand("quit")
    e.stdin.Close()
    return e.cmd.Wait()
}
```

### Analysis Example

```go
func (e *Engine) AnalyzePosition(fen string, depth int) (*Evaluation, error) {
    // Set position
    e.SendCommand(fmt.Sprintf("position fen %s", fen))
    
    // Start analysis
    e.SendCommand(fmt.Sprintf("go depth %d", depth))
    
    eval := &Evaluation{}
    
    // Read output
    for {
        line := e.ReadLine()
        
        if strings.HasPrefix(line, "info") {
            // Parse info line
            if strings.Contains(line, "score cp") {
                eval.Centipawns = parseCP(line)
            } else if strings.Contains(line, "score mate") {
                eval.MateIn = parseMate(line)
            }
            
            if strings.Contains(line, "pv") {
                eval.PV = parsePV(line)
            }
            
            if strings.Contains(line, "depth") {
                eval.Depth = parseDepth(line)
            }
        }
        
        if strings.HasPrefix(line, "bestmove") {
            eval.BestMove = parseBestMove(line)
            break
        }
    }
    
    return eval, nil
}

type Evaluation struct {
    Centipawns int
    MateIn     *int
    BestMove   string
    PV         []string
    Depth      int
}
```

### Parsing Functions

```go
func parseCP(line string) int {
    // "info ... score cp 25 ..."
    parts := strings.Split(line, " ")
    for i, part := range parts {
        if part == "cp" && i+1 < len(parts) {
            cp, _ := strconv.Atoi(parts[i+1])
            return cp
        }
    }
    return 0
}

func parseMate(line string) *int {
    // "info ... score mate 3 ..."
    parts := strings.Split(line, " ")
    for i, part := range parts {
        if part == "mate" && i+1 < len(parts) {
            mate, _ := strconv.Atoi(parts[i+1])
            return &mate
        }
    }
    return nil
}

func parsePV(line string) []string {
    // "info ... pv e2e4 e7e5 g1f3"
    parts := strings.Split(line, " ")
    for i, part := range parts {
        if part == "pv" {
            return parts[i+1:]
        }
    }
    return nil
}

func parseBestMove(line string) string {
    // "bestmove e2e4 ponder e7e5"
    parts := strings.Split(line, " ")
    if len(parts) >= 2 {
        return parts[1]
    }
    return ""
}
```

## Best Practices

### 1. Engine Pool
```go
// Don't create engine per request
// Bad:
func analyzeGame(gameID string) {
    engine, _ := NewEngine(config)
    defer engine.Close()
    // analyze...
}

// Good: Use a pool
pool := NewEnginePool(8, config)
engine := pool.Get()
defer pool.Put(engine)
// analyze...
```

### 2. Reuse Engines
```go
// Reset engine state between analyses
func (e *Engine) Reset() {
    e.SendCommand("ucinewgame")
    e.SendCommand("isready")
    for e.ReadLine() != "readyok" {}
}
```

### 3. Handle Timeouts
```go
func (e *Engine) AnalyzeWithTimeout(fen string, depth int, timeout time.Duration) (*Evaluation, error) {
    done := make(chan *Evaluation)
    
    go func() {
        eval, _ := e.AnalyzePosition(fen, depth)
        done <- eval
    }()
    
    select {
    case eval := <-done:
        return eval, nil
    case <-time.After(timeout):
        e.SendCommand("stop")
        return nil, errors.New("timeout")
    }
}
```

### 4. Error Recovery
```go
func (p *EnginePool) healthCheck() {
    ticker := time.NewTicker(1 * time.Minute)
    for range ticker.C {
        for i := 0; i < p.size; i++ {
            engine := p.Get()
            
            // Test engine
            err := engine.SendCommand("isready")
            if err != nil {
                // Replace crashed engine
                newEngine, _ := NewEngine(p.config)
                p.Put(newEngine)
            } else {
                p.Put(engine)
            }
        }
    }
}
```

### 5. Progressive Depth
```go
// Start with low depth for quick feedback
func (e *Engine) AnalyzeProgressive(fen string, maxDepth int, callback func(int, *Evaluation)) {
    for depth := 10; depth <= maxDepth; depth += 5 {
        eval, _ := e.AnalyzePosition(fen, depth)
        callback(depth, eval)
    }
}
```

---

**Next Steps**: See [game-sync.md](game-sync.md) for platform integration details.
