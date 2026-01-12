import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthService } from '../auth/auth.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
    constructor(private authService: AuthService) { }

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
        // Mock statistics - replace with real data later
        return {
            userId: req.user.id,
            totalGames: 150,
            winRate: 52.3,
            averageAccuracy: 88.5,
            recentGames: 10,
        };
    }
}
