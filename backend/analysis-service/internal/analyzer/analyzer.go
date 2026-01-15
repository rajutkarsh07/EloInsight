package analyzer

import (
	"context"
	"errors"
	"fmt"
	"math"
	"strings"
	"sync"
	"time"

	"github.com/eloinsight/analysis-service/internal/engine"
	"github.com/eloinsight/analysis-service/internal/pool"
	"github.com/notnil/chess"
	"go.uber.org/zap"
)

// PositionCache caches analysis results to avoid re-analyzing common positions
// This is especially effective for opening positions shared across many games
type PositionCache struct {
	mu       sync.RWMutex
	cache    map[string]cachedEvaluation
	maxSize  int
	hits     int64
	misses   int64
}

type cachedEvaluation struct {
	evaluation engine.Evaluation
	bestMove   string
	depth      int
	timestamp  time.Time
}

// NewPositionCache creates a new position cache
func NewPositionCache(maxSize int) *PositionCache {
	if maxSize <= 0 {
		maxSize = 10000 // Default 10k positions
	}
	return &PositionCache{
		cache:   make(map[string]cachedEvaluation),
		maxSize: maxSize,
	}
}

// cacheKey creates a unique key for FEN + depth
func (c *PositionCache) cacheKey(fen string, depth int) string {
	// Only use the position part of FEN (first 4 fields) to normalize
	// This ignores halfmove clock and fullmove number
	parts := strings.Fields(fen)
	if len(parts) >= 4 {
		return fmt.Sprintf("%s %s %s %s|%d", parts[0], parts[1], parts[2], parts[3], depth)
	}
	return fmt.Sprintf("%s|%d", fen, depth)
}

// Get retrieves a cached evaluation if available
func (c *PositionCache) Get(fen string, depth int) (engine.Evaluation, string, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	
	key := c.cacheKey(fen, depth)
	if cached, ok := c.cache[key]; ok {
		// Only return if cached depth is >= requested depth
		if cached.depth >= depth {
			c.hits++
			return cached.evaluation, cached.bestMove, true
		}
	}
	c.misses++
	return engine.Evaluation{}, "", false
}

// Set stores an evaluation in the cache
func (c *PositionCache) Set(fen string, depth int, eval engine.Evaluation, bestMove string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	
	// Simple eviction: if at capacity, remove oldest entries
	if len(c.cache) >= c.maxSize {
		c.evictOldest(c.maxSize / 10) // Remove 10% oldest
	}
	
	key := c.cacheKey(fen, depth)
	c.cache[key] = cachedEvaluation{
		evaluation: eval,
		bestMove:   bestMove,
		depth:      depth,
		timestamp:  time.Now(),
	}
}

// evictOldest removes the n oldest entries (must be called with lock held)
func (c *PositionCache) evictOldest(n int) {
	if n <= 0 || len(c.cache) == 0 {
		return
	}
	
	// Simple approach: find and remove oldest entries
	type entry struct {
		key string
		ts  time.Time
	}
	entries := make([]entry, 0, len(c.cache))
	for k, v := range c.cache {
		entries = append(entries, entry{k, v.timestamp})
	}
	
	// Sort by timestamp (oldest first) - simple bubble for small n
	for i := 0; i < n && i < len(entries); i++ {
		for j := i + 1; j < len(entries); j++ {
			if entries[j].ts.Before(entries[i].ts) {
				entries[i], entries[j] = entries[j], entries[i]
			}
		}
		delete(c.cache, entries[i].key)
	}
}

// Stats returns cache statistics
func (c *PositionCache) Stats() (size int, hits, misses int64, hitRate float64) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	
	size = len(c.cache)
	hits = c.hits
	misses = c.misses
	total := hits + misses
	if total > 0 {
		hitRate = float64(hits) / float64(total) * 100
	}
	return
}

// Thresholds for move classification (in centipawns)
const (
	BestMoveThreshold      = 10
	ExcellentMoveThreshold = 25
	GoodMoveThreshold      = 50
	InaccuracyThreshold    = 100
	MistakeThreshold       = 300
	BlunderThreshold       = 301
)

// MoveClassification represents the quality of a move
type MoveClassification string

const (
	ClassBrilliant   MoveClassification = "brilliant"
	ClassGreat       MoveClassification = "great"
	ClassBest        MoveClassification = "best"
	ClassExcellent   MoveClassification = "excellent"
	ClassGood        MoveClassification = "good"
	ClassBook        MoveClassification = "book"
	ClassNormal      MoveClassification = "normal"
	ClassInaccuracy  MoveClassification = "inaccuracy"
	ClassMistake     MoveClassification = "mistake"
	ClassBlunder     MoveClassification = "blunder"
	ClassMissedWin   MoveClassification = "missed_win"
)

// MoveAnalysis holds analysis for a single move
type MoveAnalysis struct {
	MoveNumber      int
	Ply             int
	Color           string // "white" or "black"
	PlayedMove      string // SAN
	PlayedMoveUCI   string
	BestMove        string // SAN
	BestMoveUCI     string
	FENBefore       string
	FENAfter        string
	EvalBefore      engine.Evaluation
	EvalAfter       engine.Evaluation
	CentipawnLoss   int
	Classification  MoveClassification
	PV              []string
	Depth           int
}

// GameMetrics holds aggregated metrics for a player
type GameMetrics struct {
	Accuracy          float64
	ACPL              float64
	Blunders          int
	Mistakes          int
	Inaccuracies      int
	GoodMoves         int
	ExcellentMoves    int
	BestMoves         int
	BrilliantMoves    int
	BookMoves         int
	TotalMoves        int
	PerformanceRating int
}

// GameAnalysis holds the complete game analysis
type GameAnalysis struct {
	GameID        string
	Moves         []MoveAnalysis
	WhiteMetrics  GameMetrics
	BlackMetrics  GameMetrics
	TotalTimeMs   int64
	EngineVersion string
}

// ProgressCallback is called for each move analyzed
type ProgressCallback func(current, total int, move *MoveAnalysis)

// Analyzer performs chess game analysis
type Analyzer struct {
	pool          *pool.Pool
	logger        *zap.Logger
	defaultDepth  int
	maxDepth      int
	timeout       time.Duration
	posCache      *PositionCache // Cache for analyzed positions
}

// NewAnalyzer creates a new analyzer
func NewAnalyzer(p *pool.Pool, logger *zap.Logger, defaultDepth, maxDepth int, timeout time.Duration) *Analyzer {
	return &Analyzer{
		pool:         p,
		logger:       logger,
		defaultDepth: defaultDepth,
		maxDepth:     maxDepth,
		timeout:      timeout,
		posCache:     NewPositionCache(50000), // Cache 50k positions (~common openings + recent games)
	}
}

// CacheStats returns position cache statistics
func (a *Analyzer) CacheStats() (size int, hits, misses int64, hitRate float64) {
	return a.posCache.Stats()
}

// AnalyzePosition analyzes a single FEN position
func (a *Analyzer) AnalyzePosition(ctx context.Context, fen string, depth int, multiPV int) (*engine.AnalysisResult, error) {
	if err := engine.ValidateFEN(fen); err != nil {
		return nil, err
	}

	if depth <= 0 {
		depth = a.defaultDepth
	}
	if depth > a.maxDepth {
		depth = a.maxDepth
	}

	// For single-PV requests, check cache first
	if multiPV == 1 {
		if cachedEval, cachedBestMove, found := a.posCache.Get(fen, depth); found {
			return &engine.AnalysisResult{
				Depth:       cachedEval.Depth,
				BestMove:    cachedBestMove,
				Evaluations: []engine.Evaluation{cachedEval},
			}, nil
		}
	}

	eng, err := a.pool.Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get engine: %w", err)
	}
	defer a.pool.Put(eng)

	result, err := eng.AnalyzePosition(fen, depth, multiPV)
	if err != nil {
		return nil, fmt.Errorf("analysis failed: %w", err)
	}

	// Cache single-PV results
	if multiPV == 1 && len(result.Evaluations) > 0 {
		a.posCache.Set(fen, depth, result.Evaluations[0], result.BestMove)
	}

	return result, nil
}

// positionWork represents a position to analyze
type positionWork struct {
	index int
	fen   string
}

// positionResult represents the result of analyzing a position
type positionResult struct {
	index    int
	eval     engine.Evaluation
	bestMove string
	err      error
}

// AnalyzeGame analyzes a complete game
// OPTIMIZED: 
// 1. Evaluations are cached - each position is only analyzed ONCE
// 2. Uses parallel analysis with multiple engines when available
// 3. The "after" evaluation of move N is reused as the "before" evaluation of move N+1
func (a *Analyzer) AnalyzeGame(ctx context.Context, gameID string, pgn string, depth int, callback ProgressCallback) (*GameAnalysis, error) {
	startTime := time.Now()

	if depth <= 0 {
		depth = a.defaultDepth
	}
	if depth > a.maxDepth {
		depth = a.maxDepth
	}

	// Parse PGN to get positions
	positions, err := ParsePGN(pgn)
	if err != nil {
		return nil, fmt.Errorf("failed to parse PGN: %w", err)
	}

	if len(positions) == 0 {
		return nil, errors.New("no positions found in PGN")
	}

	totalMoves := len(positions) - 1 // Exclude starting position

	// Get engine version for results
	eng, err := a.pool.Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get engine: %w", err)
	}
	engineVersion := eng.Version()
	a.pool.Put(eng)

	analysis := &GameAnalysis{
		GameID:        gameID,
		Moves:         make([]MoveAnalysis, 0, totalMoves),
		EngineVersion: engineVersion,
	}

	// OPTIMIZATION: Pre-analyze all positions once instead of 2x per move
	evaluations := make([]engine.Evaluation, len(positions))
	bestMoves := make([]string, len(positions))
	
	// Separate cached vs uncached positions
	var uncachedWork []positionWork
	cacheHits := 0
	
	a.logger.Info("Starting optimized game analysis",
		zap.String("gameId", gameID),
		zap.Int("totalPositions", len(positions)),
		zap.Int("depth", depth))

	// First pass: check cache and collect uncached positions
	for i, pos := range positions {
		if cachedEval, cachedBestMove, found := a.posCache.Get(pos.FEN, depth); found {
			evaluations[i] = cachedEval
			bestMoves[i] = cachedBestMove
			cacheHits++
		} else {
			uncachedWork = append(uncachedWork, positionWork{index: i, fen: pos.FEN})
		}
	}

	a.logger.Info("Cache check completed",
		zap.Int("cacheHits", cacheHits),
		zap.Int("toAnalyze", len(uncachedWork)))

	// OPTIMIZATION: Parallel analysis of uncached positions
	if len(uncachedWork) > 0 {
		// Determine parallelism (use available engines, max 4 for game analysis)
		numWorkers := a.pool.Available()
		if numWorkers > 4 {
			numWorkers = 4
		}
		if numWorkers < 1 {
			numWorkers = 1
		}

		// Create work and result channels
		workChan := make(chan positionWork, len(uncachedWork))
		resultChan := make(chan positionResult, len(uncachedWork))

		// Send all work to channel
		for _, work := range uncachedWork {
			workChan <- work
		}
		close(workChan)

		// Create worker context
		workerCtx, cancel := context.WithCancel(ctx)
		defer cancel()

		// Start workers
		var wg sync.WaitGroup
		for w := 0; w < numWorkers; w++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				a.analyzeWorker(workerCtx, workChan, resultChan, depth)
			}()
		}

		// Close result channel when all workers done
		go func() {
			wg.Wait()
			close(resultChan)
		}()

		// Collect results and report progress
		analyzed := cacheHits
		for result := range resultChan {
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			default:
			}

			if result.err == nil {
				evaluations[result.index] = result.eval
				bestMoves[result.index] = result.bestMove
				// Cache the result
				a.posCache.Set(positions[result.index].FEN, depth, result.eval, result.bestMove)
			}
			
			analyzed++
			if callback != nil {
				progress := analyzed
				if progress > totalMoves {
					progress = totalMoves
				}
				callback(progress, totalMoves, nil)
			}
		}
	}

	// Build move analyses from evaluations
	for i := 0; i < len(positions)-1; i++ {
		pos := positions[i]
		nextPos := positions[i+1]

		evalBefore := evaluations[i]
		evalAfter := evaluations[i+1]

		// Skip if we couldn't get evaluation for the before position
		if evalBefore.Depth == 0 && evalBefore.Centipawns == 0 && !evalBefore.IsMate {
			continue
		}

		moveAnalysis := a.createMoveAnalysis(i, pos, nextPos, &evalBefore, &evalAfter, bestMoves[i])
		analysis.Moves = append(analysis.Moves, moveAnalysis)

		// Call progress callback with completed move analysis
		if callback != nil {
			callback(i+1, totalMoves, &moveAnalysis)
		}
	}

	// Calculate metrics
	analysis.WhiteMetrics = a.calculateMetrics(analysis.Moves, "white")
	analysis.BlackMetrics = a.calculateMetrics(analysis.Moves, "black")
	analysis.TotalTimeMs = time.Since(startTime).Milliseconds()

	a.logger.Info("Game analysis completed",
		zap.String("gameId", gameID),
		zap.Int("movesAnalyzed", len(analysis.Moves)),
		zap.Int("cacheHits", cacheHits),
		zap.Int64("totalTimeMs", analysis.TotalTimeMs))

	return analysis, nil
}

// analyzeWorker is a goroutine worker that analyzes positions in parallel
func (a *Analyzer) analyzeWorker(ctx context.Context, work <-chan positionWork, results chan<- positionResult, depth int) {
	// Get an engine for this worker
	eng, err := a.pool.Get(ctx)
	if err != nil {
		// Can't get engine, drain work channel with errors
		for w := range work {
			results <- positionResult{index: w.index, err: err}
		}
		return
	}
	defer a.pool.Put(eng)

	for w := range work {
		select {
		case <-ctx.Done():
			results <- positionResult{index: w.index, err: ctx.Err()}
			continue
		default:
		}

		result, err := eng.AnalyzePosition(w.fen, depth, 1)
		if err != nil {
			a.logger.Warn("Worker failed to analyze position",
				zap.Int("index", w.index),
				zap.Error(err))
			results <- positionResult{index: w.index, err: err}
			continue
		}

		pr := positionResult{index: w.index}
		if len(result.Evaluations) > 0 {
			pr.eval = result.Evaluations[0]
		}
		pr.bestMove = result.BestMove
		results <- pr
	}
}

// createMoveAnalysis creates analysis for a single move
func (a *Analyzer) createMoveAnalysis(
	ply int,
	currentPos, nextPos Position,
	evalBefore, evalAfter *engine.Evaluation,
	bestMoveUCI string,
) MoveAnalysis {
	color := "white"
	if ply%2 == 1 {
		color = "black"
	}
	moveNumber := (ply / 2) + 1

	// Convert best move from UCI to SAN
	bestMoveSAN := a.uciToSAN(currentPos.FEN, bestMoveUCI)

	// The played move is stored in nextPos (the position AFTER the move was made)
	analysis := MoveAnalysis{
		MoveNumber:    moveNumber,
		Ply:           ply,
		Color:         color,
		PlayedMove:    nextPos.MoveSAN,
		PlayedMoveUCI: nextPos.MoveUCI,
		BestMove:      bestMoveSAN,
		BestMoveUCI:   bestMoveUCI,
		FENBefore:     currentPos.FEN,
		FENAfter:      nextPos.FEN,
		EvalBefore:    *evalBefore,
		Depth:         evalBefore.Depth,
		PV:            evalBefore.PV,
	}

	// Store evalAfter if available
	if evalAfter != nil {
		analysis.EvalAfter = *evalAfter
	}

	// Calculate centipawn loss
	// evalBefore: evaluation from the perspective of the side to move (before the move)
	// evalAfter: evaluation from the perspective of the opponent (after the move)
	// Since perspectives flip, we need to account for this in the calculation
	if evalBefore != nil && evalAfter != nil {
		if evalBefore.IsMate || evalAfter.IsMate {
			// Handle mate scenarios
			if evalBefore.IsMate && evalBefore.MateIn != nil {
				// Player had mate, check if they kept it
				if evalAfter.IsMate && evalAfter.MateIn != nil {
					// Still mate, minimal loss (might have lengthened the mate)
					analysis.CentipawnLoss = 0
				} else {
					// Lost the mate - significant blunder
					analysis.CentipawnLoss = 500
				}
			} else if evalAfter.IsMate && evalAfter.MateIn != nil && *evalAfter.MateIn > 0 {
				// Opponent now has mate against us - blunder
				analysis.CentipawnLoss = 500
			}
		} else {
			// Normal centipawn evaluation
			// evalBefore is from mover's perspective (positive = good for mover)
			// evalAfter is from opponent's perspective (positive = good for opponent = bad for mover)
			// So the mover's eval after the move is -evalAfter.Centipawns
			
			evalBeforeCP := evalBefore.Centipawns
			evalAfterCP := -evalAfter.Centipawns // Negate because perspective flipped
			
			// Centipawn loss = how much worse the position got for the mover
			analysis.CentipawnLoss = evalBeforeCP - evalAfterCP
			
			// Can't have negative loss (improvement is 0 loss)
			if analysis.CentipawnLoss < 0 {
				analysis.CentipawnLoss = 0
			}
		}
	}

	// Classify the move (compare played move UCI with best move UCI)
	analysis.Classification = a.classifyMove(analysis.CentipawnLoss, nextPos.MoveUCI == bestMoveUCI)

	return analysis
}

// classifyMove classifies a move based on centipawn loss
func (a *Analyzer) classifyMove(cpLoss int, isBestMove bool) MoveClassification {
	if isBestMove || cpLoss <= BestMoveThreshold {
		return ClassBest
	}
	if cpLoss <= ExcellentMoveThreshold {
		return ClassExcellent
	}
	if cpLoss <= GoodMoveThreshold {
		return ClassGood
	}
	if cpLoss <= InaccuracyThreshold {
		return ClassInaccuracy
	}
	if cpLoss <= MistakeThreshold {
		return ClassMistake
	}
	return ClassBlunder
}

// uciToSAN converts a UCI move notation to SAN notation given a FEN position
func (a *Analyzer) uciToSAN(fen, uciMove string) string {
	if uciMove == "" {
		return ""
	}

	// Parse the FEN to get the position
	fenFunc, err := chess.FEN(fen)
	if err != nil {
		a.logger.Warn("Failed to parse FEN for UCI to SAN conversion", zap.String("fen", fen), zap.Error(err))
		return uciMove // Return UCI as fallback
	}

	game := chess.NewGame(fenFunc)
	position := game.Position()

	// Decode the UCI move
	move, err := chess.UCINotation{}.Decode(position, uciMove)
	if err != nil {
		a.logger.Warn("Failed to decode UCI move", zap.String("uci", uciMove), zap.Error(err))
		return uciMove // Return UCI as fallback
	}

	// Encode to SAN
	san := chess.AlgebraicNotation{}.Encode(position, move)
	return san
}

// calculateMetrics calculates aggregated metrics for a color
func (a *Analyzer) calculateMetrics(moves []MoveAnalysis, color string) GameMetrics {
	metrics := GameMetrics{}

	var totalCPLoss float64
	var moveCount int

	for _, move := range moves {
		if move.Color != color {
			continue
		}

		metrics.TotalMoves++
		totalCPLoss += float64(move.CentipawnLoss)
		moveCount++

		switch move.Classification {
		case ClassBrilliant:
			metrics.BrilliantMoves++
		case ClassBest:
			metrics.BestMoves++
		case ClassExcellent:
			metrics.ExcellentMoves++
		case ClassGood:
			metrics.GoodMoves++
		case ClassBook:
			metrics.BookMoves++
		case ClassInaccuracy:
			metrics.Inaccuracies++
		case ClassMistake:
			metrics.Mistakes++
		case ClassBlunder:
			metrics.Blunders++
		}
	}

	if moveCount > 0 {
		metrics.ACPL = totalCPLoss / float64(moveCount)
		// Calculate accuracy: 100 - (loss / max_loss * 100)
		// Cap loss at 500 per move for accuracy calculation
		cappedLoss := math.Min(totalCPLoss, float64(moveCount)*500)
		maxLoss := float64(moveCount) * 500
		metrics.Accuracy = 100 - (cappedLoss/maxLoss)*100
		metrics.Accuracy = math.Max(0, math.Min(100, metrics.Accuracy))
	} else {
		metrics.Accuracy = 100
	}

	return metrics
}

// Position represents a chess position in a game
type Position struct {
	FEN     string
	MoveSAN string
	MoveUCI string
}

// ParsePGN parses a PGN and returns the list of positions with proper FEN strings
// Handles both Chess.com format (full PGN with headers) and Lichess format (moves only)
func ParsePGN(pgn string) ([]Position, error) {
	positions := make([]Position, 0)

	// Clean the PGN - handle Lichess format (moves only, no headers)
	cleanedPGN := cleanPGNForParsing(pgn)

	// Use the chess library to parse PGN
	reader := strings.NewReader(cleanedPGN)
	pgnReader, err := chess.PGN(reader)
	if err != nil {
		return nil, fmt.Errorf("failed to parse PGN: %w", err)
	}

	game := chess.NewGame(pgnReader)

	// Add starting position
	positions = append(positions, Position{
		FEN:     chess.StartingPosition().String(),
		MoveSAN: "",
		MoveUCI: "",
	})

	// Get all positions from the game
	moveHistory := game.Moves()

	// Create a new game to replay moves and track FEN at each position
	replayGame := chess.NewGame()

	for _, move := range moveHistory {
		// Get move in SAN and UCI notation
		moveSAN := chess.AlgebraicNotation{}.Encode(replayGame.Position(), move)
		moveUCI := move.String()

		// Make the move
		err := replayGame.Move(move)
		if err != nil {
			return nil, fmt.Errorf("failed to replay move %s: %w", moveSAN, err)
		}

		// Get FEN after the move
		fenAfter := replayGame.Position().String()

		// Store position with the move that was played
		positions = append(positions, Position{
			FEN:     fenAfter,
			MoveSAN: moveSAN,
			MoveUCI: moveUCI,
		})
	}

	return positions, nil
}

// cleanPGNForParsing converts various PGN formats to a standard format the chess library can parse
func cleanPGNForParsing(pgn string) string {
	pgn = strings.TrimSpace(pgn)

	// Check if it's a Lichess-style PGN (just moves, no headers)
	// Lichess format: "e4 c5 Nf3 Nc6 Bb5..."
	if !strings.Contains(pgn, "[") {
		// No headers, this is likely Lichess format - add minimal headers
		// Convert space-separated moves to numbered moves
		moves := strings.Fields(pgn)
		if len(moves) == 0 {
			return pgn
		}

		// Build a proper PGN with move numbers
		var builder strings.Builder
		builder.WriteString("[Event \"?\"]\n")
		builder.WriteString("[Site \"?\"]\n")
		builder.WriteString("[Date \"????.??.??\"]\n")
		builder.WriteString("[Round \"?\"]\n")
		builder.WriteString("[White \"?\"]\n")
		builder.WriteString("[Black \"?\"]\n")
		builder.WriteString("[Result \"*\"]\n\n")

		moveNum := 1
		for i, move := range moves {
			if i%2 == 0 {
				// White's move
				builder.WriteString(fmt.Sprintf("%d. %s ", moveNum, move))
			} else {
				// Black's move
				builder.WriteString(fmt.Sprintf("%s ", move))
				moveNum++
			}
		}
		builder.WriteString("*")
		return builder.String()
	}

	// Chess.com format with headers - return as-is, the library handles it
	return pgn
}

// GetBestMoves returns the top N moves for a position
func (a *Analyzer) GetBestMoves(ctx context.Context, fen string, count int, depth int) ([]engine.Evaluation, error) {
	if err := engine.ValidateFEN(fen); err != nil {
		return nil, err
	}

	if count < 1 {
		count = 1
	}
	if count > 10 {
		count = 10
	}
	if depth <= 0 {
		depth = a.defaultDepth
	}
	if depth > a.maxDepth {
		depth = a.maxDepth
	}

	eng, err := a.pool.Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get engine: %w", err)
	}
	defer a.pool.Put(eng)

	result, err := eng.AnalyzePosition(fen, depth, count)
	if err != nil {
		return nil, fmt.Errorf("analysis failed: %w", err)
	}

	return result.Evaluations, nil
}
