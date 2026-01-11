import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, Max, IsBoolean, Matches } from 'class-validator';
import { Type } from 'class-transformer';

// FEN validation regex (simplified)
const FEN_REGEX = /^([rnbqkpRNBQKP1-8]+\/){7}[rnbqkpRNBQKP1-8]+\s[wb]\s[KQkq-]+\s[a-h1-8-]+\s\d+\s\d+$/;

export class AnalyzePositionDto {
    @ApiProperty({
        description: 'FEN string of the chess position',
        example: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
    })
    @IsString()
    @Matches(FEN_REGEX, { message: 'Invalid FEN string format' })
    fen: string;

    @ApiPropertyOptional({
        description: 'Analysis depth (10-30)',
        example: 20,
        default: 20,
    })
    @IsOptional()
    @IsInt()
    @Min(10)
    @Max(30)
    @Type(() => Number)
    depth?: number = 20;

    @ApiPropertyOptional({
        description: 'Number of principal variations (1-5)',
        example: 1,
        default: 1,
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(5)
    @Type(() => Number)
    multiPv?: number = 1;

    @ApiPropertyOptional({
        description: 'Timeout in milliseconds',
        example: 30000,
    })
    @IsOptional()
    @IsInt()
    @Min(1000)
    @Max(120000)
    @Type(() => Number)
    timeoutMs?: number;
}

export class AnalyzeGameDto {
    @ApiProperty({
        description: 'PGN of the game to analyze',
        example: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 1-0',
    })
    @IsString()
    pgn: string;

    @ApiPropertyOptional({
        description: 'Analysis depth per move (10-25)',
        example: 20,
        default: 20,
    })
    @IsOptional()
    @IsInt()
    @Min(10)
    @Max(25)
    @Type(() => Number)
    depth?: number = 20;

    @ApiPropertyOptional({
        description: 'Whether to analyze opening book moves',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    includeBookMoves?: boolean = false;
}

export class GetBestMovesDto {
    @ApiProperty({
        description: 'FEN string of the chess position',
        example: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
    })
    @IsString()
    @Matches(FEN_REGEX, { message: 'Invalid FEN string format' })
    fen: string;

    @ApiPropertyOptional({
        description: 'Number of best moves to return (1-10)',
        example: 3,
        default: 3,
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(10)
    @Type(() => Number)
    count?: number = 3;

    @ApiPropertyOptional({
        description: 'Analysis depth (10-25)',
        example: 20,
        default: 20,
    })
    @IsOptional()
    @IsInt()
    @Min(10)
    @Max(25)
    @Type(() => Number)
    depth?: number = 20;
}

// Response DTOs

export class EvaluationDto {
    @ApiPropertyOptional({ description: 'Score in centipawns' })
    centipawns?: number;

    @ApiPropertyOptional({ description: 'Mate in N moves' })
    mateIn?: number;

    @ApiProperty({ description: 'Whether this is a mate score' })
    isMate: boolean;
}

export class PositionAnalysisResponseDto {
    @ApiProperty({ description: 'FEN of analyzed position' })
    fen: string;

    @ApiProperty({ description: 'Depth reached' })
    depth: number;

    @ApiProperty({ description: 'Position evaluation', type: EvaluationDto })
    evaluation: EvaluationDto;

    @ApiProperty({ description: 'Best move in UCI format' })
    bestMove: string;

    @ApiProperty({ description: 'Principal variation', type: [String] })
    pv: string[];

    @ApiProperty({ description: 'Nodes searched' })
    nodes: number;

    @ApiProperty({ description: 'Nodes per second' })
    nps: number;

    @ApiProperty({ description: 'Time taken in milliseconds' })
    timeMs: number;
}

export class GameMetricsDto {
    @ApiProperty({ description: 'Accuracy percentage (0-100)' })
    accuracy: number;

    @ApiProperty({ description: 'Average centipawn loss' })
    acpl: number;

    @ApiProperty({ description: 'Number of blunders' })
    blunders: number;

    @ApiProperty({ description: 'Number of mistakes' })
    mistakes: number;

    @ApiProperty({ description: 'Number of inaccuracies' })
    inaccuracies: number;

    @ApiProperty({ description: 'Number of good moves' })
    goodMoves: number;

    @ApiProperty({ description: 'Number of excellent moves' })
    excellentMoves: number;

    @ApiProperty({ description: 'Number of best moves' })
    bestMoves: number;

    @ApiProperty({ description: 'Number of brilliant moves' })
    brilliantMoves: number;

    @ApiProperty({ description: 'Number of book moves' })
    bookMoves: number;

    @ApiProperty({ description: 'Total moves analyzed' })
    totalMoves: number;

    @ApiProperty({ description: 'Estimated performance rating' })
    performanceRating: number;
}

export class MoveAnalysisDto {
    @ApiProperty({ description: 'Move number (1-indexed)' })
    moveNumber: number;

    @ApiProperty({ description: 'Ply (half-move, 0-indexed)' })
    ply: number;

    @ApiProperty({ description: '"white" or "black"' })
    color: string;

    @ApiProperty({ description: 'Move played in SAN format' })
    playedMove: string;

    @ApiProperty({ description: 'Move played in UCI format' })
    playedMoveUci: string;

    @ApiProperty({ description: 'Best move in SAN format' })
    bestMove: string;

    @ApiProperty({ description: 'Best move in UCI format' })
    bestMoveUci: string;

    @ApiProperty({ description: 'FEN before the move' })
    fenBefore: string;

    @ApiProperty({ description: 'FEN after the move' })
    fenAfter: string;

    @ApiPropertyOptional({ description: 'Evaluation before the move', type: EvaluationDto })
    evalBefore?: EvaluationDto;

    @ApiPropertyOptional({ description: 'Evaluation after the move', type: EvaluationDto })
    evalAfter?: EvaluationDto;

    @ApiProperty({ description: 'Centipawn loss for this move' })
    centipawnLoss: number;

    @ApiProperty({
        description: 'Move classification',
        enum: ['unknown', 'brilliant', 'great', 'best', 'excellent', 'good', 'book', 'normal', 'inaccuracy', 'mistake', 'blunder', 'missed_win']
    })
    classification: string;

    @ApiProperty({ description: 'Principal variation', type: [String] })
    pv: string[];

    @ApiProperty({ description: 'Depth reached' })
    depth: number;
}

export class GameAnalysisResponseDto {
    @ApiProperty({ description: 'Game identifier' })
    gameId: string;

    @ApiProperty({ description: 'Move-by-move analysis', type: [MoveAnalysisDto] })
    moves: MoveAnalysisDto[];

    @ApiProperty({ description: 'White metrics', type: GameMetricsDto })
    whiteMetrics: GameMetricsDto;

    @ApiProperty({ description: 'Black metrics', type: GameMetricsDto })
    blackMetrics: GameMetricsDto;

    @ApiProperty({ description: 'Total analysis time in milliseconds' })
    totalTimeMs: number;

    @ApiProperty({ description: 'Stockfish version used' })
    engineVersion: string;
}

export class BestMoveDto {
    @ApiProperty({ description: 'Rank (1 = best)' })
    rank: number;

    @ApiProperty({ description: 'Move in UCI format' })
    moveUci: string;

    @ApiPropertyOptional({ description: 'Move in SAN format' })
    moveSan?: string;

    @ApiProperty({ description: 'Evaluation after this move', type: EvaluationDto })
    evaluation: EvaluationDto;

    @ApiProperty({ description: 'Principal variation', type: [String] })
    pv: string[];
}

export class BestMovesResponseDto {
    @ApiProperty({ description: 'FEN of analyzed position' })
    fen: string;

    @ApiProperty({ description: 'Best moves', type: [BestMoveDto] })
    moves: BestMoveDto[];

    @ApiProperty({ description: 'Depth reached' })
    depth: number;
}

export class HealthCheckResponseDto {
    @ApiProperty({ description: 'Whether service is healthy' })
    healthy: boolean;

    @ApiProperty({ description: 'Status message' })
    status: string;

    @ApiProperty({ description: 'Available worker count' })
    availableWorkers: number;

    @ApiProperty({ description: 'Total worker count' })
    totalWorkers: number;

    @ApiProperty({ description: 'Stockfish version' })
    stockfishVersion: string;

    @ApiProperty({ description: 'Service uptime in seconds' })
    uptimeSeconds: number;
}
