// Package evaluation provides chess game evaluation metrics.
// It converts Stockfish evaluations into human-readable metrics like
// accuracy percentage, ACPL, move classifications, and performance rating.
package evaluation

import (
	"math"
)

// === THRESHOLD CONSTANTS ===
// Based on chess.com and lichess standards for move classification

// Move Classification Thresholds (in centipawns)
const (
	// BestMoveThreshold: Move matches or is within 10cp of best move
	BestMoveThreshold = 10

	// ExcellentMoveThreshold: Very strong move, minimal loss
	ExcellentMoveThreshold = 25

	// GoodMoveThreshold: Solid move, acceptable loss
	GoodMoveThreshold = 50

	// InaccuracyThreshold: Small mistake, missed better option
	InaccuracyThreshold = 100

	// MistakeThreshold: Significant error, loses advantage
	MistakeThreshold = 300

	// BlunderThreshold: Major mistake, loses game/material
	BlunderThreshold = 301
)

// Accuracy Calculation Constants
const (
	// MaxCPLossPerMove caps the centipawn loss per move for accuracy calculation
	// This prevents a single catastrophic blunder from destroying the accuracy score
	MaxCPLossPerMove = 500.0

	// WinningThreshold: Position considered winning (in centipawns)
	WinningThreshold = 200

	// DeadDrawThreshold: Position is likely a draw (in centipawns)
	DeadDrawThreshold = 20

	// MateScore: Stockfish returns this when mate is found
	MateScore = 10000
)

// Performance Rating Constants
const (
	// BasePerformanceBonus for a win
	WinBonus = 400

	// BasePerformancePenalty for a loss
	LossPenalty = -400

	// DrawAdjustment for draws
	DrawAdjustment = 0

	// AccuracyWeight determines how much accuracy affects performance
	AccuracyWeight = 8.0
)

// === TYPES ===

// MoveClassification represents the quality of a chess move
type MoveClassification string

const (
	ClassBrilliant  MoveClassification = "brilliant"
	ClassGreat      MoveClassification = "great"
	ClassBest       MoveClassification = "best"
	ClassExcellent  MoveClassification = "excellent"
	ClassGood       MoveClassification = "good"
	ClassBook       MoveClassification = "book"
	ClassNormal     MoveClassification = "normal"
	ClassInaccuracy MoveClassification = "inaccuracy"
	ClassMistake    MoveClassification = "mistake"
	ClassBlunder    MoveClassification = "blunder"
	ClassMissedWin  MoveClassification = "missed_win"
)

// GameResult represents the outcome of a game
type GameResult string

const (
	ResultWin  GameResult = "win"
	ResultLoss GameResult = "loss"
	ResultDraw GameResult = "draw"
)

// MoveEvaluation contains evaluation data for a single move
type MoveEvaluation struct {
	Ply           int    // Half-move number (0-indexed)
	MoveNumber    int    // Full move number (1-indexed)
	Color         string // "white" or "black"
	PlayedMove    string // Move in SAN notation
	BestMove      string // Best move in SAN notation
	EvalBefore    int    // Centipawn evaluation before move
	EvalAfter     int    // Centipawn evaluation after move
	IsMateScore   bool   // True if evaluation is mate score
	MateIn        *int   // Moves to mate (nil if not mate)
	CentipawnLoss int    // Loss in centipawns from played move
	WasBestMove   bool   // True if played move was the best move
}

// PlayerMetrics contains aggregated analysis metrics for one player
type PlayerMetrics struct {
	Accuracy          float64 // 0-100 percentage
	ACPL              float64 // Average Centipawn Loss
	TotalCPLoss       int     // Sum of all centipawn losses
	Blunders          int     // Moves with >300cp loss
	Mistakes          int     // Moves with 101-300cp loss
	Inaccuracies      int     // Moves with 51-100cp loss
	GoodMoves         int     // Moves with 26-50cp loss
	ExcellentMoves    int     // Moves with 11-25cp loss
	BestMoves         int     // Moves with ≤10cp loss
	BrilliantMoves    int     // Exceptional moves (sacrifice + advantage)
	BookMoves         int     // Opening book moves
	TotalMoves        int     // Total moves analyzed
	PerformanceRating int     // Estimated performance rating
	T1Accuracy        float64 // Alternative T1 accuracy calculation
}

// GameEvaluation contains complete evaluation for a game
type GameEvaluation struct {
	GameID       string
	WhitePlayer  string
	BlackPlayer  string
	WhiteRating  int
	BlackRating  int
	Result       GameResult
	WhiteMetrics PlayerMetrics
	BlackMetrics PlayerMetrics
	Moves        []MoveEvaluation
}

// === CORE EVALUATION FUNCTIONS ===

// ClassifyMove determines the classification of a move based on centipawn loss
func ClassifyMove(cpLoss int, wasBestMove bool, evalBefore, evalAfter int, isMateScore bool) MoveClassification {
	// Best move gets best classification
	if wasBestMove {
		return ClassBest
	}

	// Check for missed win (was winning, now not)
	if evalBefore >= WinningThreshold && evalAfter < WinningThreshold/2 {
		return ClassMissedWin
	}

	// Classify by centipawn loss
	switch {
	case cpLoss <= BestMoveThreshold:
		return ClassBest
	case cpLoss <= ExcellentMoveThreshold:
		return ClassExcellent
	case cpLoss <= GoodMoveThreshold:
		return ClassGood
	case cpLoss <= InaccuracyThreshold:
		return ClassInaccuracy
	case cpLoss <= MistakeThreshold:
		return ClassMistake
	default:
		return ClassBlunder
	}
}

// IsBrilliantMove determines if a move qualifies as brilliant
// A brilliant move is one that sacrifices material BUT leads to a winning position
func IsBrilliantMove(evalBefore, evalAfter int, materialSacrificed int) bool {
	// Must sacrifice meaningful material (at least a pawn = 100cp)
	if materialSacrificed < 100 {
		return false
	}

	// The position must improve or stay very strong after the sacrifice
	// (i.e., the sacrifice works tactically)
	evalImprovement := evalAfter - evalBefore

	// Must be a good sacrifice: position improves significantly
	// despite material loss, or maintains winning advantage
	return evalImprovement >= 100 || evalAfter >= 300
}

// CalculateCentipawnLoss calculates the loss in centipawns for a move
// Takes into account the side to move (positive is always good for the player)
func CalculateCentipawnLoss(evalBefore, evalAfter int, isBlack bool) int {
	// Adjust perspective: positive should mean good for the player
	if isBlack {
		evalBefore = -evalBefore
		evalAfter = -evalAfter
	}

	// Centipawn loss is how much the position worsened
	loss := evalBefore - evalAfter

	// Can't have negative loss (improvement is 0 loss)
	if loss < 0 {
		return 0
	}

	return loss
}

// CalculateACPL calculates Average Centipawn Loss for a set of moves
func CalculateACPL(moves []MoveEvaluation, color string) float64 {
	var totalLoss float64
	var moveCount int

	for _, move := range moves {
		if move.Color != color {
			continue
		}

		totalLoss += float64(move.CentipawnLoss)
		moveCount++
	}

	if moveCount == 0 {
		return 0.0
	}

	return totalLoss / float64(moveCount)
}

// CalculateAccuracy calculates the accuracy percentage for a set of moves
// Uses the formula: Accuracy = 100 - (TotalLoss / MaxPossibleLoss) * 100
// with a cap on loss per move to prevent single blunders from destroying the score
func CalculateAccuracy(moves []MoveEvaluation, color string) float64 {
	var totalCappedLoss float64
	var moveCount int

	for _, move := range moves {
		if move.Color != color {
			continue
		}

		// Cap the loss per move to prevent catastrophic blunders from
		// completely destroying the accuracy score
		cappedLoss := math.Min(float64(move.CentipawnLoss), MaxCPLossPerMove)
		totalCappedLoss += cappedLoss
		moveCount++
	}

	if moveCount == 0 {
		return 100.0
	}

	// Maximum possible loss (if every move was MaxCPLossPerMove)
	maxPossibleLoss := float64(moveCount) * MaxCPLossPerMove

	// Calculate accuracy percentage
	accuracy := 100.0 - (totalCappedLoss/maxPossibleLoss)*100.0

	// Clamp to 0-100 range
	return math.Max(0, math.Min(100, accuracy))
}

// CalculateT1Accuracy calculates accuracy using Lichess's T1 formula
// This provides a different perspective on accuracy that's more forgiving
// Formula: 103.1668 * exp(-0.04354 * ACPL) - 3.1669
func CalculateT1Accuracy(acpl float64) float64 {
	if acpl <= 0 {
		return 100.0
	}

	accuracy := 103.1668*math.Exp(-0.04354*acpl) - 3.1669

	return math.Max(0, math.Min(100, accuracy))
}

// CalculatePerformanceRating estimates the player's performance rating
// Based on opponent rating, accuracy, and game result
func CalculatePerformanceRating(opponentRating int, accuracy float64, result GameResult) int {
	baseRating := float64(opponentRating)

	// Accuracy bonus: higher accuracy = higher performance
	// Scale: accuracy of 50% = 0 bonus, 100% = +400, 0% = -400
	accuracyBonus := (accuracy - 50.0) * AccuracyWeight

	// Result adjustment
	var resultBonus float64
	switch result {
	case ResultWin:
		resultBonus = float64(WinBonus)
	case ResultLoss:
		resultBonus = float64(LossPenalty)
	case ResultDraw:
		resultBonus = float64(DrawAdjustment)
	}

	performance := baseRating + accuracyBonus + resultBonus
	return int(math.Round(performance))
}

// CountMovesByClassification counts moves in each classification category
func CountMovesByClassification(moves []MoveEvaluation, color string) map[MoveClassification]int {
	counts := make(map[MoveClassification]int)

	for _, move := range moves {
		if move.Color != color {
			continue
		}

		classification := ClassifyMove(
			move.CentipawnLoss,
			move.WasBestMove,
			move.EvalBefore,
			move.EvalAfter,
			move.IsMateScore,
		)
		counts[classification]++
	}

	return counts
}

// CalculatePlayerMetrics calculates all metrics for a player
func CalculatePlayerMetrics(moves []MoveEvaluation, color string, opponentRating int, result GameResult) PlayerMetrics {
	metrics := PlayerMetrics{}

	var totalCPLoss int
	var moveCount int

	for _, move := range moves {
		if move.Color != color {
			continue
		}

		moveCount++
		totalCPLoss += move.CentipawnLoss

		// Classify and count
		classification := ClassifyMove(
			move.CentipawnLoss,
			move.WasBestMove,
			move.EvalBefore,
			move.EvalAfter,
			move.IsMateScore,
		)

		switch classification {
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
		case ClassBlunder, ClassMissedWin:
			metrics.Blunders++
		}
	}

	metrics.TotalMoves = moveCount
	metrics.TotalCPLoss = totalCPLoss

	if moveCount > 0 {
		metrics.ACPL = CalculateACPL(moves, color)
		metrics.Accuracy = CalculateAccuracy(moves, color)
		metrics.T1Accuracy = CalculateT1Accuracy(metrics.ACPL)
		metrics.PerformanceRating = CalculatePerformanceRating(opponentRating, metrics.Accuracy, result)
	} else {
		metrics.Accuracy = 100.0
		metrics.T1Accuracy = 100.0
	}

	return metrics
}

// === HELPER FUNCTIONS ===

// NormalizeMateScore converts mate scores to a large centipawn value
// Positive = side to move is mating, Negative = side to move is getting mated
func NormalizeMateScore(mateIn int) int {
	if mateIn > 0 {
		// Mating: return large positive value, decreasing as mate is further away
		return MateScore - mateIn
	}
	// Getting mated: return large negative value
	return -MateScore - mateIn
}

// EvalToWinProbability converts centipawn evaluation to winning probability
// Uses the logistic function that approximates real game outcomes
func EvalToWinProbability(centipawns int) float64 {
	// Logistic function: P(win) = 1 / (1 + 10^(-cp/400))
	// This is based on empirical chess data
	exponent := float64(-centipawns) / 400.0
	return 1.0 / (1.0 + math.Pow(10, exponent))
}

// WinProbabilityToElo converts win probability difference to Elo difference
func WinProbabilityToElo(winProbDiff float64) float64 {
	// Elo formula: difference = 400 * log10(P / (1 - P))
	if winProbDiff <= 0 {
		return -400.0
	}
	if winProbDiff >= 1 {
		return 400.0
	}
	return 400.0 * math.Log10(winProbDiff/(1-winProbDiff))
}

// IsBookMove checks if a position is likely a book move
// based on move number and complexity
func IsBookMove(moveNumber int, isMainline bool) bool {
	// Consider first 10-15 moves as potential book moves
	// In practice, this would check against an opening database
	if moveNumber <= 10 && isMainline {
		return true
	}
	return false
}

// CalculateComplexity estimates the complexity of a position
// based on evaluation variance across top moves
func CalculateComplexity(topEvals []int) float64 {
	if len(topEvals) < 2 {
		return 0.0
	}

	// Variance in evaluations = complexity
	var sum, sumSq float64
	for _, e := range topEvals {
		sum += float64(e)
		sumSq += float64(e * e)
	}

	n := float64(len(topEvals))
	mean := sum / n
	variance := (sumSq / n) - (mean * mean)

	return math.Sqrt(variance)
}
