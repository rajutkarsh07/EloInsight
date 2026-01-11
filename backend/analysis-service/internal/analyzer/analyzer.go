package analyzer

import (
	"context"
	"errors"
	"fmt"
	"math"
	"regexp"
	"strings"
	"time"

	"github.com/eloinsight/analysis-service/internal/engine"
	"github.com/eloinsight/analysis-service/internal/pool"
	"go.uber.org/zap"
)

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
}

// NewAnalyzer creates a new analyzer
func NewAnalyzer(p *pool.Pool, logger *zap.Logger, defaultDepth, maxDepth int, timeout time.Duration) *Analyzer {
	return &Analyzer{
		pool:         p,
		logger:       logger,
		defaultDepth: defaultDepth,
		maxDepth:     maxDepth,
		timeout:      timeout,
	}
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

	eng, err := a.pool.Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get engine: %w", err)
	}
	defer a.pool.Put(eng)

	result, err := eng.AnalyzePosition(fen, depth, multiPV)
	if err != nil {
		return nil, fmt.Errorf("analysis failed: %w", err)
	}

	return result, nil
}

// AnalyzeGame analyzes a complete game
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

	eng, err := a.pool.Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get engine: %w", err)
	}
	defer a.pool.Put(eng)

	analysis := &GameAnalysis{
		GameID:        gameID,
		Moves:         make([]MoveAnalysis, 0, totalMoves),
		EngineVersion: eng.Version(),
	}

	var prevEval *engine.Evaluation

	for i := 0; i < len(positions)-1; i++ {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}

		pos := positions[i]
		nextPos := positions[i+1]

		// Analyze current position
		result, err := eng.AnalyzePosition(pos.FEN, depth, 1)
		if err != nil {
			a.logger.Warn("Failed to analyze position",
				zap.Int("ply", i),
				zap.Error(err))
			continue
		}

		if len(result.Evaluations) == 0 {
			continue
		}

		currentEval := result.Evaluations[0]

		// Calculate move analysis
		moveAnalysis := a.createMoveAnalysis(i, pos, nextPos, &currentEval, prevEval, result.BestMove)
		analysis.Moves = append(analysis.Moves, moveAnalysis)

		prevEval = &currentEval

		// Call progress callback
		if callback != nil {
			callback(i+1, totalMoves, &moveAnalysis)
		}
	}

	// Calculate metrics
	analysis.WhiteMetrics = a.calculateMetrics(analysis.Moves, "white")
	analysis.BlackMetrics = a.calculateMetrics(analysis.Moves, "black")
	analysis.TotalTimeMs = time.Since(startTime).Milliseconds()

	return analysis, nil
}

// createMoveAnalysis creates analysis for a single move
func (a *Analyzer) createMoveAnalysis(
	ply int,
	currentPos, nextPos Position,
	currentEval, prevEval *engine.Evaluation,
	bestMoveUCI string,
) MoveAnalysis {
	color := "white"
	if ply%2 == 1 {
		color = "black"
	}
	moveNumber := (ply / 2) + 1

	analysis := MoveAnalysis{
		MoveNumber:    moveNumber,
		Ply:           ply,
		Color:         color,
		PlayedMove:    currentPos.MoveSAN,
		PlayedMoveUCI: currentPos.MoveUCI,
		BestMoveUCI:   bestMoveUCI,
		FENBefore:     currentPos.FEN,
		FENAfter:      nextPos.FEN,
		EvalBefore:    *currentEval,
		Depth:         currentEval.Depth,
		PV:            currentEval.PV,
	}

	// Calculate centipawn loss
	if prevEval != nil && !currentEval.IsMate && !prevEval.IsMate {
		// Adjust for perspective (positive is always good for the side to move)
		evalBefore := currentEval.Centipawns
		evalAfter := prevEval.Centipawns

		if color == "black" {
			evalBefore = -evalBefore
			evalAfter = -evalAfter
		}

		analysis.CentipawnLoss = evalBefore - evalAfter
		if analysis.CentipawnLoss < 0 {
			analysis.CentipawnLoss = 0
		}
	}

	// Classify the move
	analysis.Classification = a.classifyMove(analysis.CentipawnLoss, currentPos.MoveUCI == bestMoveUCI)

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

// ParsePGN parses a PGN and returns the list of positions
func ParsePGN(pgn string) ([]Position, error) {
	positions := make([]Position, 0)

	// Extract moves from PGN (simplified parser)
	// Remove headers
	headerRegex := regexp.MustCompile(`\[[^\]]+\]`)
	movesSection := headerRegex.ReplaceAllString(pgn, "")

	// Remove comments
	commentRegex := regexp.MustCompile(`\{[^}]*\}`)
	movesSection = commentRegex.ReplaceAllString(movesSection, "")

	// Remove variations
	variationRegex := regexp.MustCompile(`\([^)]*\)`)
	movesSection = variationRegex.ReplaceAllString(movesSection, "")

	// Remove result
	resultRegex := regexp.MustCompile(`(1-0|0-1|1\/2-1\/2|\*)`)
	movesSection = resultRegex.ReplaceAllString(movesSection, "")

	// Remove move numbers
	moveNumRegex := regexp.MustCompile(`\d+\.+`)
	movesSection = moveNumRegex.ReplaceAllString(movesSection, "")

	// Clean up whitespace
	movesSection = strings.TrimSpace(movesSection)
	movesSection = regexp.MustCompile(`\s+`).ReplaceAllString(movesSection, " ")

	if movesSection == "" {
		return positions, nil
	}

	// Starting position
	startFEN := "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
	positions = append(positions, Position{FEN: startFEN})

	// For a real implementation, we would need a chess library to:
	// 1. Parse each SAN move
	// 2. Apply it to the board
	// 3. Generate the resulting FEN
	// For now, we'll return the moves as placeholders

	moves := strings.Fields(movesSection)
	for i, move := range moves {
		if move == "" {
			continue
		}
		// In a real implementation, we would calculate the FEN here
		positions = append(positions, Position{
			FEN:     fmt.Sprintf("position_%d", i), // Placeholder
			MoveSAN: move,
			MoveUCI: move, // Would need conversion
		})
	}

	return positions, nil
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
