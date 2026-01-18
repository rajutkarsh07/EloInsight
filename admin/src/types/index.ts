// Enums matching Prisma schema
export type Platform = 'CHESS_COM' | 'LICHESS' | 'GOOGLE' | 'MANUAL';
export type Theme = 'LIGHT' | 'DARK' | 'AUTO';
export type PlayerColor = 'WHITE' | 'BLACK';
export type GameResult = 'WHITE_WIN' | 'BLACK_WIN' | 'DRAW' | 'ONGOING';
export type TimeClass = 'ULTRABULLET' | 'BULLET' | 'BLITZ' | 'RAPID' | 'CLASSICAL' | 'DAILY';
export type AnalysisStatus = 'PENDING' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type MoveClassification = 'BRILLIANT' | 'GREAT' | 'BEST' | 'EXCELLENT' | 'GOOD' | 'BOOK' | 'NORMAL' | 'INACCURACY' | 'MISTAKE' | 'BLUNDER' | 'MISSED_WIN';
export type PeriodType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'ALL_TIME';
export type JobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

// Entity types
export interface User {
  id: string;
  email: string;
  username: string;
  emailVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  profile?: UserProfile;
  settings?: UserSettings;
  linkedAccounts?: LinkedAccount[];
  _count?: {
    games: number;
    linkedAccounts: number;
    analysisJobs: number;
    syncJobs: number;
  };
}

export interface UserProfile {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  country: string | null;
  timezone: string | null;
  dateOfBirth: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  userId: string;
  theme: Theme;
  boardStyle: string;
  pieceSet: string;
  autoSync: boolean;
  syncFrequency: string;
  emailNotifications: boolean;
  analysisDepth: number;
  showCoordinates: boolean;
  highlightLastMove: boolean;
  autoPromoteQueen: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LinkedAccount {
  id: string;
  userId: string;
  platform: Platform;
  platformUsername: string;
  platformUserId: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  linkedAt: string;
  lastSyncAt: string | null;
  syncEnabled: boolean;
}

export interface Game {
  id: string;
  userId: string;
  platform: Platform;
  externalId: string | null;
  pgn: string;
  fenFinal: string | null;
  whitePlayer: string;
  blackPlayer: string;
  whiteRating: number | null;
  blackRating: number | null;
  userColor: PlayerColor | null;
  result: GameResult;
  termination: string | null;
  timeControl: string | null;
  timeClass: TimeClass | null;
  openingEco: string | null;
  openingName: string | null;
  openingVariation: string | null;
  eventName: string | null;
  site: string | null;
  round: string | null;
  playedAt: string;
  analysisStatus: AnalysisStatus;
  analysisRequestedAt: string | null;
  syncedAt: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
  analysis?: Analysis;
  _count?: {
    moves: number;
    analysisJobs: number;
  };
}

export interface Analysis {
  id: string;
  gameId: string;
  accuracyWhite: number | null;
  accuracyBlack: number | null;
  acplWhite: number | null;
  acplBlack: number | null;
  blundersWhite: number;
  blundersBlack: number;
  mistakesWhite: number;
  mistakesBlack: number;
  inaccuraciesWhite: number;
  inaccuraciesBlack: number;
  brilliantMovesWhite: number;
  brilliantMovesBlack: number;
  goodMovesWhite: number;
  goodMovesBlack: number;
  bookMovesWhite: number;
  bookMovesBlack: number;
  performanceRatingWhite: number | null;
  performanceRatingBlack: number | null;
  analysisDepth: number;
  engineVersion: string | null;
  totalPositions: number | null;
  analyzedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SyncJob {
  id: string;
  userId: string;
  linkedAccountId: string;
  status: JobStatus;
  totalGames: number | null;
  processedGames: number;
  newGames: number;
  skippedGames: number;
  errorMessage: string | null;
  retryCount: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user?: User;
  linkedAccount?: LinkedAccount;
}

export interface AnalysisJob {
  id: string;
  gameId: string;
  userId: string;
  status: JobStatus;
  depth: number;
  priority: number;
  totalPositions: number | null;
  analyzedPositions: number;
  currentMove: number | null;
  errorMessage: string | null;
  retryCount: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user?: User;
  game?: Game;
}

export interface UserStatistics {
  id: string;
  userId: string;
  periodType: PeriodType;
  periodStart: string;
  periodEnd: string;
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number | null;
  averageAccuracy: number | null;
  averageAcpl: number | null;
  totalBlunders: number;
  totalMistakes: number;
  totalInaccuracies: number;
  peakRating: number | null;
  currentRating: number | null;
  calculatedAt: string;
}

export interface OpeningStatistics {
  id: string;
  userId: string;
  openingEco: string;
  openingName: string;
  gamesAsWhite: number;
  gamesAsBlack: number;
  totalGames: number;
  overallWinRate: number | null;
  averageAccuracy: number | null;
  lastPlayedAt: string | null;
}

// API Response types
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface DashboardStats {
  totalUsers: number;
  totalGames: number;
  totalAnalyses: number;
  pendingJobs: number;
  activeUsers: number;
  gamesThisWeek: number;
  analysesThisWeek: number;
}

