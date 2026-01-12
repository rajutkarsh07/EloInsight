import { apiClient } from './apiClient';

export interface GameMetrics {
    accuracy: number;
    acpl: number;
    blunders: number;
    mistakes: number;
    inaccuracies: number;
    brilliantMoves: number;
    goodMoves: number;
    bookMoves: number;
    performanceRating: number | null;
}

export interface MoveAnalysis {
    moveNumber: number;
    halfMove: number;
    fen: string;
    evaluation: number | null;
    mateIn: number | null;
    bestMove: string;
    playedMove: string;
    classification: string;
    centipawnLoss: number | null;
    isBlunder: boolean;
    isMistake: boolean;
    isInaccuracy: boolean;
    isBrilliant: boolean;
    isGood: boolean;
    isBest: boolean;
    pv: string[];
    depth: number | null;
}

export interface GameInfo {
    id: string;
    platform: string;
    whitePlayer: string;
    blackPlayer: string;
    result: string;
    timeControl: string;
    playedAt: string;
    openingName?: string;
    pgn: string;
}

export interface FullAnalysis {
    gameId: string;
    status: string;
    game: GameInfo;
    whiteMetrics: GameMetrics;
    blackMetrics: GameMetrics;
    moves: MoveAnalysis[];
    analysisDepth: number;
    engineVersion: string;
    analyzedAt: string;
}

export interface AnalyzedGame {
    id: string;
    platform: string;
    whitePlayer: string;
    blackPlayer: string;
    result: string;
    timeControl: string;
    playedAt: string;
    openingName?: string;
    analysisStatus: string;
    analysis: {
        accuracyWhite: number;
        accuracyBlack: number;
        acplWhite: number;
        acplBlack: number;
        blundersWhite: number;
        blundersBlack: number;
        mistakesWhite: number;
        mistakesBlack: number;
        inaccuraciesWhite: number;
        inaccuraciesBlack: number;
        performanceRatingWhite: number | null;
        performanceRatingBlack: number | null;
        analyzedAt: string;
    } | null;
}

export interface AnalyzedGamesResponse {
    data: AnalyzedGame[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface CreateGameRequest {
    platform: 'chess.com' | 'lichess';
    externalId: string;
    pgn: string;
    whitePlayer: string;
    blackPlayer: string;
    whiteRating?: number;
    blackRating?: number;
    result: string;
    timeControl?: string;
    playedAt: string;
    openingName?: string;
}

export interface CreateGameResponse {
    id: string;
    message: string;
    alreadyExists: boolean;
}

export interface AnalyzeGameRequest {
    pgn: string;
    depth?: number;
    includeBookMoves?: boolean;
}

/**
 * Analysis Service - API calls for game analysis features
 */
export const analysisService = {
    /**
     * Get list of analyzed games
     */
    async getAnalyzedGames(page = 1, limit = 20): Promise<AnalyzedGamesResponse> {
        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('limit', limit.toString());
        return apiClient.get<AnalyzedGamesResponse>(`/games/analyzed?${params.toString()}`);
    },

    /**
     * Get full analysis for a specific game
     */
    async getGameAnalysis(gameId: string): Promise<FullAnalysis> {
        return apiClient.get<FullAnalysis>(`/analysis/game/${gameId}`);
    },

    /**
     * Save a game to the database
     */
    async saveGame(game: CreateGameRequest): Promise<CreateGameResponse> {
        return apiClient.post<CreateGameResponse>('/games', game);
    },

    /**
     * Trigger analysis for a game
     */
    async analyzeGame(gameId: string, request: AnalyzeGameRequest): Promise<FullAnalysis> {
        return apiClient.post<FullAnalysis>(`/analysis/game/${gameId}`, request);
    },

    /**
     * Full flow: save game then analyze it
     */
    async saveAndAnalyzeGame(
        gameData: CreateGameRequest,
        analysisOptions: Omit<AnalyzeGameRequest, 'pgn'>
    ): Promise<{ gameId: string; analysis: FullAnalysis }> {
        // Step 1: Save game
        const saveResult = await this.saveGame(gameData);
        
        // Step 2: Analyze
        const analysis = await this.analyzeGame(saveResult.id, {
            pgn: gameData.pgn,
            ...analysisOptions,
        });

        return {
            gameId: saveResult.id,
            analysis,
        };
    },

    /**
     * Check analysis service health
     */
    async checkHealth(): Promise<{ status: string; message: string }> {
        return apiClient.get<{ status: string; message: string }>('/analysis/health');
    },
};

export default analysisService;

