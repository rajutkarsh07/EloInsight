import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('analysis')
@Controller('analysis')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AnalysisController {
    @Get(':gameId')
    @ApiOperation({ summary: 'Get game analysis' })
    @ApiResponse({ status: 200, description: 'Analysis retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Analysis not found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getAnalysis(@Param('gameId') gameId: string) {
        // Mock analysis data
        return {
            id: 'analysis-' + gameId,
            gameId,
            accuracyWhite: 92.5,
            accuracyBlack: 85.3,
            acplWhite: 15.2,
            acplBlack: 28.7,
            blundersWhite: 0,
            blundersBlack: 2,
            mistakesWhite: 1,
            mistakesBlack: 3,
            inaccuraciesWhite: 2,
            inaccuraciesBlack: 4,
            performanceRatingWhite: 2100,
            performanceRatingBlack: 1950,
            analyzedAt: new Date().toISOString(),
        };
    }

    @Post(':gameId')
    @ApiOperation({ summary: 'Request game analysis' })
    @ApiResponse({ status: 200, description: 'Analysis requested successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async requestAnalysis(
        @Param('gameId') gameId: string,
        @Body('depth') depth = 20,
        @Body('priority') priority = 'normal',
    ) {
        // Stub - will queue analysis job later
        return {
            jobId: 'analysis-job-' + Date.now(),
            gameId,
            depth,
            priority,
            status: 'queued',
            message: 'Analysis request queued successfully',
        };
    }
}
