import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, ClientGrpc, Transport } from '@nestjs/microservices';
import { Observable, firstValueFrom, timeout, catchError, throwError, ReplaySubject } from 'rxjs';
import { join } from 'path';
import { Metadata, credentials, status } from '@grpc/grpc-js';

// Import types from proto definitions
export interface AnalyzePositionRequest {
    fen: string;
    depth?: number;
    multiPv?: number;
    timeoutMs?: number;
}

export interface PositionAnalysis {
    fen: string;
    depth: number;
    evaluation: Evaluation;
    bestMove: string;
    pv: string[];
    nodes: number;
    nps: number;
    timeMs: number;
}

export interface Evaluation {
    centipawns?: number;
    mateIn?: number;
    isMate: boolean;
}

export interface AnalyzeGameRequest {
    gameId: string;
    pgn: string;
    depth?: number;
    multiPv?: number;
    includeBookMoves?: boolean;
}

export interface GameAnalysis {
    gameId: string;
    moves: MoveAnalysis[];
    whiteMetrics: GameMetrics;
    blackMetrics: GameMetrics;
    totalTimeMs: number;
    engineVersion: string;
}

export interface GameAnalysisProgress {
    gameId: string;
    currentMove: number;
    totalMoves: number;
    progressPercent: number;
    moveAnalysis?: MoveAnalysis;
    status: string;
    errorMessage?: string;
}

export interface MoveAnalysis {
    moveNumber: number;
    ply: number;
    color: string;
    playedMove: string;
    playedMoveUci: string;
    bestMove: string;
    bestMoveUci: string;
    fenBefore: string;
    fenAfter: string;
    evalBefore?: Evaluation;
    evalAfter?: Evaluation;
    centipawnLoss: number;
    classification: MoveClassification;
    pv: string[];
    depth: number;
}

export enum MoveClassification {
    CLASSIFICATION_UNKNOWN = 0,
    BRILLIANT = 1,
    GREAT = 2,
    BEST = 3,
    EXCELLENT = 4,
    GOOD = 5,
    BOOK = 6,
    NORMAL = 7,
    INACCURACY = 8,
    MISTAKE = 9,
    BLUNDER = 10,
    MISSED_WIN = 11,
}

export interface GameMetrics {
    accuracy: number;
    acpl: number;
    blunders: number;
    mistakes: number;
    inaccuracies: number;
    goodMoves: number;
    excellentMoves: number;
    bestMoves: number;
    brilliantMoves: number;
    bookMoves: number;
    totalMoves: number;
    performanceRating: number;
}

export interface GetBestMovesRequest {
    fen: string;
    count?: number;
    depth?: number;
}

export interface BestMovesResponse {
    fen: string;
    moves: BestMove[];
    depth: number;
}

export interface BestMove {
    rank: number;
    moveUci: string;
    moveSan: string;
    evaluation: Evaluation;
    pv: string[];
}

export interface HealthCheckRequest { }

export interface HealthCheckResponse {
    healthy: boolean;
    status: string;
    availableWorkers: number;
    totalWorkers: number;
    stockfishVersion: string;
    uptimeSeconds: number;
}

// gRPC Service Interface
interface AnalysisServiceClient {
    analyzePosition(request: AnalyzePositionRequest, metadata?: Metadata): Observable<PositionAnalysis>;
    analyzePositionStream(request: AnalyzePositionRequest, metadata?: Metadata): Observable<PositionAnalysis>;
    analyzeGame(request: AnalyzeGameRequest, metadata?: Metadata): Observable<GameAnalysis>;
    analyzeGameStream(request: AnalyzeGameRequest, metadata?: Metadata): Observable<GameAnalysisProgress>;
    getBestMoves(request: GetBestMovesRequest, metadata?: Metadata): Observable<BestMovesResponse>;
    healthCheck(request: HealthCheckRequest, metadata?: Metadata): Observable<HealthCheckResponse>;
}

@Injectable()
export class AnalysisGrpcService implements OnModuleInit {
    private readonly logger = new Logger(AnalysisGrpcService.name);
    private analysisClient: AnalysisServiceClient;
    private grpcClient: ClientGrpc;
    private readonly timeoutMs: number;

    constructor(private readonly configService: ConfigService) {
        this.timeoutMs = this.configService.get<number>('ANALYSIS_TIMEOUT_MS', 60000);
    }

    async onModuleInit() {
        const host = this.configService.get<string>('ANALYSIS_SERVICE_HOST', 'localhost');
        const port = this.configService.get<number>('ANALYSIS_SERVICE_PORT', 50051);

        this.logger.log(`Connecting to Analysis Service at ${host}:${port}`);

        // Create gRPC client dynamically
        const { ClientProxyFactory } = await import('@nestjs/microservices');

        // Proto file is at api-gateway/proto/analysis.proto
        // In development: process.cwd() = api-gateway
        // In production: process.cwd() = api-gateway (or container root)
        const protoPath = join(process.cwd(), 'proto', 'analysis.proto');
        this.logger.log(`Loading proto from: ${protoPath}`);

        this.grpcClient = ClientProxyFactory.create({
            transport: Transport.GRPC,
            options: {
                package: 'analysis',
                protoPath: protoPath,
                url: `${host}:${port}`,
                loader: {
                    keepCase: false,
                    longs: Number,
                    enums: Number,
                    defaults: true,
                    oneofs: true,
                },
            },
        }) as ClientGrpc;

        this.analysisClient = this.grpcClient.getService<AnalysisServiceClient>('AnalysisService');
        this.logger.log('Analysis gRPC client initialized');
    }

    /**
     * Create metadata with authentication context
     */
    private createMetadata(userId?: string, requestId?: string): Metadata {
        const metadata = new Metadata();
        if (userId) {
            metadata.set('x-user-id', userId);
        }
        if (requestId) {
            metadata.set('x-request-id', requestId);
        }
        metadata.set('x-client', 'api-gateway');
        return metadata;
    }

    /**
     * Analyze a single FEN position
     */
    async analyzePosition(
        request: AnalyzePositionRequest,
        userId?: string,
    ): Promise<PositionAnalysis> {
        this.logger.debug(`Analyzing position: ${request.fen.substring(0, 30)}...`);

        const metadata = this.createMetadata(userId);

        try {
            const result = await firstValueFrom(
                this.analysisClient.analyzePosition(request, metadata).pipe(
                    timeout(this.timeoutMs),
                    catchError((err) => this.handleGrpcError(err, 'analyzePosition')),
                ),
            );
            return result;
        } catch (error) {
            this.logger.error(`Analysis failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Analyze position with streaming depth updates
     */
    analyzePositionStream(
        request: AnalyzePositionRequest,
        userId?: string,
    ): Observable<PositionAnalysis> {
        this.logger.debug(`Starting streaming analysis: ${request.fen.substring(0, 30)}...`);

        const metadata = this.createMetadata(userId);
        const subject = new ReplaySubject<PositionAnalysis>();

        this.analysisClient.analyzePositionStream(request, metadata).pipe(
            timeout(this.timeoutMs),
            catchError((err) => this.handleGrpcError(err, 'analyzePositionStream')),
        ).subscribe({
            next: (value) => subject.next(value),
            error: (err) => subject.error(err),
            complete: () => subject.complete(),
        });

        return subject.asObservable();
    }

    /**
     * Analyze a full game
     */
    async analyzeGame(
        request: AnalyzeGameRequest,
        userId?: string,
    ): Promise<GameAnalysis> {
        this.logger.log(`Analyzing game: ${request.gameId}`);

        const metadata = this.createMetadata(userId);

        try {
            const result = await firstValueFrom(
                this.analysisClient.analyzeGame(request, metadata).pipe(
                    timeout(this.timeoutMs * 5), // Game analysis takes longer
                    catchError((err) => this.handleGrpcError(err, 'analyzeGame')),
                ),
            );
            return result;
        } catch (error) {
            this.logger.error(`Game analysis failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Analyze game with streaming progress updates
     */
    analyzeGameStream(
        request: AnalyzeGameRequest,
        userId?: string,
    ): Observable<GameAnalysisProgress> {
        this.logger.log(`Starting streaming game analysis: ${request.gameId}`);

        const metadata = this.createMetadata(userId);
        const subject = new ReplaySubject<GameAnalysisProgress>();

        this.analysisClient.analyzeGameStream(request, metadata).pipe(
            timeout(this.timeoutMs * 10), // Full game can take a while
            catchError((err) => this.handleGrpcError(err, 'analyzeGameStream')),
        ).subscribe({
            next: (value) => subject.next(value),
            error: (err) => subject.error(err),
            complete: () => subject.complete(),
        });

        return subject.asObservable();
    }

    /**
     * Get best moves for a position (MultiPV)
     */
    async getBestMoves(
        request: GetBestMovesRequest,
        userId?: string,
    ): Promise<BestMovesResponse> {
        this.logger.debug(`Getting best moves for: ${request.fen.substring(0, 30)}...`);

        const metadata = this.createMetadata(userId);

        try {
            const result = await firstValueFrom(
                this.analysisClient.getBestMoves(request, metadata).pipe(
                    timeout(this.timeoutMs),
                    catchError((err) => this.handleGrpcError(err, 'getBestMoves')),
                ),
            );
            return result;
        } catch (error) {
            this.logger.error(`Get best moves failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Health check for the analysis service
     */
    async healthCheck(): Promise<HealthCheckResponse> {
        try {
            const result = await firstValueFrom(
                this.analysisClient.healthCheck({}).pipe(
                    timeout(5000),
                    catchError((err) => this.handleGrpcError(err, 'healthCheck')),
                ),
            );
            return result;
        } catch (error) {
            this.logger.warn(`Health check failed: ${error.message}`);
            return {
                healthy: false,
                status: 'unreachable',
                availableWorkers: 0,
                totalWorkers: 0,
                stockfishVersion: 'unknown',
                uptimeSeconds: 0,
            };
        }
    }

    /**
     * Handle gRPC errors and convert to appropriate exceptions
     */
    private handleGrpcError(error: any, method: string): Observable<never> {
        const grpcStatus = error.code || status.UNKNOWN;
        const message = error.details || error.message || 'Unknown gRPC error';

        this.logger.error(`gRPC error in ${method}: [${grpcStatus}] ${message}`);

        // Map gRPC status codes to HTTP-like exceptions
        let errorMessage: string;
        let errorType: string;

        switch (grpcStatus) {
            case status.INVALID_ARGUMENT:
                errorType = 'BadRequest';
                errorMessage = `Invalid request: ${message}`;
                break;
            case status.NOT_FOUND:
                errorType = 'NotFound';
                errorMessage = `Resource not found: ${message}`;
                break;
            case status.UNAVAILABLE:
                errorType = 'ServiceUnavailable';
                errorMessage = 'Analysis service is temporarily unavailable';
                break;
            case status.DEADLINE_EXCEEDED:
                errorType = 'Timeout';
                errorMessage = 'Analysis request timed out';
                break;
            case status.RESOURCE_EXHAUSTED:
                errorType = 'TooManyRequests';
                errorMessage = 'Too many analysis requests, please try again later';
                break;
            case status.INTERNAL:
                errorType = 'InternalError';
                errorMessage = 'Internal analysis error';
                break;
            default:
                errorType = 'GrpcError';
                errorMessage = message;
        }

        return throwError(() => ({
            type: errorType,
            message: errorMessage,
            grpcCode: grpcStatus,
            method,
        }));
    }
}
