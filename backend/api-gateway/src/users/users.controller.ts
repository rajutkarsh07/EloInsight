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

    @Get('dashboard')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get comprehensive dashboard data' })
    @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getDashboardData(@Request() req) {
        const userId = req.user.id;
        const user = await this.authService.getUserById(userId);

        // Fetch all analyzed games with full analysis data
        const analyzedGames = await this.prisma.game.findMany({
            where: {
                userId,
                analysisStatus: 'COMPLETED',
                analysis: { isNot: null },
            },
            include: {
                analysis: true,
            },
            orderBy: { playedAt: 'desc' },
        });

        const totalGames = analyzedGames.length;

        if (totalGames === 0) {
            return {
                stats: {
                    totalGames: 0,
                    winRate: 0,
                    averageAccuracy: 0,
                    totalBlunders: 0,
                    totalBrilliant: 0,
                    avgPerformanceRating: 0,
                },
                streaks: { current: 0, type: 'none', best: 0 },
                moveQuality: { brilliant: 0, best: 0, good: 0, inaccuracies: 0, mistakes: 0, blunders: 0 },
                openings: [],
                recentTrend: { accuracy: [], wins: 0, losses: 0, draws: 0 },
                bestGame: null,
                worstGame: null,
                studySuggestions: ['Sync your games to get personalized suggestions'],
                timeControlStats: [],
            };
        }

        // Initialize counters
        let wins = 0, losses = 0, draws = 0;
        let totalAccuracy = 0, accuracyCount = 0;
        let totalBlunders = 0, totalMistakes = 0, totalInaccuracies = 0;
        let totalBrilliant = 0, totalBest = 0, totalGood = 0;
        let totalPerformanceRating = 0, perfCount = 0;
        const openingMap = new Map<string, { wins: number; losses: number; draws: number; games: number }>();
        const timeControlMap = new Map<string, { wins: number; games: number }>();
        const accuracyTrend: number[] = [];

        // Calculate current streak
        let currentStreak = 0;
        let streakType: 'win' | 'loss' | 'none' = 'none';
        let bestStreak = 0;
        let streakCount = 0;

        // Find best and worst games
        let bestGame: any = null;
        let worstGame: any = null;
        let bestAccuracy = 0;
        let worstAccuracy = 100;

        for (let i = 0; i < analyzedGames.length; i++) {
            const game = analyzedGames[i];
            const userIsWhite = game.whitePlayer.toLowerCase() === user?.username?.toLowerCase() ||
                game.whitePlayer.toLowerCase() === user?.chessComUsername?.toLowerCase() ||
                game.whitePlayer.toLowerCase() === user?.lichessUsername?.toLowerCase();

            // Calculate game result for user
            let gameResult: 'win' | 'loss' | 'draw' = 'draw';
            if (game.result === 'WHITE_WIN') {
                gameResult = userIsWhite ? 'win' : 'loss';
            } else if (game.result === 'BLACK_WIN') {
                gameResult = userIsWhite ? 'loss' : 'win';
            }

            if (gameResult === 'win') wins++;
            else if (gameResult === 'loss') losses++;
            else draws++;

            // Streak calculation (games are sorted desc by date)
            if (i === 0) {
                streakType = gameResult === 'draw' ? 'none' : gameResult;
                currentStreak = gameResult === 'draw' ? 0 : 1;
            } else if (streakType !== 'none' && streakType === gameResult) {
                currentStreak++;
            }

            // Best streak tracking
            if (gameResult === 'win') {
                streakCount++;
                bestStreak = Math.max(bestStreak, streakCount);
            } else {
                streakCount = 0;
            }

            // Accumulate analysis metrics
            if (game.analysis) {
                const acc = userIsWhite ? Number(game.analysis.accuracyWhite) : Number(game.analysis.accuracyBlack);
                const blunders = userIsWhite ? game.analysis.blundersWhite : game.analysis.blundersBlack;
                const mistakes = userIsWhite ? game.analysis.mistakesWhite : game.analysis.mistakesBlack;
                const inaccuracies = userIsWhite ? game.analysis.inaccuraciesWhite : game.analysis.inaccuraciesBlack;
                const perfRating = userIsWhite ? game.analysis.performanceRatingWhite : game.analysis.performanceRatingBlack;
                const brilliant = userIsWhite ? (game.analysis as any).brilliantMovesWhite || 0 : (game.analysis as any).brilliantMovesBlack || 0;
                const best = userIsWhite ? (game.analysis as any).goodMovesWhite || 0 : (game.analysis as any).goodMovesBlack || 0;

                if (acc > 0) {
                    totalAccuracy += acc;
                    accuracyCount++;
                    accuracyTrend.push(acc);

                    // Best/Worst game tracking
                    if (acc > bestAccuracy) {
                        bestAccuracy = acc;
                        bestGame = {
                            id: game.id,
                            whitePlayer: game.whitePlayer,
                            blackPlayer: game.blackPlayer,
                            result: game.result,
                            accuracy: acc,
                            playedAt: game.playedAt.toISOString(),
                            opening: game.openingName,
                        };
                    }
                    if (acc < worstAccuracy) {
                        worstAccuracy = acc;
                        worstGame = {
                            id: game.id,
                            whitePlayer: game.whitePlayer,
                            blackPlayer: game.blackPlayer,
                            result: game.result,
                            accuracy: acc,
                            playedAt: game.playedAt.toISOString(),
                            opening: game.openingName,
                        };
                    }
                }

                totalBlunders += blunders || 0;
                totalMistakes += mistakes || 0;
                totalInaccuracies += inaccuracies || 0;
                totalBrilliant += brilliant;
                totalBest += best;

                if (perfRating) {
                    totalPerformanceRating += perfRating;
                    perfCount++;
                }
            }

            // Opening stats
            const opening = game.openingName || 'Unknown Opening';
            const openingStats = openingMap.get(opening) || { wins: 0, losses: 0, draws: 0, games: 0 };
            openingStats.games++;
            if (gameResult === 'win') openingStats.wins++;
            else if (gameResult === 'loss') openingStats.losses++;
            else openingStats.draws++;
            openingMap.set(opening, openingStats);

            // Time control stats
            const timeControl = game.timeControl || 'Unknown';
            const tcStats = timeControlMap.get(timeControl) || { wins: 0, games: 0 };
            tcStats.games++;
            if (gameResult === 'win') tcStats.wins++;
            timeControlMap.set(timeControl, tcStats);
        }

        // Calculate averages
        const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;
        const averageAccuracy = accuracyCount > 0 ? totalAccuracy / accuracyCount : 0;
        const avgPerformanceRating = perfCount > 0 ? Math.round(totalPerformanceRating / perfCount) : 0;

        // Generate study suggestions based on metrics
        const studySuggestions: string[] = [];
        if (totalBlunders > totalGames * 0.5) studySuggestions.push('Focus on tactical awareness - too many blunders');
        if (totalMistakes > totalGames) studySuggestions.push('Practice calculation - reduce positional mistakes');
        if (winRate < 40) studySuggestions.push('Study opening principles to get better positions');
        if (averageAccuracy < 70) studySuggestions.push('Work on move quality - aim for 80%+ accuracy');
        if (studySuggestions.length === 0) studySuggestions.push('Keep up the great work! Consider studying advanced tactics');

        // Format openings data (top 5)
        const openings = Array.from(openingMap.entries())
            .map(([name, stats]) => ({
                name: name.length > 30 ? name.substring(0, 30) + '...' : name,
                fullName: name,
                games: stats.games,
                winRate: stats.games > 0 ? Math.round((stats.wins / stats.games) * 100) : 0,
                wins: stats.wins,
                losses: stats.losses,
                draws: stats.draws,
            }))
            .sort((a, b) => b.games - a.games)
            .slice(0, 5);

        // Format time control stats
        const timeControlStats = Array.from(timeControlMap.entries())
            .map(([name, stats]) => ({
                name,
                games: stats.games,
                winRate: stats.games > 0 ? Math.round((stats.wins / stats.games) * 100) : 0,
            }))
            .sort((a, b) => b.games - a.games);

        return {
            stats: {
                totalGames,
                winRate: parseFloat(winRate.toFixed(1)),
                averageAccuracy: parseFloat(averageAccuracy.toFixed(1)),
                totalBlunders,
                totalMistakes,
                totalInaccuracies,
                totalBrilliant,
                avgPerformanceRating,
            },
            streaks: {
                current: currentStreak,
                type: streakType,
                best: bestStreak,
            },
            moveQuality: {
                brilliant: totalBrilliant,
                best: totalBest,
                good: totalGood,
                inaccuracies: totalInaccuracies,
                mistakes: totalMistakes,
                blunders: totalBlunders,
            },
            openings,
            recentTrend: {
                accuracy: accuracyTrend.slice(0, 10).reverse(), // Last 10 games, oldest first
                wins,
                losses,
                draws,
            },
            bestGame,
            worstGame,
            studySuggestions,
            timeControlStats,
        };
    }

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
            lichessVerified: user.lichessVerified,
            chessComVerified: user.chessComVerified,
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
