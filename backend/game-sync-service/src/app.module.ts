import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';

import { PrismaModule } from './prisma/prisma.module';
import { ChessComModule } from './chess-com/chess-com.module';
import { LichessModule } from './lichess/lichess.module';
import { SyncModule } from './sync/sync.module';
import { HealthController } from './health.controller';

@Module({
    imports: [
        // Configuration
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env', '.env.local'],
        }),

        // Scheduling for cron jobs
        ScheduleModule.forRoot(),

        // HTTP client
        HttpModule.register({
            timeout: 30000,
            maxRedirects: 5,
        }),

        // Database
        PrismaModule,

        // Feature modules
        ChessComModule,
        LichessModule,
        SyncModule,
    ],
    controllers: [HealthController],
})
export class AppModule { }
