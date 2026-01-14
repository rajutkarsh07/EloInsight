import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import * as https from 'https';
import { LichessService } from './lichess.service';
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
            timeout: 120000, // 2 minutes for large exports
            maxRedirects: 3,
            httpsAgent,
        }),
    ],
    providers: [LichessService, RateLimiterService, RetryService],
    exports: [LichessService],
})
export class LichessModule { }
