import { Controller, Get, Post, Param, Body, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthService } from '../auth/auth.service';
import { firstValueFrom } from 'rxjs';

@ApiTags('games')
@Controller('games')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class GamesController {
    constructor(
        private authService: AuthService,
        private httpService: HttpService
    ) { }

    @Get()
    @ApiOperation({ summary: 'Get user games' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'platform', required: false, enum: ['chess.com', 'lichess'] })
    @ApiResponse({ status: 200, description: 'Games retrieved successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getGames(
        @Request() req,
        @Query('page') page = 1,
        @Query('limit') limit = 20,
        @Query('platform') platform?: string,
    ) {
        const user = await this.authService.getUserById(req.user.id);
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
        const allGames = results.flat().sort((a, b) =>
            new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime()
        );

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
            // Fetch archives
            const archivesRes = await firstValueFrom(
                this.httpService.get(`https://api.chess.com/pub/player/${username.toLowerCase()}/games/archives`, {
                    headers: { 'User-Agent': 'EloInsight/1.0' }
                })
            );

            const archives = archivesRes.data.archives;
            if (archives && archives.length > 0) {
                // Fetch last available month (most recent games)
                const lastArchive = archives[archives.length - 1];
                const gamesRes = await firstValueFrom(
                    this.httpService.get(lastArchive, {
                        headers: { 'User-Agent': 'EloInsight/1.0' }
                    })
                );

                const rawGames = gamesRes.data.games || [];

                // Map to unified format
                return rawGames.reverse().slice(0, Number(limit)).map((g: any) => ({
                    id: g.url,
                    platform: 'chess.com',
                    whitePlayer: g.white.username,
                    blackPlayer: g.black.username,
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
            const response = await firstValueFrom(
                this.httpService.get(`https://lichess.org/api/games/user/${username}`, {
                    params: { max: limit, opening: 'true' },
                    headers: { 'Accept': 'application/x-ndjson' },
                    responseType: 'text' // Handle NDJSON as text
                })
            );

            // Parse NDJSON (newline delimited JSON)
            const rawGames = response.data.toString().trim().split('\n')
                .filter(line => line)
                .map(line => JSON.parse(line));

            return rawGames.map((g: any) => ({
                id: `https://lichess.org/${g.id}`,
                platform: 'lichess',
                whitePlayer: g.players.white?.user?.name || 'Anonymous',
                blackPlayer: g.players.black?.user?.name || 'Anonymous',
                result: this.mapLichessResult(g.winner),
                timeControl: this.formatLichessTimeControl(g.clock),
                playedAt: new Date(g.createdAt).toISOString(),
                analysisStatus: 'pending',
                pgn: g.moves // Lichess partial PGN in moves? Or need export? Using simple moves for now.
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

    @Get(':id')
    @ApiOperation({ summary: 'Get game by ID' })
    @ApiResponse({ status: 200, description: 'Game retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Game not found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getGame(@Param('id') id: string) {
        // Mock data fallback if ID is simple
        return {
            id,
            platform: 'chess.com',
            whitePlayer: 'Player1',
            blackPlayer: 'Player2',
            result: '1-0',
            timeControl: '10+0',
            playedAt: '2026-01-10',
            pgn: '[Event "Live Chess"]\n[Site "Chess.com"]...',
        };
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
