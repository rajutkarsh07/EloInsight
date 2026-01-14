import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import * as https from 'https';
import { GamesController } from './games.controller';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';

// For development: ignore self-signed certificates
const isDev = process.env.NODE_ENV !== 'production';
const httpsAgent = isDev
    ? new https.Agent({ rejectUnauthorized: false })
    : undefined;

@Module({
    imports: [
        HttpModule.register({
            timeout: 60000,
            httpsAgent,
        }),
        AuthModule,
        PrismaModule,
    ],
    controllers: [GamesController],
})
export class GamesModule { }
