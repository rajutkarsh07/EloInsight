import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
    ChessComArchivesResponse,
    ChessComGamesResponse,
    ChessComGame,
    ChessComProfile,
    ParsedGame,
    Platform,
} from '../common/types';
import {
    parseChessComResult,
    parseTimeClass,
    parseEcoFromPgn,
    parseTerminationFromPgn,
    extractGameId,
    getArchiveUrlsInRange,
} from '../common/utils';
import { RateLimiterService } from '../common/rate-limiter.service';
import { RetryService } from '../common/retry.service';

@Injectable()
export class ChessComService {
    private readonly logger = new Logger(ChessComService.name);
    private readonly baseUrl: string;
    private readonly userAgent: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly rateLimiter: RateLimiterService,
        private readonly retryService: RetryService,
    ) {
        this.baseUrl = this.configService.get<string>('CHESS_COM_BASE_URL', 'https://api.chess.com/pub');
        this.userAgent = 'EloInsight/1.0 (https://eloinsight.dev)';
    }

    /**
     * Check if a Chess.com user exists
     */
    async userExists(username: string): Promise<boolean> {
        try {
            await this.getProfile(username);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get user profile from Chess.com
     */
    async getProfile(username: string): Promise<ChessComProfile> {
        return this.rateLimiter.schedule('chess.com', async () => {
            return this.retryService.execute(
                async () => {
                    const url = `${this.baseUrl}/player/${username.toLowerCase()}`;
                    const response = await firstValueFrom(
                        this.httpService.get<ChessComProfile>(url, {
                            headers: { 'User-Agent': this.userAgent },
                        }),
                    );
                    return response.data;
                },
                `Chess.com getProfile(${username})`,
            );
        });
    }

    /**
     * Get all game archives for a user
     */
    async getArchives(username: string): Promise<string[]> {
        return this.rateLimiter.schedule('chess.com', async () => {
            return this.retryService.execute(
                async () => {
                    const url = `${this.baseUrl}/player/${username.toLowerCase()}/games/archives`;
                    const response = await firstValueFrom(
                        this.httpService.get<ChessComArchivesResponse>(url, {
                            headers: { 'User-Agent': this.userAgent },
                        }),
                    );
                    return response.data.archives || [];
                },
                `Chess.com getArchives(${username})`,
            );
        });
    }

    /**
     * Get games from a specific monthly archive
     */
    async getMonthlyGames(archiveUrl: string): Promise<ChessComGame[]> {
        return this.rateLimiter.schedule('chess.com', async () => {
            return this.retryService.execute(
                async () => {
                    const response = await firstValueFrom(
                        this.httpService.get<ChessComGamesResponse>(archiveUrl, {
                            headers: { 'User-Agent': this.userAgent },
                        }),
                    );
                    return response.data.games || [];
                },
                `Chess.com getMonthlyGames(${archiveUrl})`,
            );
        });
    }

    /**
     * Fetch all games for a user since a specific date
     */
    async fetchGamesSince(
        username: string,
        since: Date,
        onProgress?: (fetched: number, total: number) => void,
    ): Promise<ParsedGame[]> {
        this.logger.log(`Fetching Chess.com games for ${username} since ${since.toISOString()}`);

        // Get all archives
        const archives = await this.getArchives(username);
        if (!archives.length) {
            this.logger.log(`No archives found for ${username}`);
            return [];
        }

        // Filter archives within date range
        const relevantArchives = getArchiveUrlsInRange(archives, since, new Date());
        this.logger.log(`Found ${relevantArchives.length} relevant archives`);

        const allGames: ParsedGame[] = [];
        let processed = 0;

        for (const archiveUrl of relevantArchives) {
            try {
                const games = await this.getMonthlyGames(archiveUrl);

                for (const game of games) {
                    const playedAt = new Date(game.end_time * 1000);

                    // Skip games before our since date
                    if (playedAt < since) continue;

                    // Skip non-standard chess variants
                    if (game.rules !== 'chess') continue;

                    const parsedGame = this.parseGame(game, username);
                    if (parsedGame) {
                        allGames.push(parsedGame);
                    }
                }

                processed++;
                onProgress?.(processed, relevantArchives.length);

            } catch (error) {
                this.logger.error(`Error fetching archive ${archiveUrl}: ${error}`);
            }
        }

        this.logger.log(`Fetched ${allGames.length} games from Chess.com for ${username}`);
        return allGames;
    }

    /**
     * Parse a Chess.com game into our standard format
     */
    private parseGame(game: ChessComGame, username: string): ParsedGame | null {
        try {
            const { eco, name: openingName } = parseEcoFromPgn(game.pgn || '');
            const termination = parseTerminationFromPgn(game.pgn || '');
            const externalId = extractGameId(game.url, 'chess.com');

            // Determine user's color
            const isWhite = game.white.username.toLowerCase() === username.toLowerCase();

            return {
                externalId,
                platform: Platform.CHESS_COM,
                pgn: game.pgn || '',
                whitePlayer: game.white.username,
                blackPlayer: game.black.username,
                whiteRating: game.white.rating,
                blackRating: game.black.rating,
                result: parseChessComResult(game.white.result, game.black.result),
                termination,
                timeControl: game.time_control,
                timeClass: parseTimeClass(game.time_control, 'chess.com'),
                openingEco: eco,
                openingName,
                playedAt: new Date(game.end_time * 1000),
                eventName: game.rated ? 'Rated Game' : 'Casual Game',
                site: 'Chess.com',
            };
        } catch (error) {
            this.logger.warn(`Failed to parse Chess.com game: ${error}`);
            return null;
        }
    }
}
