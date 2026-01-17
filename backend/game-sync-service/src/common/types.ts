/**
 * Chess platform types
 */
export enum Platform {
    CHESS_COM = 'chess.com',
    LICHESS = 'lichess',
    GOOGLE = 'google',
    MANUAL = 'manual',
}

/**
 * Game result types
 */
export enum GameResult {
    WHITE_WIN = '1-0',
    BLACK_WIN = '0-1',
    DRAW = '1/2-1/2',
    ONGOING = '*',
}

/**
 * Time class categories
 */
export enum TimeClass {
    ULTRABULLET = 'ultrabullet',
    BULLET = 'bullet',
    BLITZ = 'blitz',
    RAPID = 'rapid',
    CLASSICAL = 'classical',
    DAILY = 'daily',
}

/**
 * Sync job status
 */
export enum SyncStatus {
    QUEUED = 'queued',
    RUNNING = 'running',
    COMPLETED = 'completed',
    FAILED = 'failed',
    CANCELLED = 'cancelled',
}

/**
 * Parsed game data from external APIs
 */
export interface ParsedGame {
    externalId: string;
    platform: Platform;
    pgn: string;
    whitePlayer: string;
    blackPlayer: string;
    whiteRating?: number;
    blackRating?: number;
    result: GameResult;
    termination?: string;
    timeControl?: string;
    timeClass?: TimeClass;
    openingEco?: string;
    openingName?: string;
    playedAt: Date;
    eventName?: string;
    site?: string;
}

/**
 * Chess.com API types
 */
export interface ChessComGame {
    url: string;
    pgn: string;
    time_control: string;
    end_time: number;
    rated: boolean;
    tcn?: string;
    uuid?: string;
    initial_setup?: string;
    fen?: string;
    time_class: string;
    rules: string;
    white: ChessComPlayer;
    black: ChessComPlayer;
}

export interface ChessComPlayer {
    rating: number;
    result: string;
    username: string;
    '@id'?: string;
}

export interface ChessComArchivesResponse {
    archives: string[];
}

export interface ChessComGamesResponse {
    games: ChessComGame[];
}

export interface ChessComProfile {
    '@id': string;
    url: string;
    username: string;
    player_id: number;
    title?: string;
    status: string;
    name?: string;
    avatar?: string;
    location?: string;
    country?: string;
    joined: number;
    last_online: number;
    followers?: number;
}

/**
 * Lichess API types
 */
export interface LichessGame {
    id: string;
    rated: boolean;
    variant: string;
    speed: string;
    perf: string;
    createdAt: number;
    lastMoveAt: number;
    status: string;
    players: LichessPlayers;
    winner?: string;
    moves?: string;
    pgn?: string;
    opening?: LichessOpening;
    clock?: LichessClock;
}

export interface LichessPlayers {
    white: LichessPlayerInfo;
    black: LichessPlayerInfo;
}

export interface LichessPlayerInfo {
    user?: LichessUser;
    rating?: number;
    ratingDiff?: number;
    provisional?: boolean;
}

export interface LichessUser {
    name: string;
    id: string;
    title?: string;
}

export interface LichessOpening {
    eco: string;
    name: string;
    ply: number;
}

export interface LichessClock {
    initial: number;
    increment: number;
    totalTime: number;
}

/**
 * Sync job types
 */
export interface SyncJobResult {
    totalGames: number;
    newGames: number;
    skippedGames: number;
    errors: string[];
    duration: number;
}

export interface LinkedAccountInfo {
    id: string;
    userId: string;
    platform: Platform;
    platformUsername: string;
    lastSyncAt?: Date;
    syncEnabled: boolean;
}
