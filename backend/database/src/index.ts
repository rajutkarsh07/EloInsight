/**
 * EloInsight Database Module
 * 
 * This module exports the Prisma client and all generated types
 * for use throughout the application.
 * 
 * @example
 * ```typescript
 * import { prisma, User, Game, Analysis } from '@eloinsight/database';
 * 
 * // Query users
 * const users = await prisma.user.findMany();
 * 
 * // Type-safe user
 * const user: User = users[0];
 * ```
 */

// Re-export Prisma Client singleton
export { prisma, db, DatabaseClient } from './client';
export { default } from './client';

// Re-export all generated types from Prisma
export {
    // Core types
    type User,
    type UserProfile,
    type UserSettings,
    type LinkedAccount,

    // Game types
    type Game,
    type Move,

    // Analysis types
    type Analysis,
    type PositionAnalysis,
    type MoveEvaluation,

    // Statistics types
    type UserStatistics,
    type OpeningStatistics,

    // Job types
    type SyncJob,
    type AnalysisJob,

    // Enums
    Platform,
    Theme,
    PlayerColor,
    GameResult,
    TimeClass,
    AnalysisStatus,
    MoveClassification,
    PeriodType,
    JobStatus,

    // Prisma utilities
    Prisma,
    PrismaClient,
} from '@prisma/client';

// Re-export commonly used Prisma types
export type {
    PrismaPromise
} from '@prisma/client';
