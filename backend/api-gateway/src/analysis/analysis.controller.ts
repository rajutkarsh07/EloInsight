import {
    Controller,
    Get,
    Post,
    Param,
    Body,
    UseGuards,
    Query,
    Sse,
    HttpException,
    HttpStatus,
    Logger,
    Request,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
    ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalysisGrpcService, MoveClassification } from './analysis-grpc.service';
import {
    AnalyzePositionDto,
    AnalyzeGameDto,
    GetBestMovesDto,
    PositionAnalysisResponseDto,
    GameAnalysisResponseDto,
    BestMovesResponseDto,
    HealthCheckResponseDto,
} from './dto/analysis.dto';
import { Observable, map, catchError, of } from 'rxjs';

@ApiTags('analysis')
@Controller('analysis')
export class AnalysisController {
    private readonly logger = new Logger(AnalysisController.name);

    constructor(private readonly analysisService: AnalysisGrpcService) { }

    // === POSITION ANALYSIS ===

    @Post('position')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Analyze a single chess position' })
    @ApiResponse({ status: 200, description: 'Position analyzed successfully', type: PositionAnalysisResponseDto })
    @ApiResponse({ status: 400, description: 'Invalid FEN string' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 503, description: 'Analysis service unavailable' })
    async analyzePosition(
        @Body() dto: AnalyzePositionDto,
        @Request() req: any,
    ): Promise<PositionAnalysisResponseDto> {
        try {
            const result = await this.analysisService.analyzePosition(
                {
                    fen: dto.fen,
                    depth: dto.depth,
                    multiPv: dto.multiPv,
                    timeoutMs: dto.timeoutMs,
                },
                req.user?.id,
            );

            return this.mapPositionAnalysis(result);
        } catch (error) {
            this.handleGrpcError(error);
        }
    }

    @Post('position/stream')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @Sse()
    @ApiOperation({ summary: 'Analyze a position with streaming depth updates' })
    @ApiResponse({ status: 200, description: 'Streaming analysis updates' })
    analyzePositionStream(
        @Body() dto: AnalyzePositionDto,
        @Request() req: any,
    ): Observable<MessageEvent> {
        return this.analysisService.analyzePositionStream(
            {
                fen: dto.fen,
                depth: dto.depth,
                multiPv: dto.multiPv,
            },
            req.user?.id,
        ).pipe(
            map((analysis) => ({
                data: this.mapPositionAnalysis(analysis),
            } as MessageEvent)),
            catchError((error) => {
                this.logger.error(`Stream error: ${error.message}`);
                return of({
                    data: { error: error.message, type: error.type || 'error' },
                } as MessageEvent);
            }),
        );
    }

    // === GAME ANALYSIS ===

    @Post('game/:gameId')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Analyze a full chess game' })
    @ApiParam({ name: 'gameId', description: 'Game identifier' })
    @ApiResponse({ status: 200, description: 'Game analyzed successfully', type: GameAnalysisResponseDto })
    @ApiResponse({ status: 400, description: 'Invalid PGN' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 503, description: 'Analysis service unavailable' })
    async analyzeGame(
        @Param('gameId') gameId: string,
        @Body() dto: AnalyzeGameDto,
        @Request() req: any,
    ): Promise<GameAnalysisResponseDto> {
        try {
            const result = await this.analysisService.analyzeGame(
                {
                    gameId,
                    pgn: dto.pgn,
                    depth: dto.depth,
                    includeBookMoves: dto.includeBookMoves,
                },
                req.user?.id,
            );

            return this.mapGameAnalysis(result);
        } catch (error) {
            this.handleGrpcError(error);
        }
    }

    @Post('game/:gameId/stream')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @Sse()
    @ApiOperation({ summary: 'Analyze a game with streaming progress updates' })
    @ApiParam({ name: 'gameId', description: 'Game identifier' })
    @ApiResponse({ status: 200, description: 'Streaming analysis progress' })
    analyzeGameStream(
        @Param('gameId') gameId: string,
        @Body() dto: AnalyzeGameDto,
        @Request() req: any,
    ): Observable<MessageEvent> {
        return this.analysisService.analyzeGameStream(
            {
                gameId,
                pgn: dto.pgn,
                depth: dto.depth,
                includeBookMoves: dto.includeBookMoves,
            },
            req.user?.id,
        ).pipe(
            map((progress) => ({
                data: {
                    gameId: progress.gameId,
                    currentMove: progress.currentMove,
                    totalMoves: progress.totalMoves,
                    progressPercent: progress.progressPercent,
                    status: progress.status,
                    errorMessage: progress.errorMessage,
                    moveAnalysis: progress.moveAnalysis
                        ? this.mapMoveAnalysis(progress.moveAnalysis)
                        : undefined,
                },
            } as MessageEvent)),
            catchError((error) => {
                this.logger.error(`Stream error: ${error.message}`);
                return of({
                    data: { error: error.message, type: error.type || 'error' },
                } as MessageEvent);
            }),
        );
    }

    @Get('game/:gameId')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get stored game analysis' })
    @ApiParam({ name: 'gameId', description: 'Game identifier' })
    @ApiResponse({ status: 200, description: 'Analysis retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Analysis not found' })
    async getGameAnalysis(@Param('gameId') gameId: string) {
        // TODO: Fetch from database
        // For now, return a stub indicating analysis should be requested
        return {
            gameId,
            status: 'not_analyzed',
            message: 'Use POST /analysis/game/:gameId to request analysis',
        };
    }

    // === BEST MOVES ===

    @Post('best-moves')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get best moves for a position (MultiPV)' })
    @ApiResponse({ status: 200, description: 'Best moves retrieved', type: BestMovesResponseDto })
    @ApiResponse({ status: 400, description: 'Invalid FEN string' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getBestMoves(
        @Body() dto: GetBestMovesDto,
        @Request() req: any,
    ): Promise<BestMovesResponseDto> {
        try {
            const result = await this.analysisService.getBestMoves(
                {
                    fen: dto.fen,
                    count: dto.count,
                    depth: dto.depth,
                },
                req.user?.id,
            );

            return {
                fen: result.fen,
                depth: result.depth,
                moves: result.moves.map((m) => ({
                    rank: m.rank,
                    moveUci: m.moveUci,
                    moveSan: m.moveSan,
                    evaluation: this.mapEvaluation(m.evaluation),
                    pv: m.pv,
                })),
            };
        } catch (error) {
            this.handleGrpcError(error);
        }
    }

    // === HEALTH CHECK ===

    @Get('health')
    @ApiOperation({ summary: 'Check analysis service health' })
    @ApiResponse({ status: 200, description: 'Health status', type: HealthCheckResponseDto })
    async healthCheck(): Promise<HealthCheckResponseDto> {
        const health = await this.analysisService.healthCheck();
        return health;
    }

    // === HELPER METHODS ===

    private mapPositionAnalysis(result: any): PositionAnalysisResponseDto {
        return {
            fen: result.fen,
            depth: result.depth,
            evaluation: this.mapEvaluation(result.evaluation),
            bestMove: result.bestMove,
            pv: result.pv || [],
            nodes: Number(result.nodes) || 0,
            nps: Number(result.nps) || 0,
            timeMs: Number(result.timeMs) || 0,
        };
    }

    private mapGameAnalysis(result: any): GameAnalysisResponseDto {
        return {
            gameId: result.gameId,
            moves: (result.moves || []).map((m: any) => this.mapMoveAnalysis(m)),
            whiteMetrics: this.mapMetrics(result.whiteMetrics),
            blackMetrics: this.mapMetrics(result.blackMetrics),
            totalTimeMs: Number(result.totalTimeMs) || 0,
            engineVersion: result.engineVersion || 'unknown',
        };
    }

    private mapMoveAnalysis(move: any) {
        return {
            moveNumber: move.moveNumber,
            ply: move.ply,
            color: move.color,
            playedMove: move.playedMove,
            playedMoveUci: move.playedMoveUci,
            bestMove: move.bestMove,
            bestMoveUci: move.bestMoveUci,
            fenBefore: move.fenBefore,
            fenAfter: move.fenAfter,
            evalBefore: move.evalBefore ? this.mapEvaluation(move.evalBefore) : undefined,
            evalAfter: move.evalAfter ? this.mapEvaluation(move.evalAfter) : undefined,
            centipawnLoss: move.centipawnLoss,
            classification: this.mapClassification(move.classification),
            pv: move.pv || [],
            depth: move.depth,
        };
    }

    private mapMetrics(metrics: any) {
        if (!metrics) {
            return {
                accuracy: 0,
                acpl: 0,
                blunders: 0,
                mistakes: 0,
                inaccuracies: 0,
                goodMoves: 0,
                excellentMoves: 0,
                bestMoves: 0,
                brilliantMoves: 0,
                bookMoves: 0,
                totalMoves: 0,
                performanceRating: 0,
            };
        }
        return {
            accuracy: metrics.accuracy || 0,
            acpl: metrics.acpl || 0,
            blunders: metrics.blunders || 0,
            mistakes: metrics.mistakes || 0,
            inaccuracies: metrics.inaccuracies || 0,
            goodMoves: metrics.goodMoves || 0,
            excellentMoves: metrics.excellentMoves || 0,
            bestMoves: metrics.bestMoves || 0,
            brilliantMoves: metrics.brilliantMoves || 0,
            bookMoves: metrics.bookMoves || 0,
            totalMoves: metrics.totalMoves || 0,
            performanceRating: metrics.performanceRating || 0,
        };
    }

    private mapEvaluation(eval_: any) {
        if (!eval_) {
            return { isMate: false };
        }
        return {
            centipawns: eval_.centipawns,
            mateIn: eval_.mateIn,
            isMate: eval_.isMate || false,
        };
    }

    private mapClassification(classification: MoveClassification | number): string {
        const classMap: Record<number, string> = {
            0: 'unknown',
            1: 'brilliant',
            2: 'great',
            3: 'best',
            4: 'excellent',
            5: 'good',
            6: 'book',
            7: 'normal',
            8: 'inaccuracy',
            9: 'mistake',
            10: 'blunder',
            11: 'missed_win',
        };
        return classMap[classification] || 'unknown';
    }

    private handleGrpcError(error: any): never {
        this.logger.error(`Controller error: ${JSON.stringify(error)}`);

        const statusMap: Record<string, HttpStatus> = {
            BadRequest: HttpStatus.BAD_REQUEST,
            NotFound: HttpStatus.NOT_FOUND,
            ServiceUnavailable: HttpStatus.SERVICE_UNAVAILABLE,
            Timeout: HttpStatus.GATEWAY_TIMEOUT,
            TooManyRequests: HttpStatus.TOO_MANY_REQUESTS,
            InternalError: HttpStatus.INTERNAL_SERVER_ERROR,
        };

        const status = statusMap[error.type] || HttpStatus.INTERNAL_SERVER_ERROR;
        throw new HttpException(
            {
                statusCode: status,
                message: error.message || 'Analysis service error',
                error: error.type || 'Error',
            },
            status,
        );
    }
}
