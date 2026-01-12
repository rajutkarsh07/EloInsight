import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
    constructor(
        private authService: AuthService,
        private prisma: PrismaService,
    ) { }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getProfile(@Request() req) {
        const user = await this.authService.getUserById(req.user.id);
        if (!user) return null;
        return {
            id: user.id,
            email: user.email,
            username: user.username,
            chessComUsername: user.chessComUsername,
            lichessUsername: user.lichessUsername,
        };
    }

    @Patch('profile')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Update user profile' })
    @ApiBody({ schema: { type: 'object', properties: { chessComUsername: { type: 'string' }, lichessUsername: { type: 'string' } } } })
    @ApiResponse({ status: 200, description: 'Profile updated successfully' })
    async updateProfile(@Request() req, @Body() body: { chessComUsername?: string; lichessUsername?: string }) {
        return this.authService.updateProfile(req.user.id, body);
    }

    @Get('stats')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get user statistics' })
    @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getStats(@Request() req) {
        const userId = req.user.id;

        // Fetch analyzed games stats
        const analyzedGames = await this.prisma.game.findMany({
            where: {
                userId,
                analysisStatus: 'COMPLETED',
                analysis: { isNot: null },
            },
            include: {
                analysis: true,
            },
        });

        const totalGames = analyzedGames.length;

        if (totalGames === 0) {
            return {
                userId,
                totalGames: 0,
                winRate: 0,
                averageAccuracy: 0,
                recentGames: 0,
            };
        }

        // Calculate stats
        let wins = 0;
        let totalAccuracy = 0;
        let accuracyCount = 0;

        for (const game of analyzedGames) {
            const isWhite = game.whitePlayer === req.user.chessComUsername || game.whitePlayer === req.user.lichessUsername; // Approximation
            // A better way is to use game.userColor if available, or compare usernames

            // Check win
            if ((game.result === 'WHITE_WIN' && isWhite) || (game.result === 'BLACK_WIN' && !isWhite)) {
                wins++;
            }

            // Accumulate accuracy
            if (game.analysis) {
                // Try to guess user color match
                const userIsWhite = game.whitePlayer.toLowerCase() === req.user.username?.toLowerCase() ||
                    game.whitePlayer.toLowerCase() === req.user.chessComUsername?.toLowerCase() ||
                    game.whitePlayer.toLowerCase() === req.user.lichessUsername?.toLowerCase();

                const acc = userIsWhite ? Number(game.analysis.accuracyWhite) : Number(game.analysis.accuracyBlack);
                if (acc > 0) {
                    totalAccuracy += acc;
                    accuracyCount++;
                }
            }
        }

        const winRate = (wins / totalGames) * 100;
        const averageAccuracy = accuracyCount > 0 ? totalAccuracy / accuracyCount : 0;

        return {
            userId,
            totalGames,
            winRate: parseFloat(winRate.toFixed(1)),
            averageAccuracy: parseFloat(averageAccuracy.toFixed(1)),
            recentGames: totalGames, // Or filter by date
        };
    }

    @Get('ratings')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get user rating history' })
    @ApiResponse({ status: 200, description: 'Rating history retrieved successfully' })
    async getRatings(@Request() req) {
        const userId = req.user.id;
        const user = await this.authService.getUserById(userId);

        // Fetch games with ratings
        const games = await this.prisma.game.findMany({
            where: { userId },
            orderBy: { playedAt: 'asc' },
            select: {
                playedAt: true,
                platform: true,
                whitePlayer: true,
                blackPlayer: true,
                whiteRating: true,
                blackRating: true,
            }
        });

        // Transform to time series
        const history = games.map(game => {
            const userIsWhite = game.whitePlayer.toLowerCase() === user.chessComUsername?.toLowerCase() ||
                game.whitePlayer.toLowerCase() === user.lichessUsername?.toLowerCase();

            const rating = userIsWhite ? game.whiteRating : game.blackRating;

            if (!rating) return null;

            return {
                date: game.playedAt.toISOString(),
                platform: game.platform === 'CHESS_COM' ? 'chess.com' : 'lichess',
                rating,
            };
        }).filter(Boolean); // Remove nulls

        return history;
    }
}
