package engine

import (
	"bufio"
	"errors"
	"fmt"
	"io"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"go.uber.org/zap"
)

// Engine represents a Stockfish process
type Engine struct {
	cmd     *exec.Cmd
	stdin   io.WriteCloser
	stdout  *bufio.Scanner
	mu      sync.Mutex
	logger  *zap.Logger
	config  Config
	ready   bool
	version string
}

// Config holds engine configuration
type Config struct {
	BinaryPath string
	Threads    int
	Hash       int
	MultiPV    int
}

// Evaluation represents position evaluation
type Evaluation struct {
	Centipawns int
	MateIn     *int
	IsMate     bool
	Depth      int
	SelDepth   int
	Nodes      int64
	NPS        int64
	TimeMs     int64
	PV         []string
	MultiPV    int
}

// AnalysisResult holds the complete analysis result
type AnalysisResult struct {
	Evaluations []Evaluation // All evaluations if MultiPV > 1
	BestMove    string
	PonderMove  string
	FEN         string
	Depth       int
	TimeMs      int64
}

// NewEngine creates and initializes a new Stockfish engine
func NewEngine(config Config, logger *zap.Logger) (*Engine, error) {
	cmd := exec.Command(config.BinaryPath)

	stdin, err := cmd.StdinPipe()
	if err != nil {
		return nil, fmt.Errorf("failed to create stdin pipe: %w", err)
	}

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		stdin.Close()
		return nil, fmt.Errorf("failed to create stdout pipe: %w", err)
	}

	if err := cmd.Start(); err != nil {
		stdin.Close()
		return nil, fmt.Errorf("failed to start stockfish: %w", err)
	}

	engine := &Engine{
		cmd:    cmd,
		stdin:  stdin,
		stdout: bufio.NewScanner(stdout),
		logger: logger,
		config: config,
	}

	if err := engine.initialize(); err != nil {
		engine.Close()
		return nil, fmt.Errorf("failed to initialize engine: %w", err)
	}

	return engine, nil
}

// initialize sets up the UCI protocol and options
func (e *Engine) initialize() error {
	// Send UCI command
	if err := e.sendCommand("uci"); err != nil {
		return err
	}

	// Wait for uciok
	for e.stdout.Scan() {
		line := e.stdout.Text()

		if strings.HasPrefix(line, "id name") {
			e.version = strings.TrimPrefix(line, "id name ")
		}

		if line == "uciok" {
			break
		}
	}

	if e.stdout.Err() != nil {
		return e.stdout.Err()
	}

	// Set options
	if err := e.sendCommand(fmt.Sprintf("setoption name Threads value %d", e.config.Threads)); err != nil {
		return err
	}
	if err := e.sendCommand(fmt.Sprintf("setoption name Hash value %d", e.config.Hash)); err != nil {
		return err
	}
	if e.config.MultiPV > 1 {
		if err := e.sendCommand(fmt.Sprintf("setoption name MultiPV value %d", e.config.MultiPV)); err != nil {
			return err
		}
	}

	// Check if ready
	if err := e.sendCommand("isready"); err != nil {
		return err
	}

	for e.stdout.Scan() {
		if e.stdout.Text() == "readyok" {
			break
		}
	}

	e.ready = true
	e.logger.Info("Stockfish initialized", zap.String("version", e.version))
	return nil
}

// sendCommand sends a command to the engine
func (e *Engine) sendCommand(cmd string) error {
	e.mu.Lock()
	defer e.mu.Unlock()

	_, err := e.stdin.Write([]byte(cmd + "\n"))
	if err != nil {
		return fmt.Errorf("failed to send command '%s': %w", cmd, err)
	}

	e.logger.Debug("Sent command", zap.String("cmd", cmd))
	return nil
}

// SetMultiPV changes the number of principal variations
func (e *Engine) SetMultiPV(count int) error {
	if count < 1 || count > 10 {
		return errors.New("MultiPV must be between 1 and 10")
	}
	return e.sendCommand(fmt.Sprintf("setoption name MultiPV value %d", count))
}

// AnalyzePosition analyzes a FEN position to a given depth
func (e *Engine) AnalyzePosition(fen string, depth int, multiPV int) (*AnalysisResult, error) {
	if !e.ready {
		return nil, errors.New("engine not ready")
	}

	// Set MultiPV if different from config
	if multiPV > 0 && multiPV != e.config.MultiPV {
		if err := e.SetMultiPV(multiPV); err != nil {
			return nil, err
		}
	}

	// Set position
	if err := e.sendCommand(fmt.Sprintf("position fen %s", fen)); err != nil {
		return nil, err
	}

	// Start analysis
	if err := e.sendCommand(fmt.Sprintf("go depth %d", depth)); err != nil {
		return nil, err
	}

	return e.readAnalysisResult(fen, multiPV)
}

// AnalyzePositionWithTime analyzes with a time limit
func (e *Engine) AnalyzePositionWithTime(fen string, timeMs int, multiPV int) (*AnalysisResult, error) {
	if !e.ready {
		return nil, errors.New("engine not ready")
	}

	if multiPV > 0 && multiPV != e.config.MultiPV {
		if err := e.SetMultiPV(multiPV); err != nil {
			return nil, err
		}
	}

	if err := e.sendCommand(fmt.Sprintf("position fen %s", fen)); err != nil {
		return nil, err
	}

	if err := e.sendCommand(fmt.Sprintf("go movetime %d", timeMs)); err != nil {
		return nil, err
	}

	return e.readAnalysisResult(fen, multiPV)
}

// readAnalysisResult reads and parses the engine output
func (e *Engine) readAnalysisResult(fen string, multiPV int) (*AnalysisResult, error) {
	result := &AnalysisResult{
		FEN:         fen,
		Evaluations: make([]Evaluation, 0),
	}

	evalMap := make(map[int]*Evaluation) // Track evaluations by MultiPV number

	for e.stdout.Scan() {
		line := e.stdout.Text()
		e.logger.Debug("Engine output", zap.String("line", line))

		if strings.HasPrefix(line, "info") && strings.Contains(line, "depth") {
			eval := parseInfoLine(line)
			if eval != nil {
				pvNum := eval.MultiPV
				if pvNum == 0 {
					pvNum = 1
				}
				evalMap[pvNum] = eval
			}
		}

		if strings.HasPrefix(line, "bestmove") {
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				result.BestMove = parts[1]
			}
			if len(parts) >= 4 && parts[2] == "ponder" {
				result.PonderMove = parts[3]
			}
			break
		}
	}

	if e.stdout.Err() != nil {
		return nil, e.stdout.Err()
	}

	// Convert map to slice, ordered by MultiPV number
	maxPV := multiPV
	if maxPV == 0 {
		maxPV = 1
	}
	for i := 1; i <= maxPV; i++ {
		if eval, ok := evalMap[i]; ok {
			result.Evaluations = append(result.Evaluations, *eval)
			if i == 1 {
				result.Depth = eval.Depth
				result.TimeMs = eval.TimeMs
			}
		}
	}

	return result, nil
}

// parseInfoLine parses a UCI info line
func parseInfoLine(line string) *Evaluation {
	eval := &Evaluation{}
	parts := strings.Fields(line)

	for i := 0; i < len(parts); i++ {
		switch parts[i] {
		case "depth":
			if i+1 < len(parts) {
				eval.Depth, _ = strconv.Atoi(parts[i+1])
			}
		case "seldepth":
			if i+1 < len(parts) {
				eval.SelDepth, _ = strconv.Atoi(parts[i+1])
			}
		case "multipv":
			if i+1 < len(parts) {
				eval.MultiPV, _ = strconv.Atoi(parts[i+1])
			}
		case "score":
			if i+1 < len(parts) {
				if parts[i+1] == "cp" && i+2 < len(parts) {
					eval.Centipawns, _ = strconv.Atoi(parts[i+2])
					eval.IsMate = false
				} else if parts[i+1] == "mate" && i+2 < len(parts) {
					mateIn, _ := strconv.Atoi(parts[i+2])
					eval.MateIn = &mateIn
					eval.IsMate = true
				}
			}
		case "nodes":
			if i+1 < len(parts) {
				eval.Nodes, _ = strconv.ParseInt(parts[i+1], 10, 64)
			}
		case "nps":
			if i+1 < len(parts) {
				eval.NPS, _ = strconv.ParseInt(parts[i+1], 10, 64)
			}
		case "time":
			if i+1 < len(parts) {
				eval.TimeMs, _ = strconv.ParseInt(parts[i+1], 10, 64)
			}
		case "pv":
			eval.PV = parts[i+1:]
			return eval // PV is always at the end
		}
	}

	return eval
}

// Reset prepares the engine for a new game
func (e *Engine) Reset() error {
	if err := e.sendCommand("ucinewgame"); err != nil {
		return err
	}
	if err := e.sendCommand("isready"); err != nil {
		return err
	}

	for e.stdout.Scan() {
		if e.stdout.Text() == "readyok" {
			break
		}
	}

	return e.stdout.Err()
}

// Stop stops the current analysis
func (e *Engine) Stop() error {
	return e.sendCommand("stop")
}

// Close shuts down the engine
func (e *Engine) Close() error {
	e.mu.Lock()
	defer e.mu.Unlock()

	e.ready = false

	if e.stdin != nil {
		e.stdin.Write([]byte("quit\n"))
		e.stdin.Close()
	}

	if e.cmd != nil && e.cmd.Process != nil {
		// Give it time to quit gracefully
		done := make(chan error, 1)
		go func() {
			done <- e.cmd.Wait()
		}()

		select {
		case <-done:
			// Process exited
		case <-time.After(2 * time.Second):
			// Force kill if it doesn't exit
			e.cmd.Process.Kill()
		}
	}

	e.logger.Info("Engine closed")
	return nil
}

// IsReady returns whether the engine is ready
func (e *Engine) IsReady() bool {
	return e.ready
}

// Version returns the Stockfish version string
func (e *Engine) Version() string {
	return e.version
}

// ValidateFEN checks if a FEN string is valid
func ValidateFEN(fen string) error {
	parts := strings.Fields(fen)
	if len(parts) < 4 {
		return errors.New("invalid FEN: too few parts")
	}

	// Validate piece placement
	ranks := strings.Split(parts[0], "/")
	if len(ranks) != 8 {
		return errors.New("invalid FEN: must have 8 ranks")
	}

	// Validate each rank
	pieceRegex := regexp.MustCompile(`^[kqrbnpKQRBNP1-8]+$`)
	for _, rank := range ranks {
		if !pieceRegex.MatchString(rank) {
			return fmt.Errorf("invalid FEN: invalid characters in rank '%s'", rank)
		}

		// Count squares in rank
		count := 0
		for _, c := range rank {
			if c >= '1' && c <= '8' {
				count += int(c - '0')
			} else {
				count++
			}
		}
		if count != 8 {
			return fmt.Errorf("invalid FEN: rank '%s' does not have 8 squares", rank)
		}
	}

	// Validate side to move
	if parts[1] != "w" && parts[1] != "b" {
		return errors.New("invalid FEN: side to move must be 'w' or 'b'")
	}

	return nil
}
