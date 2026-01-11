import { Controller, Get, Post, Param, Body, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('games')
@Controller('games')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class GamesController {
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
        // Mock data - replace with real database query
        const mockGames = [
            {
                id: '1',
                platform: 'chess.com',
                whitePlayer: 'Player1',
                blackPlayer: 'Player2',
                result: '1-0',
                timeControl: '10+0',
                playedAt: '2026-01-10',
                analysisStatus: 'completed',
                accuracy: { white: 92.5, black: 85.3 },
            },
            {
                id: '2',
                platform: 'lichess',
                whitePlayer: 'Player3',
                blackPlayer: 'Player4',
                result: '0-1',
                timeControl: '5+3',
                playedAt: '2026-01-09',
                analysisStatus: 'pending',
            },
        ];

        return {
            data: mockGames,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total: 150,
                totalPages: Math.ceil(150 / Number(limit)),
            },
        };
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get game by ID' })
    @ApiResponse({ status: 200, description: 'Game retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Game not found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getGame(@Param('id') id: string) {
        // Mock data
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
