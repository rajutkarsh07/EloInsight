import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import * as https from 'https';
import { ChessComService } from './chess-com.service';
import { RateLimiterService } from '../common/rate-limiter.service';
import { RetryService } from '../common/retry.service';

// For development: ignore self-signed certificates
const isDev = process.env.NODE_ENV !== 'production';
const httpsAgent = isDev
    ? new https.Agent({ rejectUnauthorized: false })
    : undefined;

@Module({
    imports: [
        HttpModule.register({
            timeout: 30000,
            maxRedirects: 3,
            httpsAgent,
        }),
    ],
    providers: [ChessComService, RateLimiterService, RetryService],
    exports: [ChessComService],
})
export class ChessComModule { }
