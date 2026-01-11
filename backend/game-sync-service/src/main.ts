import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
    const logger = new Logger('GameSyncService');

    const app = await NestFactory.create(AppModule, {
        logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // Global validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
            forbidNonWhitelisted: true,
        }),
    );

    // CORS
    app.enableCors({
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        credentials: true,
    });

    // Get port from config
    const configService = app.get(ConfigService);
    const port = configService.get<number>('PORT', 3002);

    await app.listen(port);

    logger.log(`🎮 Game Sync Service running on port ${port}`);
    logger.log(`📅 Cron sync enabled: ${configService.get('SYNC_CRON', '0 */6 * * *')}`);
}

bootstrap();
