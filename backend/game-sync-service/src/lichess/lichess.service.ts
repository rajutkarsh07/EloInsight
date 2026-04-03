import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
    LichessGame,
    ParsedGame,
    Platform,
} from '../common/types';
import {
    parseLichessResult,
    lichessSpeedToTimeClass,
    parseTimeControlFromPgn,
    lichessSpeedToTimeControl,
} from '../common/utils';
import { RateLimiterService } from '../common/rate-limiter.service';
import { RetryService } from '../common/retry.service';

@Injectable()
export class LichessService {
    private readonly logger = new Logger(LichessService.name);
    private readonly baseUrl: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly rateLimiter: RateLimiterService,
        private readonly retryService: RetryService,
    ) {
        this.baseUrl = this.configService.get<string>('LICHESS_BASE_URL', 'https://lichess.org/api');
    }

    /**
     * Check if a Lichess user exists
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
     * Get user profile from Lichess
     */
    async getProfile(username: string): Promise<any> {
        return this.rateLimiter.schedule('lichess', async () => {
            return this.retryService.execute(
                async () => {
                    const url = `${this.baseUrl}/user/${username}`;
                    const response = await firstValueFrom(
                        this.httpService.get(url, {
                            headers: { Accept: 'application/json' },
                        }),
                    );
                    return response.data;
                },
                `Lichess getProfile(${username})`,
            );
        });
    }

    /**
     * Fetch games for a user since a specific date
     * Uses NDJSON streaming format
     */
    async fetchGamesSince(
        username: string,
        since: Date,
        maxGames: number = 500,
        onProgress?: (fetched: number) => void,
    ): Promise<ParsedGame[]> {
        this.logger.log(`Fetching Lichess games for ${username} since ${since.toISOString()}`);

        return this.rateLimiter.schedule('lichess', async () => {
            return this.retryService.execute(
                async () => {
                    const url = `${this.baseUrl}/games/user/${username}`;

                    const response = await firstValueFrom(
                        this.httpService.get<string>(url, {
                            headers: {
                                Accept: 'application/x-ndjson',
                            },
                            params: {
                                since: since.getTime(),
                                max: maxGames,
                                pgnInJson: true,
                                clocks: true,
                                evals: false,
                                opening: true,
                            },
                            responseType: 'text',
                            timeout: 120000, // 2 minutes for large exports
                        }),
                    );

                    const games = this.parseNdjsonResponse(response.data, username);

                    this.logger.log(`Fetched ${games.length} games from Lichess for ${username}`);
                    onProgress?.(games.length);

                    return games;
                },
                `Lichess fetchGamesSince(${username})`,
                { maxRetries: 2 }, // Reduce retries for large exports
            );
        });
    }

    /**
     * Parse NDJSON (Newline Delimited JSON) response
     */
    private parseNdjsonResponse(data: string, username: string): ParsedGame[] {
        const games: ParsedGame[] = [];
        const lines = data.trim().split('\n').filter(line => line.trim());

        for (const line of lines) {
            try {
                const game: LichessGame = JSON.parse(line);

                // Skip non-standard variants
                if (game.variant !== 'standard') continue;

                const parsedGame = this.parseGame(game, username);
                if (parsedGame) {
                    games.push(parsedGame);
                }
            } catch (error) {
                this.logger.warn(`Failed to parse Lichess game line: ${error}`);
            }
        }

        return games;
    }

    /**
     * Parse a Lichess game into our standard format
     */
    private parseGame(game: LichessGame, username: string): ParsedGame | null {
        try {
            const whitePlayer = game.players.white.user?.name || 'Anonymous';
            const blackPlayer = game.players.black.user?.name || 'Anonymous';

            // Generate PGN if not present
            const pgn = game.pgn || this.generatePgn(game);

            // Get time control with fallbacks: clock data -> PGN -> speed estimate
            let timeControl = this.formatTimeControl(game.clock);
            if (timeControl === '-') {
                // Try to get from PGN
                const pgnTimeControl = parseTimeControlFromPgn(pgn);
                if (pgnTimeControl && pgnTimeControl !== '-') {
                    timeControl = pgnTimeControl;
                } else {
                    // Fall back to speed-based estimate
                    timeControl = lichessSpeedToTimeControl(game.speed);
                }
            }

            // Get termination - use status with proper mapping
            const termination = this.mapTermination(game.status);

            return {
                externalId: game.id,
                platform: Platform.LICHESS,
                pgn,
                whitePlayer,
                blackPlayer,
                whiteRating: game.players.white.rating,
                blackRating: game.players.black.rating,
                result: parseLichessResult(game.status, game.winner),
                termination,
                timeControl,
                timeClass: lichessSpeedToTimeClass(game.speed),
                openingEco: game.opening?.eco,
                openingName: game.opening?.name,
                playedAt: new Date(game.createdAt),
                eventName: game.rated ? 'Rated Game' : 'Casual Game',
                site: 'Lichess.org',
            };
        } catch (error) {
            this.logger.warn(`Failed to parse Lichess game ${game.id}: ${error}`);
            return null;
        }
    }

    /**
     * Generate basic PGN from Lichess game data
     */
    private generatePgn(game: LichessGame): string {
        const termination = this.mapTermination(game.status);
        const timeControl = this.formatTimeControl(game.clock);
        
        const headers = [
            `[Event "${game.rated ? 'Rated' : 'Casual'} ${game.perf} game"]`,
            `[Site "https://lichess.org/${game.id}"]`,
            `[Date "${new Date(game.createdAt).toISOString().split('T')[0].replace(/-/g, '.')}"]`,
            `[White "${game.players.white.user?.name || 'Anonymous'}"]`,
            `[Black "${game.players.black.user?.name || 'Anonymous'}"]`,
            `[Result "${this.getResultString(game.status, game.winner)}"]`,
            game.players.white.rating ? `[WhiteElo "${game.players.white.rating}"]` : '',
            game.players.black.rating ? `[BlackElo "${game.players.black.rating}"]` : '',
            game.opening?.eco ? `[ECO "${game.opening.eco}"]` : '',
            game.opening?.name ? `[Opening "${game.opening.name}"]` : '',
            timeControl !== '-' ? `[TimeControl "${timeControl}"]` : '',
            termination ? `[Termination "${termination}"]` : '',
        ].filter(Boolean).join('\n');

        const moves = game.moves || '';
        const result = this.getResultString(game.status, game.winner);

        return `${headers}\n\n${moves} ${result}`;
    }

    private getResultString(status: string, winner?: string): string {
        if (winner === 'white') return '1-0';
        if (winner === 'black') return '0-1';
        if (status === 'draw' || status === 'stalemate') return '1/2-1/2';
        return '*';
    }

    private formatTimeControl(clock?: { initial: number; increment: number }): string {
        if (!clock || clock.initial == null) return '-';
        const minutes = Math.floor(clock.initial / 60);
        const increment = clock.increment ?? 0;
        return `${minutes}+${increment}`;
    }

    private mapTermination(status: string): string {
        if (!status) return 'unknown';
        
        const terminationMap: Record<string, string> = {
            mate: 'Checkmate',
            resign: 'Resignation',
            timeout: 'Time forfeit',
            outoftime: 'Time forfeit',
            stalemate: 'Stalemate',
            draw: 'Draw agreed',
            cheat: 'Rules infraction',
            noStart: 'Abandoned',
            unknownFinish: 'Unknown',
            variantEnd: 'Variant end',
            aborted: 'Aborted',
            started: 'In progress',
            created: 'Not started',
        };
        
        const mapped = terminationMap[status.toLowerCase()];
        if (mapped) return mapped;
        
        // Capitalize first letter for unmapped statuses
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
}
