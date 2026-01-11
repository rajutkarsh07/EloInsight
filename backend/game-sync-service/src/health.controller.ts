import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller('health')
export class HealthController {
    constructor(private readonly prisma: PrismaService) { }

    @Get()
    async check() {
        const dbHealthy = await this.checkDatabase();

        return {
            status: dbHealthy ? 'ok' : 'degraded',
            timestamp: new Date().toISOString(),
            service: 'game-sync-service',
            version: '1.0.0',
            checks: {
                database: dbHealthy ? 'healthy' : 'unhealthy',
            },
        };
    }

    private async checkDatabase(): Promise<boolean> {
        try {
            await this.prisma.$queryRaw`SELECT 1`;
            return true;
        } catch {
            return false;
        }
    }
}
