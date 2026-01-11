package evaluation

import (
	"math"
	"testing"
)

// === MOVE CLASSIFICATION TESTS ===

func TestClassifyMove_Best(t *testing.T) {
	tests := []struct {
		name       string
		cpLoss     int
		wasBest    bool
		evalBefore int
		evalAfter  int
		want       MoveClassification
	}{
		{"exact best move", 0, true, 100, 100, ClassBest},
		{"was best move with small loss", 5, true, 100, 95, ClassBest},
		{"within threshold", 10, false, 100, 90, ClassBest},
		{"at threshold", 10, false, 50, 40, ClassBest},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ClassifyMove(tt.cpLoss, tt.wasBest, tt.evalBefore, tt.evalAfter, false)
			if got != tt.want {
				t.Errorf("ClassifyMove() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestClassifyMove_Excellent(t *testing.T) {
	tests := []struct {
		name   string
		cpLoss int
		want   MoveClassification
	}{
		{"just over best", 11, ClassExcellent},
		{"mid excellent", 20, ClassExcellent},
		{"at excellent threshold", 25, ClassExcellent},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ClassifyMove(tt.cpLoss, false, 100, 100-tt.cpLoss, false)
			if got != tt.want {
				t.Errorf("ClassifyMove() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestClassifyMove_Good(t *testing.T) {
	tests := []struct {
		name   string
		cpLoss int
		want   MoveClassification
	}{
		{"just over excellent", 26, ClassGood},
		{"mid good", 40, ClassGood},
		{"at good threshold", 50, ClassGood},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ClassifyMove(tt.cpLoss, false, 100, 100-tt.cpLoss, false)
			if got != tt.want {
				t.Errorf("ClassifyMove() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestClassifyMove_Inaccuracy(t *testing.T) {
	tests := []struct {
		name   string
		cpLoss int
		want   MoveClassification
	}{
		{"just over good", 51, ClassInaccuracy},
		{"mid inaccuracy", 75, ClassInaccuracy},
		{"at inaccuracy threshold", 100, ClassInaccuracy},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ClassifyMove(tt.cpLoss, false, 200, 200-tt.cpLoss, false)
			if got != tt.want {
				t.Errorf("ClassifyMove() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestClassifyMove_Mistake(t *testing.T) {
	tests := []struct {
		name   string
		cpLoss int
		want   MoveClassification
	}{
		{"just over inaccuracy", 101, ClassMistake},
		{"mid mistake", 200, ClassMistake},
		{"at mistake threshold", 300, ClassMistake},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ClassifyMove(tt.cpLoss, false, 400, 400-tt.cpLoss, false)
			if got != tt.want {
				t.Errorf("ClassifyMove() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestClassifyMove_Blunder(t *testing.T) {
	tests := []struct {
		name       string
		cpLoss     int
		evalBefore int
		evalAfter  int
		want       MoveClassification
	}{
		{"just over mistake", 301, 150, -151, ClassBlunder},
		// These have high evalBefore, so they may trigger missed_win
		// Use lower evalBefore to test pure blunder
		{"large blunder from equal", 500, 100, -400, ClassBlunder},
		{"catastrophic blunder from equal", 1000, 50, -950, ClassBlunder},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ClassifyMove(tt.cpLoss, false, tt.evalBefore, tt.evalAfter, false)
			if got != tt.want {
				t.Errorf("ClassifyMove() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestClassifyMove_MissedWin(t *testing.T) {
	// Missed win: was winning (eval >= 200), now not (eval < 100)
	got := ClassifyMove(400, false, 300, 50, false)
	if got != ClassMissedWin {
		t.Errorf("ClassifyMove() = %v, want ClassMissedWin", got)
	}
}

// === CENTIPAWN LOSS TESTS ===

func TestCalculateCentipawnLoss(t *testing.T) {
	tests := []struct {
		name       string
		evalBefore int
		evalAfter  int
		isBlack    bool
		want       int
	}{
		{"white improves", 100, 150, false, 0},       // Improvement = 0 loss
		{"white loses", 100, 50, false, 50},          // Lost 50cp
		{"white blunders", 100, -200, false, 300},    // Lost 300cp
		{"black improves", -100, -150, true, 0},      // Improvement = 0 loss
		{"black loses", -100, -50, true, 50},         // Lost 50cp
		{"black blunders", -100, 200, true, 300},     // Lost 300cp
		{"equal position stays equal", 0, 0, false, 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := CalculateCentipawnLoss(tt.evalBefore, tt.evalAfter, tt.isBlack)
			if got != tt.want {
				t.Errorf("CalculateCentipawnLoss() = %v, want %v", got, tt.want)
			}
		})
	}
}

// === ACCURACY TESTS ===

func TestCalculateAccuracy(t *testing.T) {
	tests := []struct {
		name  string
		moves []MoveEvaluation
		color string
		want  float64
	}{
		{
			name:  "perfect game",
			moves: createMoves("white", []int{0, 0, 0, 0, 0}),
			color: "white",
			want:  100.0,
		},
		{
			name:  "average game",
			moves: createMoves("white", []int{50, 50, 50, 50, 50}),
			color: "white",
			want:  90.0, // 50/500 = 10% loss per move
		},
		{
			name:  "terrible game",
			moves: createMoves("white", []int{500, 500, 500, 500, 500}),
			color: "white",
			want:  0.0, // Max loss per move
		},
		{
			name:  "single blunder capped",
			moves: createMoves("white", []int{0, 0, 1000, 0, 0}),
			color: "white",
			want:  80.0, // 1000 capped to 500, so 500/2500 = 20% loss
		},
		{
			name:  "mixed game",
			moves: createMoves("white", []int{10, 50, 100, 200, 300}),
			color: "white",
			want:  73.6, // (10+50+100+200+300) / 2500 = 26.4% loss = 73.6% accuracy
		},
		{
			name:  "no moves",
			moves: []MoveEvaluation{},
			color: "white",
			want:  100.0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := CalculateAccuracy(tt.moves, tt.color)
			if !almostEqual(got, tt.want, 0.1) {
				t.Errorf("CalculateAccuracy() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestCalculateAccuracy_FiltersByColor(t *testing.T) {
	moves := []MoveEvaluation{
		{Color: "white", CentipawnLoss: 0},
		{Color: "black", CentipawnLoss: 500},
		{Color: "white", CentipawnLoss: 0},
		{Color: "black", CentipawnLoss: 500},
	}

	whiteAcc := CalculateAccuracy(moves, "white")
	blackAcc := CalculateAccuracy(moves, "black")

	if whiteAcc != 100.0 {
		t.Errorf("White accuracy = %v, want 100.0", whiteAcc)
	}
	if blackAcc != 0.0 {
		t.Errorf("Black accuracy = %v, want 0.0", blackAcc)
	}
}

// === ACPL TESTS ===

func TestCalculateACPL(t *testing.T) {
	tests := []struct {
		name  string
		moves []MoveEvaluation
		color string
		want  float64
	}{
		{
			name:  "perfect game",
			moves: createMoves("white", []int{0, 0, 0, 0, 0}),
			color: "white",
			want:  0.0,
		},
		{
			name:  "average losses",
			moves: createMoves("white", []int{20, 30, 40, 50, 60}),
			color: "white",
			want:  40.0, // (20+30+40+50+60) / 5
		},
		{
			name:  "with one big loss",
			moves: createMoves("white", []int{10, 10, 300, 10, 10}),
			color: "white",
			want:  68.0, // (10+10+300+10+10) / 5
		},
		{
			name:  "no moves",
			moves: []MoveEvaluation{},
			color: "white",
			want:  0.0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := CalculateACPL(tt.moves, tt.color)
			if !almostEqual(got, tt.want, 0.01) {
				t.Errorf("CalculateACPL() = %v, want %v", got, tt.want)
			}
		})
	}
}

// === T1 ACCURACY TESTS ===

func TestCalculateT1Accuracy(t *testing.T) {
	tests := []struct {
		name string
		acpl float64
		min  float64 // Expected minimum
		max  float64 // Expected maximum
	}{
		{"perfect play", 0.0, 100.0, 100.0},
		{"very good", 10.0, 60.0, 70.0},
		{"average", 30.0, 20.0, 35.0},
		{"below average", 50.0, 8.0, 15.0},
		{"very high acpl", 100.0, 0.0, 5.0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := CalculateT1Accuracy(tt.acpl)
			if got < tt.min || got > tt.max {
				t.Errorf("CalculateT1Accuracy(%v) = %v, want between %v and %v", tt.acpl, got, tt.min, tt.max)
			}
		})
	}
}

// === PERFORMANCE RATING TESTS ===

func TestCalculatePerformanceRating(t *testing.T) {
	tests := []struct {
		name           string
		opponentRating int
		accuracy       float64
		result         GameResult
		minExpected    int
		maxExpected    int
	}{
		{
			name:           "high accuracy win",
			opponentRating: 1500,
			accuracy:       90.0,
			result:         ResultWin,
			minExpected:    2100, // 1500 + 320 (acc bonus) + 400 (win)
			maxExpected:    2300,
		},
		{
			name:           "average accuracy draw",
			opponentRating: 1500,
			accuracy:       50.0,
			result:         ResultDraw,
			minExpected:    1400,
			maxExpected:    1600,
		},
		{
			name:           "low accuracy loss",
			opponentRating: 1500,
			accuracy:       30.0,
			result:         ResultLoss,
			minExpected:    800, // 1500 - 160 (acc penalty) - 400 (loss)
			maxExpected:    1100,
		},
		{
			name:           "grandmaster level",
			opponentRating: 2700,
			accuracy:       95.0,
			result:         ResultWin,
			minExpected:    3300,
			maxExpected:    3600,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := CalculatePerformanceRating(tt.opponentRating, tt.accuracy, tt.result)
			if got < tt.minExpected || got > tt.maxExpected {
				t.Errorf("CalculatePerformanceRating() = %v, want between %v and %v", got, tt.minExpected, tt.maxExpected)
			}
		})
	}
}

// === BRILLIANT MOVE TESTS ===

func TestIsBrilliantMove(t *testing.T) {
	tests := []struct {
		name              string
		evalBefore        int
		evalAfter         int
		materialSacrificed int
		want              bool
	}{
		{"no sacrifice", 100, 150, 0, false},
		{"small sacrifice, big improvement", 100, 300, 100, true},
		{"pawn sacrifice, maintains advantage", 250, 350, 100, true},
		{"piece sacrifice, position improves", 0, 200, 300, true},
		{"bad sacrifice", 100, -50, 300, false},
		{"sacrifice that doesn't work", 100, 50, 200, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := IsBrilliantMove(tt.evalBefore, tt.evalAfter, tt.materialSacrificed)
			if got != tt.want {
				t.Errorf("IsBrilliantMove() = %v, want %v", got, tt.want)
			}
		})
	}
}

// === HELPER FUNCTION TESTS ===

func TestNormalizeMateScore(t *testing.T) {
	tests := []struct {
		name   string
		mateIn int
		want   int
	}{
		{"mate in 1", 1, MateScore - 1},
		{"mate in 5", 5, MateScore - 5},
		{"getting mated in 1", -1, -MateScore - (-1)},
		{"getting mated in 3", -3, -MateScore - (-3)},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := NormalizeMateScore(tt.mateIn)
			if got != tt.want {
				t.Errorf("NormalizeMateScore() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestEvalToWinProbability(t *testing.T) {
	tests := []struct {
		name       string
		centipawns int
		minProb    float64
		maxProb    float64
	}{
		{"equal position", 0, 0.48, 0.52},
		{"slight advantage", 50, 0.53, 0.58},
		{"clear advantage", 100, 0.60, 0.68},
		{"winning position", 300, 0.80, 0.90},
		{"lost position", -200, 0.15, 0.25},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := EvalToWinProbability(tt.centipawns)
			if got < tt.minProb || got > tt.maxProb {
				t.Errorf("EvalToWinProbability(%d) = %v, want between %v and %v", tt.centipawns, got, tt.minProb, tt.maxProb)
			}
		})
	}
}

func TestCalculateComplexity(t *testing.T) {
	tests := []struct {
		name     string
		topEvals []int
		minComp  float64
		maxComp  float64
	}{
		{"single option", []int{100}, 0.0, 0.0},
		{"equal options", []int{100, 100, 100}, 0.0, 0.1},
		{"varied options", []int{100, 50, -50}, 55.0, 75.0},
		{"very complex", []int{500, 0, -500}, 350.0, 500.0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := CalculateComplexity(tt.topEvals)
			if got < tt.minComp || got > tt.maxComp {
				t.Errorf("CalculateComplexity() = %v, want between %v and %v", got, tt.minComp, tt.maxComp)
			}
		})
	}
}

// === INTEGRATION TESTS ===

func TestCalculatePlayerMetrics(t *testing.T) {
	moves := []MoveEvaluation{
		{Color: "white", CentipawnLoss: 5, WasBestMove: true, EvalBefore: 100, EvalAfter: 95},
		{Color: "black", CentipawnLoss: 300, WasBestMove: false, EvalBefore: 100, EvalAfter: -200},
		{Color: "white", CentipawnLoss: 50, WasBestMove: false, EvalBefore: 200, EvalAfter: 150},
		{Color: "black", CentipawnLoss: 100, WasBestMove: false, EvalBefore: 150, EvalAfter: 50},
		{Color: "white", CentipawnLoss: 0, WasBestMove: true, EvalBefore: 50, EvalAfter: 50},
		{Color: "black", CentipawnLoss: 500, WasBestMove: false, EvalBefore: 50, EvalAfter: -450},
	}

	whiteMetrics := CalculatePlayerMetrics(moves, "white", 1500, ResultWin)
	blackMetrics := CalculatePlayerMetrics(moves, "black", 1500, ResultLoss)

	// White should have much better metrics
	if whiteMetrics.Accuracy <= blackMetrics.Accuracy {
		t.Errorf("White accuracy (%v) should be higher than black (%v)", whiteMetrics.Accuracy, blackMetrics.Accuracy)
	}

	if whiteMetrics.ACPL >= blackMetrics.ACPL {
		t.Errorf("White ACPL (%v) should be lower than black (%v)", whiteMetrics.ACPL, blackMetrics.ACPL)
	}

	if whiteMetrics.TotalMoves != 3 {
		t.Errorf("White total moves = %v, want 3", whiteMetrics.TotalMoves)
	}

	if blackMetrics.TotalMoves != 3 {
		t.Errorf("Black total moves = %v, want 3", blackMetrics.TotalMoves)
	}

	// White should have best moves
	if whiteMetrics.BestMoves < 2 {
		t.Errorf("White best moves = %v, want at least 2", whiteMetrics.BestMoves)
	}

	// Black should have blunders
	if blackMetrics.Blunders < 1 {
		t.Errorf("Black blunders = %v, want at least 1", blackMetrics.Blunders)
	}
}

// === TEST HELPERS ===

func createMoves(color string, losses []int) []MoveEvaluation {
	moves := make([]MoveEvaluation, len(losses))
	for i, loss := range losses {
		moves[i] = MoveEvaluation{
			Color:         color,
			CentipawnLoss: loss,
			EvalBefore:    100,
			EvalAfter:     100 - loss,
		}
	}
	return moves
}

func almostEqual(a, b, epsilon float64) bool {
	return math.Abs(a-b) <= epsilon
}

// === BENCHMARK TESTS ===

func BenchmarkCalculateAccuracy(b *testing.B) {
	moves := createMoves("white", []int{10, 20, 30, 40, 50, 60, 70, 80, 90, 100})

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		CalculateAccuracy(moves, "white")
	}
}

func BenchmarkClassifyMove(b *testing.B) {
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		ClassifyMove(150, false, 200, 50, false)
	}
}

func BenchmarkCalculatePlayerMetrics(b *testing.B) {
	moves := make([]MoveEvaluation, 40)
	for i := range moves {
		color := "white"
		if i%2 == 1 {
			color = "black"
		}
		moves[i] = MoveEvaluation{
			Color:         color,
			CentipawnLoss: (i * 10) % 200,
			EvalBefore:    100,
			EvalAfter:     100 - (i*10)%200,
		}
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		CalculatePlayerMetrics(moves, "white", 1500, ResultWin)
	}
}
