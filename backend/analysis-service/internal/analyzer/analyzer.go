package analyzer

import (
	"context"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/eloinsight/analysis-service/internal/engine"
	"github.com/eloinsight/analysis-service/internal/pool"
	"github.com/notnil/chess"
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

	for i := 0; i < len(positions)-1; i++ {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}

		pos := positions[i]
		nextPos := positions[i+1]

		// Analyze position BEFORE the move
		resultBefore, err := eng.AnalyzePosition(pos.FEN, depth, 1)
		if err != nil {
			a.logger.Warn("Failed to analyze position before move",
				zap.Int("ply", i),
				zap.Error(err))
			continue
		}

		if len(resultBefore.Evaluations) == 0 {
			continue
		}

		evalBefore := resultBefore.Evaluations[0]

		// Analyze position AFTER the move
		resultAfter, err := eng.AnalyzePosition(nextPos.FEN, depth, 1)
		if err != nil {
			a.logger.Warn("Failed to analyze position after move",
				zap.Int("ply", i),
				zap.Error(err))
			continue
		}

		var evalAfter engine.Evaluation
		if len(resultAfter.Evaluations) > 0 {
			evalAfter = resultAfter.Evaluations[0]
		}

		// Calculate move analysis with both evaluations
		moveAnalysis := a.createMoveAnalysis(i, pos, nextPos, &evalBefore, &evalAfter, resultBefore.BestMove)
		analysis.Moves = append(analysis.Moves, moveAnalysis)

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
	evalBefore, evalAfter *engine.Evaluation,
	bestMoveUCI string,
) MoveAnalysis {
	color := "white"
	if ply%2 == 1 {
		color = "black"
	}
	moveNumber := (ply / 2) + 1

	// The played move is stored in nextPos (the position AFTER the move was made)
	analysis := MoveAnalysis{
		MoveNumber:    moveNumber,
		Ply:           ply,
		Color:         color,
		PlayedMove:    nextPos.MoveSAN,
		PlayedMoveUCI: nextPos.MoveUCI,
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
