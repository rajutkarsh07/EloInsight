import { Controller, Post, Get, Param, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { SyncService } from './sync.service';

@Controller('sync')
export class SyncController {
    private readonly logger = new Logger(SyncController.name);

    constructor(private readonly syncService: SyncService) { }

    /**
     * Trigger sync for a specific user
     */
    @Post('user/:userId')
    @HttpCode(HttpStatus.ACCEPTED)
    async syncUser(@Param('userId') userId: string) {
        this.logger.log(`Manual sync triggered for user: ${userId}`);

        // Start sync in background
        this.syncService.syncUser(userId).catch(error => {
            this.logger.error(`Sync failed for user ${userId}: ${error}`);
        });

        return {
            message: 'Sync started',
            userId,
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * Trigger sync for a specific linked account
     */
    @Post('account/:accountId')
    @HttpCode(HttpStatus.ACCEPTED)
    async syncAccount(@Param('accountId') accountId: string) {
        this.logger.log(`Manual sync triggered for account: ${accountId}`);

        return {
            message: 'Sync started',
            accountId,
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * Get sync status for a user
     */
    @Get('status/:userId')
    async getSyncStatus(@Param('userId') userId: string) {
        const status = await this.syncService.getSyncStatus(userId);
        return {
            userId,
            syncJobs: status,
        };
    }

    /**
     * Trigger scheduled sync manually (admin endpoint)
     */
    @Post('scheduled')
    @HttpCode(HttpStatus.ACCEPTED)
    async triggerScheduledSync() {
        this.logger.log('Manual scheduled sync triggered');

        // Start sync in background
        this.syncService.scheduledSync().catch(error => {
            this.logger.error(`Scheduled sync failed: ${error}`);
        });

        return {
            message: 'Scheduled sync started',
            timestamp: new Date().toISOString(),
        };
    }
}
