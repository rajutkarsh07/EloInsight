package grpc

import (
	"context"
	"time"

	"github.com/eloinsight/analysis-service/internal/analyzer"
	"github.com/eloinsight/analysis-service/internal/engine"
	"github.com/eloinsight/analysis-service/internal/pool"
	pb "github.com/eloinsight/analysis-service/proto"
	"go.uber.org/zap"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// Server implements the AnalysisService gRPC server
type Server struct {
	pb.UnimplementedAnalysisServiceServer
	analyzer  *analyzer.Analyzer
	pool      *pool.Pool
	logger    *zap.Logger
	startTime time.Time
}

// NewServer creates a new gRPC server
func NewServer(a *analyzer.Analyzer, p *pool.Pool, logger *zap.Logger) *Server {
	return &Server{
		analyzer:  a,
		pool:      p,
		logger:    logger,
		startTime: time.Now(),
	}
}

// AnalyzePosition analyzes a single FEN position
func (s *Server) AnalyzePosition(ctx context.Context, req *pb.AnalyzePositionRequest) (*pb.PositionAnalysis, error) {
	s.logger.Info("AnalyzePosition request",
		zap.String("fen", req.Fen),
		zap.Int32("depth", req.Depth))

	if req.Fen == "" {
		return nil, status.Error(codes.InvalidArgument, "FEN is required")
	}

	depth := int(req.Depth)
	if depth <= 0 {
		depth = 20
	}

	multiPV := int(req.MultiPv)
	if multiPV <= 0 {
		multiPV = 1
	}

	result, err := s.analyzer.AnalyzePosition(ctx, req.Fen, depth, multiPV)
	if err != nil {
		s.logger.Error("Analysis failed", zap.Error(err))
		return nil, status.Errorf(codes.Internal, "analysis failed: %v", err)
	}

	response := &pb.PositionAnalysis{
		Fen:      req.Fen,
		Depth:    int32(result.Depth),
		BestMove: result.BestMove,
		TimeMs:   result.TimeMs,
	}

	if len(result.Evaluations) > 0 {
		eval := result.Evaluations[0]
		response.Evaluation = convertEvaluation(&eval)
		response.Pv = eval.PV
		response.Nodes = eval.Nodes
		response.Nps = eval.NPS
	}

	return response, nil
}

// AnalyzePositionStream streams analysis updates at increasing depths
func (s *Server) AnalyzePositionStream(req *pb.AnalyzePositionRequest, stream pb.AnalysisService_AnalyzePositionStreamServer) error {
	s.logger.Info("AnalyzePositionStream request",
		zap.String("fen", req.Fen),
		zap.Int32("depth", req.Depth))

	if req.Fen == "" {
		return status.Error(codes.InvalidArgument, "FEN is required")
	}

	maxDepth := int(req.Depth)
	if maxDepth <= 0 {
		maxDepth = 20
	}

	multiPV := int(req.MultiPv)
	if multiPV <= 0 {
		multiPV = 1
	}

	// Progressive depth analysis
	depths := []int{8, 12, 16, 20}
	if maxDepth > 20 {
		depths = append(depths, maxDepth)
	}

	for _, depth := range depths {
		if depth > maxDepth {
			break
		}

		select {
		case <-stream.Context().Done():
			return stream.Context().Err()
		default:
		}

		result, err := s.analyzer.AnalyzePosition(stream.Context(), req.Fen, depth, multiPV)
		if err != nil {
			s.logger.Warn("Analysis at depth failed", zap.Int("depth", depth), zap.Error(err))
			continue
		}

		response := &pb.PositionAnalysis{
			Fen:      req.Fen,
			Depth:    int32(result.Depth),
			BestMove: result.BestMove,
			TimeMs:   result.TimeMs,
		}

		if len(result.Evaluations) > 0 {
			eval := result.Evaluations[0]
			response.Evaluation = convertEvaluation(&eval)
			response.Pv = eval.PV
			response.Nodes = eval.Nodes
			response.Nps = eval.NPS
		}

		if err := stream.Send(response); err != nil {
			return err
		}
	}

	return nil
}

// AnalyzeGame analyzes a complete game
func (s *Server) AnalyzeGame(ctx context.Context, req *pb.AnalyzeGameRequest) (*pb.GameAnalysis, error) {
	s.logger.Info("AnalyzeGame request",
		zap.String("gameId", req.GameId),
		zap.Int32("depth", req.Depth))

	if req.Pgn == "" {
		return nil, status.Error(codes.InvalidArgument, "PGN is required")
	}

	depth := int(req.Depth)
	if depth <= 0 {
		depth = 20
	}

	result, err := s.analyzer.AnalyzeGame(ctx, req.GameId, req.Pgn, depth, nil)
	if err != nil {
		s.logger.Error("Game analysis failed", zap.Error(err))
		return nil, status.Errorf(codes.Internal, "game analysis failed: %v", err)
	}

	return convertGameAnalysis(result), nil
}

// AnalyzeGameStream streams game analysis progress
func (s *Server) AnalyzeGameStream(req *pb.AnalyzeGameRequest, stream pb.AnalysisService_AnalyzeGameStreamServer) error {
	s.logger.Info("AnalyzeGameStream request",
		zap.String("gameId", req.GameId),
		zap.Int32("depth", req.Depth))

	if req.Pgn == "" {
		return status.Error(codes.InvalidArgument, "PGN is required")
	}

	depth := int(req.Depth)
	if depth <= 0 {
		depth = 20
	}

	// Parse to get total moves
	positions, err := analyzer.ParsePGN(req.Pgn)
	if err != nil {
		return status.Errorf(codes.InvalidArgument, "failed to parse PGN: %v", err)
	}
	totalMoves := len(positions) - 1

	callback := func(current, total int, move *analyzer.MoveAnalysis) {
		progress := &pb.GameAnalysisProgress{
			GameId:          req.GameId,
			CurrentMove:     int32(current),
			TotalMoves:      int32(total),
			ProgressPercent: float32(current) / float32(total) * 100,
			Status:          "analyzing",
		}

		if move != nil {
			progress.MoveAnalysis = convertMoveAnalysis(move)
		}

		if err := stream.Send(progress); err != nil {
			s.logger.Warn("Failed to send progress", zap.Error(err))
		}
	}

	result, err := s.analyzer.AnalyzeGame(stream.Context(), req.GameId, req.Pgn, depth, callback)
	if err != nil {
		// Send error status
		stream.Send(&pb.GameAnalysisProgress{
			GameId:       req.GameId,
			CurrentMove:  int32(totalMoves),
			TotalMoves:   int32(totalMoves),
			Status:       "error",
			ErrorMessage: err.Error(),
		})
		return status.Errorf(codes.Internal, "game analysis failed: %v", err)
	}

	// Send completed status with final analysis
	finalProgress := &pb.GameAnalysisProgress{
		GameId:          req.GameId,
		CurrentMove:     int32(totalMoves),
		TotalMoves:      int32(totalMoves),
		ProgressPercent: 100,
		Status:          "completed",
	}

	// Include the last move if available
	if len(result.Moves) > 0 {
		lastMove := result.Moves[len(result.Moves)-1]
		finalProgress.MoveAnalysis = convertMoveAnalysis(&lastMove)
	}

	return stream.Send(finalProgress)
}

// GetBestMoves returns multiple best moves for a position
func (s *Server) GetBestMoves(ctx context.Context, req *pb.GetBestMovesRequest) (*pb.BestMovesResponse, error) {
	s.logger.Info("GetBestMoves request",
		zap.String("fen", req.Fen),
		zap.Int32("count", req.Count),
		zap.Int32("depth", req.Depth))

	if req.Fen == "" {
		return nil, status.Error(codes.InvalidArgument, "FEN is required")
	}

	count := int(req.Count)
	if count <= 0 {
		count = 3
	}

	depth := int(req.Depth)
	if depth <= 0 {
		depth = 20
	}

	evals, err := s.analyzer.GetBestMoves(ctx, req.Fen, count, depth)
	if err != nil {
		s.logger.Error("GetBestMoves failed", zap.Error(err))
		return nil, status.Errorf(codes.Internal, "analysis failed: %v", err)
	}

	response := &pb.BestMovesResponse{
		Fen:   req.Fen,
		Depth: int32(depth),
		Moves: make([]*pb.BestMove, 0, len(evals)),
	}

	for i, eval := range evals {
		bestMove := &pb.BestMove{
			Rank:       int32(i + 1),
			MoveUci:    "",
			Evaluation: convertEvaluation(&eval),
			Pv:         eval.PV,
		}
		if len(eval.PV) > 0 {
			bestMove.MoveUci = eval.PV[0]
		}
		response.Moves = append(response.Moves, bestMove)
	}

	return response, nil
}

// HealthCheck returns the service health status
func (s *Server) HealthCheck(ctx context.Context, req *pb.HealthCheckRequest) (*pb.HealthCheckResponse, error) {
	stats := s.pool.GetStats()

	return &pb.HealthCheckResponse{
		Healthy:           stats.Available > 0,
		Status:            "ok",
		AvailableWorkers:  int32(stats.Available),
		TotalWorkers:      int32(stats.Size),
		StockfishVersion:  stats.StockfishVersion,
		UptimeSeconds:     int64(stats.Uptime.Seconds()),
	}, nil
}

// convertEvaluation converts engine evaluation to proto
func convertEvaluation(eval *engine.Evaluation) *pb.Evaluation {
	pbEval := &pb.Evaluation{
		IsMate: eval.IsMate,
	}

	if eval.IsMate && eval.MateIn != nil {
		pbEval.Score = &pb.Evaluation_MateIn{MateIn: int32(*eval.MateIn)}
	} else {
		pbEval.Score = &pb.Evaluation_Centipawns{Centipawns: int32(eval.Centipawns)}
	}

	return pbEval
}

// convertMoveAnalysis converts analyzer move to proto
func convertMoveAnalysis(move *analyzer.MoveAnalysis) *pb.MoveAnalysis {
	return &pb.MoveAnalysis{
		MoveNumber:      int32(move.MoveNumber),
		Ply:             int32(move.Ply),
		Color:           move.Color,
		PlayedMove:      move.PlayedMove,
		PlayedMoveUci:   move.PlayedMoveUCI,
		BestMove:        move.BestMove,
		BestMoveUci:     move.BestMoveUCI,
		FenBefore:       move.FENBefore,
		FenAfter:        move.FENAfter,
		EvalBefore:      convertEvaluation(&move.EvalBefore),
		EvalAfter:       convertEvaluation(&move.EvalAfter), // FIX: Was missing - now sending evaluation after move
		CentipawnLoss:   int32(move.CentipawnLoss),
		Classification:  convertClassification(move.Classification),
		Pv:              move.PV,
		Depth:           int32(move.Depth),
	}
}

// convertClassification converts analyzer classification to proto enum
func convertClassification(class analyzer.MoveClassification) pb.MoveClassification {
	switch class {
	case analyzer.ClassBrilliant:
		return pb.MoveClassification_BRILLIANT
	case analyzer.ClassGreat:
		return pb.MoveClassification_GREAT
	case analyzer.ClassBest:
		return pb.MoveClassification_BEST
	case analyzer.ClassExcellent:
		return pb.MoveClassification_EXCELLENT
	case analyzer.ClassGood:
		return pb.MoveClassification_GOOD
	case analyzer.ClassBook:
		return pb.MoveClassification_BOOK
	case analyzer.ClassNormal:
		return pb.MoveClassification_NORMAL
	case analyzer.ClassInaccuracy:
		return pb.MoveClassification_INACCURACY
	case analyzer.ClassMistake:
		return pb.MoveClassification_MISTAKE
	case analyzer.ClassBlunder:
		return pb.MoveClassification_BLUNDER
	case analyzer.ClassMissedWin:
		return pb.MoveClassification_MISSED_WIN
	default:
		return pb.MoveClassification_CLASSIFICATION_UNKNOWN
	}
}

// convertGameAnalysis converts analyzer result to proto
func convertGameAnalysis(analysis *analyzer.GameAnalysis) *pb.GameAnalysis {
	result := &pb.GameAnalysis{
		GameId:        analysis.GameID,
		TotalTimeMs:   analysis.TotalTimeMs,
		EngineVersion: analysis.EngineVersion,
		WhiteMetrics:  convertGameMetrics(&analysis.WhiteMetrics),
		BlackMetrics:  convertGameMetrics(&analysis.BlackMetrics),
		Moves:         make([]*pb.MoveAnalysis, 0, len(analysis.Moves)),
	}

	for _, move := range analysis.Moves {
		result.Moves = append(result.Moves, convertMoveAnalysis(&move))
	}

	return result
}

// convertGameMetrics converts analyzer metrics to proto
func convertGameMetrics(metrics *analyzer.GameMetrics) *pb.GameMetrics {
	return &pb.GameMetrics{
		Accuracy:          float32(metrics.Accuracy),
		Acpl:              float32(metrics.ACPL),
		Blunders:          int32(metrics.Blunders),
		Mistakes:          int32(metrics.Mistakes),
		Inaccuracies:      int32(metrics.Inaccuracies),
		GoodMoves:         int32(metrics.GoodMoves),
		ExcellentMoves:    int32(metrics.ExcellentMoves),
		BestMoves:         int32(metrics.BestMoves),
		BrilliantMoves:    int32(metrics.BrilliantMoves),
		BookMoves:         int32(metrics.BookMoves),
		TotalMoves:        int32(metrics.TotalMoves),
		PerformanceRating: int32(metrics.PerformanceRating),
	}
}
