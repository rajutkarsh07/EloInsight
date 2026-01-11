package main

import (
	"context"
	"fmt"
	"net"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/eloinsight/analysis-service/internal/analyzer"
	"github.com/eloinsight/analysis-service/internal/config"
	"github.com/eloinsight/analysis-service/internal/engine"
	servergrpc "github.com/eloinsight/analysis-service/internal/grpc"
	"github.com/eloinsight/analysis-service/internal/pool"
	pb "github.com/eloinsight/analysis-service/proto"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
	"google.golang.org/grpc"
	"google.golang.org/grpc/health"
	"google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/reflection"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to load config: %v\n", err)
		os.Exit(1)
	}

	// Setup logger
	logger := setupLogger(cfg.LogLevel, cfg.LogFormat)
	defer logger.Sync()

	logger.Info("Starting EloInsight Analysis Service",
		zap.String("grpcPort", cfg.GRPCPort),
		zap.Int("workers", cfg.WorkerPoolSize))

	// Create engine pool
	engineConfig := engine.Config{
		BinaryPath: cfg.Stockfish.BinaryPath,
		Threads:    cfg.Stockfish.Threads,
		Hash:       cfg.Stockfish.Hash,
		MultiPV:    cfg.Stockfish.MultiPV,
	}

	enginePool, err := pool.NewPool(cfg.WorkerPoolSize, engineConfig, logger)
	if err != nil {
		logger.Fatal("Failed to create engine pool", zap.Error(err))
	}
	defer enginePool.Close()

	// Create analyzer
	analyzerService := analyzer.NewAnalyzer(
		enginePool,
		logger,
		cfg.DefaultDepth,
		cfg.MaxDepth,
		cfg.AnalysisTimeout,
	)

	// Create gRPC server
	grpcServer := grpc.NewServer(
		grpc.MaxRecvMsgSize(10*1024*1024), // 10MB max message size
		grpc.MaxSendMsgSize(10*1024*1024),
	)

	// Register analysis service
	analysisServer := servergrpc.NewServer(analyzerService, enginePool, logger)
	pb.RegisterAnalysisServiceServer(grpcServer, analysisServer)

	// Register health service
	healthServer := health.NewServer()
	healthServer.SetServingStatus("", grpc_health_v1.HealthCheckResponse_SERVING)
	grpc_health_v1.RegisterHealthServer(grpcServer, healthServer)

	// Enable reflection for debugging
	reflection.Register(grpcServer)

	// Start gRPC server
	listener, err := net.Listen("tcp", ":"+cfg.GRPCPort)
	if err != nil {
		logger.Fatal("Failed to listen", zap.String("port", cfg.GRPCPort), zap.Error(err))
	}

	go func() {
		logger.Info("gRPC server listening", zap.String("address", listener.Addr().String()))
		if err := grpcServer.Serve(listener); err != nil {
			logger.Error("gRPC server error", zap.Error(err))
		}
	}()

	// Wait for shutdown signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	sig := <-quit

	logger.Info("Shutting down", zap.String("signal", sig.String()))

	// Graceful shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Stop accepting new requests
	grpcServer.GracefulStop()

	// Wait for pool to drain
	select {
	case <-ctx.Done():
		logger.Warn("Shutdown timeout, forcing exit")
	default:
		logger.Info("Graceful shutdown complete")
	}
}

func setupLogger(level string, format string) *zap.Logger {
	var logLevel zapcore.Level
	switch level {
	case "debug":
		logLevel = zapcore.DebugLevel
	case "info":
		logLevel = zapcore.InfoLevel
	case "warn":
		logLevel = zapcore.WarnLevel
	case "error":
		logLevel = zapcore.ErrorLevel
	default:
		logLevel = zapcore.InfoLevel
	}

	var config zap.Config
	if format == "json" {
		config = zap.NewProductionConfig()
	} else {
		config = zap.NewDevelopmentConfig()
		config.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
	}
	config.Level = zap.NewAtomicLevelAt(logLevel)

	logger, err := config.Build()
	if err != nil {
		panic(err)
	}

	return logger
}
