package config

import (
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

// Config holds all service configuration
type Config struct {
	// Server settings
	GRPCPort string
	HTTPPort string

	// Stockfish settings
	Stockfish StockfishConfig

	// Worker pool settings
	WorkerPoolSize        int
	MaxConcurrentAnalyses int

	// Analysis defaults
	DefaultDepth   int
	MaxDepth       int
	MinDepth       int
	AnalysisTimeout time.Duration

	// Logging
	LogLevel  string
	LogFormat string
}

// StockfishConfig holds Stockfish-specific settings
type StockfishConfig struct {
	BinaryPath string
	Threads    int
	Hash       int // MB
	MultiPV    int
}

// Load loads configuration from environment
func Load() (*Config, error) {
	// Load .env file if present
	_ = godotenv.Load()

	return &Config{
		GRPCPort: getEnv("GRPC_PORT", "50051"),
		HTTPPort: getEnv("HTTP_PORT", "8081"),

		Stockfish: StockfishConfig{
			BinaryPath: getEnv("STOCKFISH_PATH", "/usr/local/bin/stockfish"),
			Threads:    getEnvInt("STOCKFISH_THREADS", 4),
			Hash:       getEnvInt("STOCKFISH_HASH", 2048),
			MultiPV:    getEnvInt("STOCKFISH_MULTI_PV", 3),
		},

		WorkerPoolSize:        getEnvInt("WORKER_POOL_SIZE", 4),
		MaxConcurrentAnalyses: getEnvInt("MAX_CONCURRENT_ANALYSES", 10),

		DefaultDepth:    getEnvInt("DEFAULT_DEPTH", 20),
		MaxDepth:        getEnvInt("MAX_DEPTH", 30),
		MinDepth:        getEnvInt("MIN_DEPTH", 10),
		AnalysisTimeout: time.Duration(getEnvInt("ANALYSIS_TIMEOUT_SECONDS", 60)) * time.Second,

		LogLevel:  getEnv("LOG_LEVEL", "info"),
		LogFormat: getEnv("LOG_FORMAT", "json"),
	}, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultValue
}
