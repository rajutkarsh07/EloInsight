import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GamesModule } from './games/games.module';
import { AnalysisModule } from './analysis/analysis.module';
import { AdminModule } from './admin/admin.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),
        // Global rate limiting. Specific endpoints (e.g. admin login) apply
        // stricter limits via @Throttle().
        ThrottlerModule.forRoot([
            {
                name: 'default',
                ttl: 60_000,
                limit: 120,
            },
        ]),
        PrismaModule,
        AuthModule,
        UsersModule,
        GamesModule,
        AnalysisModule,
        AdminModule,
    ],
    providers: [
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
})
export class AppModule { }
