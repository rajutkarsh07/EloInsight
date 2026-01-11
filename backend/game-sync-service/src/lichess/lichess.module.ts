import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { LichessService } from './lichess.service';
import { RateLimiterService } from '../common/rate-limiter.service';
import { RetryService } from '../common/retry.service';

@Module({
    imports: [
        HttpModule.register({
            timeout: 120000, // 2 minutes for large exports
            maxRedirects: 3,
        }),
    ],
    providers: [LichessService, RateLimiterService, RetryService],
    exports: [LichessService],
})
export class LichessModule { }
