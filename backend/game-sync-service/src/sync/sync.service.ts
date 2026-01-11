import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ChessComService } from '../chess-com/chess-com.service';
import { LichessService } from '../lichess/lichess.service';
import {
    ParsedGame,
    Platform,
    SyncJobResult,
    LinkedAccountInfo,
    GameResult,
    TimeClass,
} from '../common/types';
import { getSyncDateRange } from '../common/utils';

@Injectable()
export class SyncService {
    private readonly logger = new Logger(SyncService.name);
    private readonly defaultLookbackMonths: number;
    private readonly maxGamesPerFetch: number;
    private isRunning = false;

    constructor(
        private readonly prisma: PrismaService,
        private readonly chessComService: ChessComService,
        private readonly lichessService: LichessService,
        private readonly configService: ConfigService,
    ) {
        this.defaultLookbackMonths = this.configService.get<number>('SYNC_DEFAULT_LOOKBACK_MONTHS', 6);
        this.maxGamesPerFetch = this.configService.get<number>('SYNC_MAX_GAMES_PER_FETCH', 500);
    }

    /**
     * Scheduled sync - runs every 6 hours by default
     * Syncs all users with auto-sync enabled
     */
    @Cron(process.env.SYNC_CRON || CronExpression.EVERY_6_HOURS)
    async scheduledSync(): Promise<void> {
        if (this.isRunning) {
            this.logger.warn('Scheduled sync skipped - previous sync still running');
            return;
        }

        this.isRunning = true;
        this.logger.log('🔄 Starting scheduled sync for all users...');

        try {
            // Get all linked accounts with sync enabled
            const accounts = await this.prisma.linkedAccount.findMany({
                where: {
                    syncEnabled: true,
                    isActive: true,
                },
                include: {
                    user: {
                        select: { id: true, username: true },
                    },
                },
            });

            this.logger.log(`Found ${accounts.length} accounts to sync`);

            for (const account of accounts) {
                try {
                    await this.syncAccount({
                        id: account.id,
                        userId: account.userId,
                        platform: account.platform as Platform,
                        platformUsername: account.platformUsername,
                        lastSyncAt: account.lastSyncAt || undefined,
                        syncEnabled: account.syncEnabled,
                    });
                } catch (error) {
                    this.logger.error(`Failed to sync account ${account.id}: ${error}`);
                }
            }

            this.logger.log('✅ Scheduled sync completed');
        } catch (error) {
            this.logger.error(`Scheduled sync failed: ${error}`);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Sync a specific user's account
     */
    async syncAccount(account: LinkedAccountInfo): Promise<SyncJobResult> {
        const startTime = Date.now();
        const result: SyncJobResult = {
            totalGames: 0,
            newGames: 0,
            skippedGames: 0,
            errors: [],
            duration: 0,
        };

        this.logger.log(`Syncing ${account.platform} account: ${account.platformUsername}`);

        // Create sync job record
        const syncJob = await this.prisma.syncJob.create({
            data: {
                userId: account.userId,
                linkedAccountId: account.id,
                status: 'RUNNING',
                startedAt: new Date(),
            },
        });

        try {
            // Calculate date range for sync
            const { since } = getSyncDateRange(account.lastSyncAt, this.defaultLookbackMonths);

            // Fetch games based on platform
            let games: ParsedGame[] = [];

            if (account.platform === Platform.CHESS_COM) {
                games = await this.chessComService.fetchGamesSince(
                    account.platformUsername,
                    since,
                );
            } else if (account.platform === Platform.LICHESS) {
                games = await this.lichessService.fetchGamesSince(
                    account.platformUsername,
                    since,
                    this.maxGamesPerFetch,
                );
            }

            result.totalGames = games.length;

            // Process and store games with deduplication
            for (const game of games) {
                try {
                    const saved = await this.saveGameWithDeduplication(account.userId, game);
                    if (saved) {
                        result.newGames++;
                    } else {
                        result.skippedGames++;
                    }
                } catch (error) {
                    result.errors.push(`Game ${game.externalId}: ${error}`);
                    result.skippedGames++;
                }
            }

            // Update sync job as completed
            await this.prisma.syncJob.update({
                where: { id: syncJob.id },
                data: {
                    status: 'COMPLETED',
                    completedAt: new Date(),
                    totalGames: result.totalGames,
                    newGames: result.newGames,
                    skippedGames: result.skippedGames,
                    processedGames: result.totalGames,
                },
            });

            // Update last sync time on linked account
            await this.prisma.linkedAccount.update({
                where: { id: account.id },
                data: { lastSyncAt: new Date() },
            });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            result.errors.push(errorMessage);

            // Update sync job as failed
            await this.prisma.syncJob.update({
                where: { id: syncJob.id },
                data: {
                    status: 'FAILED',
                    completedAt: new Date(),
                    errorMessage,
                },
            });

            this.logger.error(`Sync failed for ${account.platformUsername}: ${errorMessage}`);
        }

        result.duration = Date.now() - startTime;

        this.logger.log(
            `Sync complete: ${result.newGames} new, ${result.skippedGames} skipped, ` +
            `${result.errors.length} errors, ${result.duration}ms`,
        );

        return result;
    }

    /**
     * Save a game with deduplication
     * Returns true if game was saved (new), false if skipped (duplicate)
     */
    private async saveGameWithDeduplication(
        userId: string,
        game: ParsedGame,
    ): Promise<boolean> {
        // Check if game already exists
        const existing = await this.prisma.game.findFirst({
            where: {
                platform: this.mapPlatformToDbEnum(game.platform),
                externalId: game.externalId,
            },
        });

        if (existing) {
            this.logger.debug(`Skipping duplicate game: ${game.externalId}`);
            return false;
        }

        // Determine user's color
        const userColor = await this.determineUserColor(userId, game);

        // Create the game
        await this.prisma.game.create({
            data: {
                userId,
                platform: this.mapPlatformToDbEnum(game.platform),
                externalId: game.externalId,
                pgn: game.pgn,
                whitePlayer: game.whitePlayer,
                blackPlayer: game.blackPlayer,
                whiteRating: game.whiteRating,
                blackRating: game.blackRating,
                userColor: userColor as any,
                result: this.mapResultToDbEnum(game.result),
                termination: game.termination,
                timeControl: game.timeControl,
                timeClass: game.timeClass ? this.mapTimeClassToDbEnum(game.timeClass) : null,
                openingEco: game.openingEco,
                openingName: game.openingName,
                playedAt: game.playedAt,
                eventName: game.eventName,
                site: game.site,
                analysisStatus: 'PENDING',
                syncedAt: new Date(),
            },
        });

        return true;
    }

    /**
     * Determine which color the user played
     */
    private async determineUserColor(
        userId: string,
        game: ParsedGame,
    ): Promise<'WHITE' | 'BLACK' | null> {
        // Get user's linked accounts
        const accounts = await this.prisma.linkedAccount.findMany({
            where: { userId, platform: this.mapPlatformToDbEnum(game.platform) },
            select: { platformUsername: true },
        });

        const usernames = accounts.map((a: { platformUsername: string }) => a.platformUsername.toLowerCase());

        if (usernames.includes(game.whitePlayer.toLowerCase())) {
            return 'WHITE';
        }
        if (usernames.includes(game.blackPlayer.toLowerCase())) {
            return 'BLACK';
        }
        return null;
    }

    /**
     * Sync a specific user by user ID
     */
    async syncUser(userId: string): Promise<SyncJobResult[]> {
        const accounts = await this.prisma.linkedAccount.findMany({
            where: {
                userId,
                syncEnabled: true,
                isActive: true,
            },
        });

        const results: SyncJobResult[] = [];

        for (const account of accounts) {
            const result = await this.syncAccount({
                id: account.id,
                userId: account.userId,
                platform: account.platform as Platform,
                platformUsername: account.platformUsername,
                lastSyncAt: account.lastSyncAt || undefined,
                syncEnabled: account.syncEnabled,
            });
            results.push(result);
        }

        return results;
    }

    /**
     * Get sync status for a user
     */
    async getSyncStatus(userId: string) {
        const jobs = await this.prisma.syncJob.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
                linkedAccount: {
                    select: {
                        platform: true,
                        platformUsername: true,
                    },
                },
            },
        });

        return jobs.map((job: any) => ({
            id: job.id,
            platform: job.linkedAccount.platform,
            username: job.linkedAccount.platformUsername,
            status: job.status,
            totalGames: job.totalGames,
            newGames: job.newGames,
            skippedGames: job.skippedGames,
            error: job.errorMessage,
            startedAt: job.startedAt,
            completedAt: job.completedAt,
        }));
    }

    // Helper methods to map between local enums and Prisma enums
    private mapPlatformToDbEnum(platform: Platform): 'CHESS_COM' | 'LICHESS' | 'MANUAL' {
        const map: Record<Platform, 'CHESS_COM' | 'LICHESS' | 'MANUAL'> = {
            [Platform.CHESS_COM]: 'CHESS_COM',
            [Platform.LICHESS]: 'LICHESS',
            [Platform.MANUAL]: 'MANUAL',
        };
        return map[platform];
    }

    private mapResultToDbEnum(result: GameResult): 'WHITE_WIN' | 'BLACK_WIN' | 'DRAW' | 'ONGOING' {
        const map: Record<GameResult, 'WHITE_WIN' | 'BLACK_WIN' | 'DRAW' | 'ONGOING'> = {
            [GameResult.WHITE_WIN]: 'WHITE_WIN',
            [GameResult.BLACK_WIN]: 'BLACK_WIN',
            [GameResult.DRAW]: 'DRAW',
            [GameResult.ONGOING]: 'ONGOING',
        };
        return map[result];
    }

    private mapTimeClassToDbEnum(timeClass: TimeClass): 'ULTRABULLET' | 'BULLET' | 'BLITZ' | 'RAPID' | 'CLASSICAL' | 'DAILY' {
        const map: Record<TimeClass, 'ULTRABULLET' | 'BULLET' | 'BLITZ' | 'RAPID' | 'CLASSICAL' | 'DAILY'> = {
            [TimeClass.ULTRABULLET]: 'ULTRABULLET',
            [TimeClass.BULLET]: 'BULLET',
            [TimeClass.BLITZ]: 'BLITZ',
            [TimeClass.RAPID]: 'RAPID',
            [TimeClass.CLASSICAL]: 'CLASSICAL',
            [TimeClass.DAILY]: 'DAILY',
        };
        return map[timeClass];
    }
}
