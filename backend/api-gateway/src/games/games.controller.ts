import { Controller, Get, Post, Param, Body, UseGuards, Request, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiBody, ApiProperty } from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { firstValueFrom } from 'rxjs';
import { IsString, IsOptional, IsNumber, IsIn } from 'class-validator';

// DTO for creating a game
class CreateGameDto {
    @ApiProperty({ enum: ['chess.com', 'lichess'] })
    @IsString()
    @IsIn(['chess.com', 'lichess'])
    platform: 'chess.com' | 'lichess';

    @ApiProperty()
    @IsString()
    externalId: string;

    @ApiProperty()
    @IsString()
    pgn: string;

    @ApiProperty()
    @IsString()
    whitePlayer: string;

    @ApiProperty()
    @IsString()
    blackPlayer: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsNumber()
    whiteRating?: number;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsNumber()
    blackRating?: number;

    @ApiProperty()
    @IsString()
    result: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    timeControl?: string;

    @ApiProperty()
    @IsString()
    playedAt: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    openingName?: string;
}

@ApiTags('games')
@Controller('games')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class GamesController {
    private readonly logger = new Logger(GamesController.name);

    constructor(
        private authService: AuthService,
        private httpService: HttpService,
        private prisma: PrismaService
    ) { }

    @Get()
    @ApiOperation({ summary: 'Get user games' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'platform', required: false, enum: ['chess.com', 'lichess'] })
    @ApiQuery({ name: 'analyzed', required: false, enum: ['yes', 'no'] })
    @ApiResponse({ status: 200, description: 'Games retrieved successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getGames(
        @Request() req,
        @Query('page') page = 1,
        @Query('limit') limit = 20,
        @Query('platform') platform?: string,
        @Query('analyzed') analyzed?: string,
    ) {
        const user = await this.authService.getUserById(req.user.id);
        const userId = req.user.id;
        const gamePromises: Promise<any[]>[] = [];

        // Fetch Chess.com games
        if (user?.chessComUsername && (!platform || platform === 'chess.com')) {
            gamePromises.push(this.fetchChessComGames(user.chessComUsername, limit));
        }

        // Fetch Lichess games
        if (user?.lichessUsername && (!platform || platform === 'lichess')) {
            gamePromises.push(this.fetchLichessGames(user.lichessUsername, limit));
        }

        const results = await Promise.all(gamePromises);
        let allGames = results.flat().sort((a, b) =>
            new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime()
        );

        // Fetch stored games from database to get analysis status
        const storedGames = await this.prisma.game.findMany({
            where: { userId },
            select: {
                id: true,
                externalId: true,
                platform: true,
                analysisStatus: true,
            },
        });

        // Extract game ID from URL or return as-is if it's already just an ID
        // This handles the mismatch between:
        // - sync-service which stores just the ID (e.g., "123456789" or "AbCdEfGh")
        // - api-gateway which stores full URLs (e.g., "https://www.chess.com/game/live/123456789")
        const extractGameId = (id: string | null | undefined): string => {
            if (!id) return '';
            
            const normalized = id.toLowerCase().trim();
            
            // Chess.com URL: extract numeric game ID
            const chessComMatch = normalized.match(/chess\.com\/game\/(?:live|daily)\/(\d+)/);
            if (chessComMatch) return chessComMatch[1];
            
            // Lichess URL: extract 8-character game ID
            const lichessMatch = normalized.match(/lichess\.org\/(\w+)/);
            if (lichessMatch) return lichessMatch[1];
            
            // If no URL pattern matched, it's likely already just the ID
            // Return as-is but lowercase for case-insensitive matching
            return normalized;
        };

        // Log stored games for debugging
        this.logger.debug(`Found ${storedGames.length} stored games for user ${userId}`);
        storedGames.forEach(g => {
            if (g.analysisStatus === 'COMPLETED') {
                this.logger.debug(`Stored game: externalId="${g.externalId}", extracted="${extractGameId(g.externalId)}"`);
            }
        });

        // Create maps for game lookup
        // Primary map: extracted game ID -> stored game info
        const storedGamesMap = new Map<string, { id: string; analysisStatus: string; originalExternalId: string }>();
        
        // Secondary map: DB ID -> COMPLETED game info (for linking UUID externalIds back to originals)
        // This handles cases where a COMPLETED game's externalId is the DB ID of another record
        const completedByDbId = new Map<string, { id: string; analysisStatus: string }>();

        storedGames.forEach(g => {
            if (g.externalId) {
                const key = extractGameId(g.externalId);
                const existing = storedGamesMap.get(key);
                
                // Only update if: no existing entry, OR new entry has higher priority status
                const statusPriority: Record<string, number> = {
                    'PENDING': 1, 'QUEUED': 2, 'PROCESSING': 3, 'FAILED': 4, 'COMPLETED': 5,
                };
                const newPriority = statusPriority[g.analysisStatus] || 0;
                const existingPriority = existing ? statusPriority[existing.analysisStatus.toUpperCase()] || 0 : 0;
                
                if (!existing || newPriority > existingPriority) {
                    storedGamesMap.set(key, {
                        id: g.id,
                        analysisStatus: g.analysisStatus.toLowerCase(),
                        originalExternalId: g.externalId,
                    });
                }
                
                // If this is a COMPLETED game with a UUID-like externalId, it might reference another game's DB ID
                // Store it for secondary lookup
                if (g.analysisStatus === 'COMPLETED') {
                    const isUuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(g.externalId);
                    if (isUuidLike) {
                        completedByDbId.set(g.externalId.toLowerCase(), {
                            id: g.id,
                            analysisStatus: 'completed',
                        });
                    }
                }
            }
        });
        
        this.logger.debug(`Built secondary lookup with ${completedByDbId.size} COMPLETED games with UUID externalIds`);

        // Merge analysis status from database into fetched games
        allGames = allGames.map(game => {
            const gameId = extractGameId(game.id);
            let stored = storedGamesMap.get(gameId);
            
            // If found but not COMPLETED, check if there's a COMPLETED game that references this one's DB ID
            // This handles the case where analysis was saved with the wrong externalId (UUID instead of URL)
            if (stored && stored.analysisStatus !== 'completed') {
                const completedRef = completedByDbId.get(stored.id.toLowerCase());
                if (completedRef) {
                    this.logger.debug(`Found COMPLETED reference for game "${stored.id}" via secondary lookup`);
                    stored = {
                        id: completedRef.id,
                        analysisStatus: completedRef.analysisStatus,
                        originalExternalId: stored.originalExternalId,
                    };
                }
            }
            
            if (stored) {
                this.logger.debug(`Matched game: "${game.id}" (id: ${gameId}) -> DB ID "${stored.id}", status: ${stored.analysisStatus}`);
                return {
                    ...game,
                    dbId: stored.id, // Database ID for navigation
                    externalId: game.id, // Preserve original external ID (URL) for future API calls
                    analysisStatus: stored.analysisStatus,
                };
            }
            return game;
        });

        // Log how many games were matched
        const matchedCount = allGames.filter(g => g.analysisStatus === 'completed').length;
        this.logger.debug(`Matched ${matchedCount} games with completed analysis status`);

        // Filter by analyzed status if requested (for 'no' filter - exclude analyzed games)
        if (analyzed === 'no') {
            allGames = allGames.filter(game => game.analysisStatus !== 'completed');
        }

        // Pagination (local)
        const startIndex = (Number(page) - 1) * Number(limit);
        const endIndex = startIndex + Number(limit);
        const paginatedGames = allGames.slice(startIndex, endIndex);

        return {
            data: paginatedGames,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total: allGames.length,
                totalPages: Math.ceil(allGames.length / Number(limit)),
            },
        };
    }

    private async fetchChessComGames(username: string, limit: any): Promise<any[]> {
        try {
            // Fetch archives with timeout
            const archivesRes = await firstValueFrom(
                this.httpService.get(`https://api.chess.com/pub/player/${username.toLowerCase()}/games/archives`, {
                    headers: { 'User-Agent': 'EloInsight/1.0 (contact@eloinsight.com)' },
                    timeout: 45000, // 45 second timeout
                })
            );

            const archives = archivesRes.data.archives;
            if (archives && archives.length > 0) {
                const allGames: any[] = [];
                const targetLimit = Math.min(Number(limit) * 3, 300); // Cap at 300 games

                // Fetch from recent archives until we have enough games (max 3 months)
                const maxArchives = Math.min(3, archives.length);
                for (let i = archives.length - 1; i >= archives.length - maxArchives && allGames.length < targetLimit; i--) {
                    try {
                        const gamesRes = await firstValueFrom(
                            this.httpService.get(archives[i], {
                                headers: { 'User-Agent': 'EloInsight/1.0 (contact@eloinsight.com)' },
                                timeout: 30000,
                            })
                        );

                        const rawGames = gamesRes.data.games || [];
                        allGames.push(...rawGames.reverse());

                        // Small delay between requests to avoid rate limiting
                        await new Promise(resolve => setTimeout(resolve, 200));
                    } catch (archiveError) {
                        console.warn(`Failed to fetch archive ${archives[i]}:`, archiveError.message);
                    }
                }

                // Map to unified format
                return allGames.map((g: any) => ({
                    id: g.url,
                    platform: 'chess.com',
                    whitePlayer: g.white.username,
                    blackPlayer: g.black.username,
                    whiteRating: g.white.rating,
                    blackRating: g.black.rating,
                    result: this.mapChessComResult(g.white.result, g.black.result),
                    timeControl: g.time_control,
                    playedAt: new Date(g.end_time * 1000).toISOString(),
                    analysisStatus: 'pending',
                    pgn: g.pgn
                }));
            }
        } catch (error) {
            console.error(`Failed to fetch Chess.com games for ${username}:`, error.message);
        }
        return [];
    }

    private async fetchLichessGames(username: string, limit: any): Promise<any[]> {
        try {
            const maxGames = Math.min(Math.max(Number(limit) * 3, 100), 300); // Cap between 100-300 games
            const response = await firstValueFrom(
                this.httpService.get(`https://lichess.org/api/games/user/${username}`, {
                    params: { max: maxGames, opening: 'true' },
                    headers: {
                        'Accept': 'application/x-ndjson',
                        'User-Agent': 'EloInsight/1.0 (contact@eloinsight.com)'
                    },
                    responseType: 'text',
                    timeout: 60000, // 60 second timeout for larger exports
                })
            );

            // Parse NDJSON (newline delimited JSON)
            const data = response.data?.toString() || '';
            if (!data.trim()) return [];

            const rawGames = data.trim().split('\n')
                .filter(line => line.trim())
                .map(line => {
                    try {
                        return JSON.parse(line);
                    } catch {
                        return null;
                    }
                })
                .filter(Boolean);

            return rawGames.map((g: any) => ({
                id: `https://lichess.org/${g.id}`,
                platform: 'lichess',
                whitePlayer: g.players.white?.user?.name || 'Anonymous',
                blackPlayer: g.players.black?.user?.name || 'Anonymous',
                whiteRating: g.players.white?.rating,
                blackRating: g.players.black?.rating,
                result: this.mapLichessResult(g.winner),
                timeControl: this.formatLichessTimeControl(g.clock),
                playedAt: new Date(g.createdAt).toISOString(),
                analysisStatus: 'pending',
                pgn: g.moves
            }));

        } catch (error) {
            console.error(`Failed to fetch Lichess games for ${username}:`, error.message);
        }
        return [];
    }

    private mapChessComResult(white: string, black: string): string {
        if (white === 'win') return '1-0';
        if (black === 'win') return '0-1';
        return '1/2-1/2';
    }

    private mapLichessResult(winner?: string): string {
        if (winner === 'white') return '1-0';
        if (winner === 'black') return '0-1';
        return '1/2-1/2';
    }

    private formatLichessTimeControl(clock: any): string {
        if (!clock) return '-';
        return `${clock.limit / 60}+${clock.increment}`;
    }

    @Get('analyzed')
    @ApiOperation({ summary: 'Get analyzed games' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'Analyzed games retrieved successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getAnalyzedGames(
        @Request() req,
        @Query('page') page = 1,
        @Query('limit') limit = 20,
    ) {
        const userId = req.user.id;
        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const [games, total] = await Promise.all([
            this.prisma.game.findMany({
                where: {
                    userId,
                    analysisStatus: 'COMPLETED',
                },
                include: {
                    analysis: {
                        select: {
                            accuracyWhite: true,
                            accuracyBlack: true,
                            acplWhite: true,
                            acplBlack: true,
                            blundersWhite: true,
                            blundersBlack: true,
                            mistakesWhite: true,
                            mistakesBlack: true,
                            inaccuraciesWhite: true,
                            inaccuraciesBlack: true,
                            performanceRatingWhite: true,
                            performanceRatingBlack: true,
                            analyzedAt: true,
                        },
                    },
                },
                orderBy: { playedAt: 'desc' },
                skip,
                take,
            }),
            this.prisma.game.count({
                where: {
                    userId,
                    analysisStatus: 'COMPLETED',
                },
            }),
        ]);

        return {
            data: games.map(game => ({
                id: game.id,
                platform: game.platform === 'CHESS_COM' ? 'chess.com' : 'lichess',
                whitePlayer: game.whitePlayer,
                blackPlayer: game.blackPlayer,
                result: this.mapGameResultToString(game.result),
                timeControl: game.timeControl,
                playedAt: game.playedAt.toISOString(),
                openingName: game.openingName,
                analysisStatus: 'completed',
                analysis: game.analysis ? {
                    accuracyWhite: Number(game.analysis.accuracyWhite) || 0,
                    accuracyBlack: Number(game.analysis.accuracyBlack) || 0,
                    acplWhite: Number(game.analysis.acplWhite) || 0,
                    acplBlack: Number(game.analysis.acplBlack) || 0,
                    blundersWhite: game.analysis.blundersWhite,
                    blundersBlack: game.analysis.blundersBlack,
                    mistakesWhite: game.analysis.mistakesWhite,
                    mistakesBlack: game.analysis.mistakesBlack,
                    inaccuraciesWhite: game.analysis.inaccuraciesWhite,
                    inaccuraciesBlack: game.analysis.inaccuraciesBlack,
                    performanceRatingWhite: game.analysis.performanceRatingWhite,
                    performanceRatingBlack: game.analysis.performanceRatingBlack,
                    analyzedAt: game.analysis.analyzedAt.toISOString(),
                } : null,
            })),
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        };
    }

    @Post()
    @ApiOperation({ summary: 'Store a game for analysis' })
    @ApiBody({ type: CreateGameDto })
    @ApiResponse({ status: 201, description: 'Game stored successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async createGame(
        @Request() req,
        @Body() dto: CreateGameDto,
    ) {
        const userId = req.user.id;

        // Map result string to enum
        const resultMap: Record<string, 'WHITE_WIN' | 'BLACK_WIN' | 'DRAW' | 'ONGOING'> = {
            '1-0': 'WHITE_WIN',
            '0-1': 'BLACK_WIN',
            '1/2-1/2': 'DRAW',
            '*': 'ONGOING',
        };
        const result = resultMap[dto.result] || 'ONGOING';

        // Map platform to enum
        const platformMap: Record<string, 'CHESS_COM' | 'LICHESS' | 'MANUAL'> = {
            'chess.com': 'CHESS_COM',
            'lichess': 'LICHESS',
            'manual': 'MANUAL',
        };
        const platform = platformMap[dto.platform] || 'MANUAL';

        // Check if game already exists for this user
        const existingGame = await this.prisma.game.findFirst({
            where: {
                userId,
                platform,
                externalId: dto.externalId,
            },
        });

        if (existingGame) {
            return {
                id: existingGame.id,
                message: 'Game already exists',
                alreadyExists: true,
                analysisStatus: existingGame.analysisStatus,
            };
        }

        // Create the game
        const game = await this.prisma.game.create({
            data: {
                userId,
                platform,
                externalId: dto.externalId,
                pgn: dto.pgn,
                whitePlayer: dto.whitePlayer,
                blackPlayer: dto.blackPlayer,
                whiteRating: dto.whiteRating,
                blackRating: dto.blackRating,
                result,
                timeControl: dto.timeControl,
                openingName: dto.openingName,
                playedAt: new Date(dto.playedAt),
                analysisStatus: 'PENDING',
            },
        });

        this.logger.log(`Game stored: ${game.id} for user ${userId}`);

        return {
            id: game.id,
            message: 'Game stored successfully',
            alreadyExists: false,
        };
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get game by ID' })
    @ApiResponse({ status: 200, description: 'Game retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Game not found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getGame(@Request() req, @Param('id') id: string) {
        const userId = req.user.id;

        const game = await this.prisma.game.findFirst({
            where: {
                id,
                userId,
            },
            include: {
                analysis: true,
            },
        });

        if (!game) {
            return {
                error: 'Game not found',
                statusCode: 404,
            };
        }

        return {
            id: game.id,
            platform: game.platform === 'CHESS_COM' ? 'chess.com' : 'lichess',
            whitePlayer: game.whitePlayer,
            blackPlayer: game.blackPlayer,
            result: this.mapGameResultToString(game.result),
            timeControl: game.timeControl,
            playedAt: game.playedAt.toISOString(),
            openingName: game.openingName,
            pgn: game.pgn,
            analysisStatus: game.analysisStatus.toLowerCase(),
            analysis: game.analysis,
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

    @Post('sync')
    @ApiOperation({ summary: 'Sync games from platform' })
    @ApiResponse({ status: 200, description: 'Sync initiated successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async syncGames(@Body('platform') platform: string) {
        // Stub - will trigger game sync service later
        return {
            jobId: 'sync-' + Date.now(),
            status: 'queued',
            message: `Game sync from ${platform} initiated`,
        };
    }
}
