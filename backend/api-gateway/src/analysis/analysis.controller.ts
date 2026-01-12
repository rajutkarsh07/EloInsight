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
import { PrismaService } from '../prisma/prisma.service';
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

    constructor(
        private readonly analysisService: AnalysisGrpcService,
        private readonly prisma: PrismaService,
    ) { }

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
            // Update game status to PROCESSING
            await this.prisma.game.update({
                where: { id: gameId },
                data: {
                    analysisStatus: 'PROCESSING',
                    analysisRequestedAt: new Date(),
                },
            });

            // Run analysis via gRPC
            const result = await this.analysisService.analyzeGame(
                {
                    gameId,
                    pgn: dto.pgn,
                    depth: dto.depth,
                    includeBookMoves: dto.includeBookMoves,
                },
                req.user?.id,
            );

            // Save analysis results to database
            await this.saveAnalysisToDatabase(gameId, result, dto.depth || 20);

            // Update game status to COMPLETED
            await this.prisma.game.update({
                where: { id: gameId },
                data: { analysisStatus: 'COMPLETED' },
            });

            this.logger.log(`Analysis completed and saved for game ${gameId}`);

            return this.mapGameAnalysis(result);
        } catch (error) {
            // Update game status to FAILED
            await this.prisma.game.update({
                where: { id: gameId },
                data: { analysisStatus: 'FAILED' },
            }).catch(() => {}); // Ignore if game doesn't exist

            this.handleGrpcError(error);
        }
    }

    private async saveAnalysisToDatabase(gameId: string, result: any, depth: number) {
        const whiteMetrics = result.whiteMetrics || {};
        const blackMetrics = result.blackMetrics || {};

        // Create analysis record
        const analysis = await this.prisma.analysis.create({
            data: {
                gameId,
                accuracyWhite: whiteMetrics.accuracy || 0,
                accuracyBlack: blackMetrics.accuracy || 0,
                acplWhite: whiteMetrics.acpl || 0,
                acplBlack: blackMetrics.acpl || 0,
                blundersWhite: whiteMetrics.blunders || 0,
                blundersBlack: blackMetrics.blunders || 0,
                mistakesWhite: whiteMetrics.mistakes || 0,
                mistakesBlack: blackMetrics.mistakes || 0,
                inaccuraciesWhite: whiteMetrics.inaccuracies || 0,
                inaccuraciesBlack: blackMetrics.inaccuracies || 0,
                brilliantMovesWhite: whiteMetrics.brilliantMoves || 0,
                brilliantMovesBlack: blackMetrics.brilliantMoves || 0,
                goodMovesWhite: whiteMetrics.goodMoves || 0,
                goodMovesBlack: blackMetrics.goodMoves || 0,
                bookMovesWhite: whiteMetrics.bookMoves || 0,
                bookMovesBlack: blackMetrics.bookMoves || 0,
                performanceRatingWhite: whiteMetrics.performanceRating || null,
                performanceRatingBlack: blackMetrics.performanceRating || null,
                analysisDepth: depth,
                engineVersion: result.engineVersion || 'Stockfish 16',
                totalPositions: result.moves?.length || 0,
            },
        });

        // Save position analyses (move-by-move)
        if (result.moves && result.moves.length > 0) {
            const positionData = result.moves.map((move: any) => ({
                analysisId: analysis.id,
                moveNumber: move.moveNumber,
                halfMove: move.ply,
                fen: move.fenAfter || move.fenBefore,
                evaluation: move.evalAfter?.centipawns ?? null,
                mateIn: move.evalAfter?.mateIn ?? null,
                bestMove: move.bestMove,
                playedMove: move.playedMove,
                isBlunder: move.classification === 10,
                isMistake: move.classification === 9,
                isInaccuracy: move.classification === 8,
                isBrilliant: move.classification === 1,
                isGood: move.classification === 5,
                isBook: move.classification === 6,
                isBest: move.classification === 3,
                classification: this.mapClassificationToEnum(move.classification),
                centipawnLoss: move.centipawnLoss ?? null,
                pv: move.pv || [],
                depth: move.depth,
            }));

            await this.prisma.positionAnalysis.createMany({
                data: positionData,
            });
        }

        return analysis;
    }

    private mapClassificationToEnum(classification: number): string {
        const classMap: Record<number, string> = {
            1: 'BRILLIANT',
            2: 'GREAT',
            3: 'BEST',
            4: 'EXCELLENT',
            5: 'GOOD',
            6: 'BOOK',
            7: 'NORMAL',
            8: 'INACCURACY',
            9: 'MISTAKE',
            10: 'BLUNDER',
            11: 'MISSED_WIN',
        };
        return classMap[classification] || 'NORMAL';
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
    async getGameAnalysis(@Param('gameId') gameId: string, @Request() req: any) {
        // Fetch game with analysis from database
        const game = await this.prisma.game.findFirst({
            where: {
                id: gameId,
                userId: req.user.id,
            },
            include: {
                analysis: {
                    include: {
                        positionAnalyses: {
                            orderBy: { halfMove: 'asc' },
                        },
                    },
                },
            },
        });

        if (!game) {
            throw new HttpException('Game not found', HttpStatus.NOT_FOUND);
        }

        if (!game.analysis) {
            return {
                gameId,
                status: 'not_analyzed',
                message: 'Use POST /analysis/game/:gameId to request analysis',
            };
        }

        const analysis = game.analysis;

        return {
            gameId,
            status: 'completed',
            game: {
                id: game.id,
                platform: game.platform === 'CHESS_COM' ? 'chess.com' : 'lichess',
                whitePlayer: game.whitePlayer,
                blackPlayer: game.blackPlayer,
                result: this.mapGameResultToString(game.result),
                timeControl: game.timeControl,
                playedAt: game.playedAt.toISOString(),
                openingName: game.openingName,
                pgn: game.pgn,
            },
            whiteMetrics: {
                accuracy: Number(analysis.accuracyWhite) || 0,
                acpl: Number(analysis.acplWhite) || 0,
                blunders: analysis.blundersWhite,
                mistakes: analysis.mistakesWhite,
                inaccuracies: analysis.inaccuraciesWhite,
                brilliantMoves: analysis.brilliantMovesWhite,
                goodMoves: analysis.goodMovesWhite,
                bookMoves: analysis.bookMovesWhite,
                performanceRating: analysis.performanceRatingWhite,
            },
            blackMetrics: {
                accuracy: Number(analysis.accuracyBlack) || 0,
                acpl: Number(analysis.acplBlack) || 0,
                blunders: analysis.blundersBlack,
                mistakes: analysis.mistakesBlack,
                inaccuracies: analysis.inaccuraciesBlack,
                brilliantMoves: analysis.brilliantMovesBlack,
                goodMoves: analysis.goodMovesBlack,
                bookMoves: analysis.bookMovesBlack,
                performanceRating: analysis.performanceRatingBlack,
            },
            moves: analysis.positionAnalyses.map(pos => ({
                moveNumber: pos.moveNumber,
                halfMove: pos.halfMove,
                fen: pos.fen,
                evaluation: pos.evaluation,
                mateIn: pos.mateIn,
                bestMove: pos.bestMove,
                playedMove: pos.playedMove,
                classification: pos.classification.toLowerCase(),
                centipawnLoss: pos.centipawnLoss,
                isBlunder: pos.isBlunder,
                isMistake: pos.isMistake,
                isInaccuracy: pos.isInaccuracy,
                isBrilliant: pos.isBrilliant,
                isGood: pos.isGood,
                isBest: pos.isBest,
                pv: pos.pv,
                depth: pos.depth,
            })),
            analysisDepth: analysis.analysisDepth,
            engineVersion: analysis.engineVersion,
            analyzedAt: analysis.analyzedAt.toISOString(),
        };
    }

    private mapGameResultToString(result: string): string {
        const resultMap: Record<string, string> = {
            'WHITE_WIN': '1-0',
            'BLACK_WIN': '0-1',
            'DRAW': '1/2-1/2',
            'ONGOING': '*',
        };
        return resultMap[result] || result;
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
