// API Types
export interface User {
    id: string;
    email: string;
    username: string;
    chessComUsername?: string;
    lichessUsername?: string;
    // OAuth verified status
    lichessVerified?: boolean;
    chessComVerified?: boolean;
    // Avatar URL from Lichess/Google
    avatarUrl?: string;
    createdAt: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    username: string;
    password: string;
}

export interface AuthResponse {
    user: User;
    tokens: {
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
    };
}

// Game Types
export interface Game {
    id: string;
    platform: 'chess.com' | 'lichess';
    externalId: string;
    whitePlayer: string;
    blackPlayer: string;
    whiteRating: number;
    blackRating: number;
    result: '1-0' | '0-1' | '1/2-1/2';
    timeControl: string;
    openingName: string;
    playedAt: string;
    analysisStatus: 'pending' | 'queued' | 'processing' | 'completed' | 'failed';
    accuracy?: {
        white: number;
        black: number;
    };
}

export interface GameListResponse {
    data: Game[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

// Analysis Types
export interface PositionAnalysis {
    moveNumber: number;
    fen: string;
    evaluation: number;
    bestMove: string;
    playedMove: string;
    classification: 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
    isBlunder: boolean;
    isMistake: boolean;
    isInaccuracy: boolean;
}

export interface Analysis {
    id: string;
    gameId: string;
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
    performanceRatingWhite: number;
    performanceRatingBlack: number;
    positions: PositionAnalysis[];
    analyzedAt: string;
}

// Statistics Types
export interface UserStatistics {
    totalGames: number;
    winRate: number;
    averageAccuracy: number;
    averageACPL: number;
    favoriteOpening: string;
    ratingProgression: Array<{
        date: string;
        rating: number;
    }>;
    timeControlDistribution: {
        [key: string]: number;
    };
    recentPerformance: {
        last10Games: {
            wins: number;
            losses: number;
            draws: number;
        };
        averageAccuracy: number;
    };
}

// API Response Types
export interface ApiError {
    error: {
        code: string;
        message: string;
        details?: Array<{
            field: string;
            message: string;
        }>;
    };
    meta: {
        timestamp: string;
        requestId: string;
    };
}
