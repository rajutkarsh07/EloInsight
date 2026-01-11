import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ChessComService } from './chess-com.service';
import { RateLimiterService } from '../common/rate-limiter.service';
import { RetryService } from '../common/retry.service';

@Module({
    imports: [
        HttpModule.register({
            timeout: 30000,
            maxRedirects: 3,
        }),
    ],
    providers: [ChessComService, RateLimiterService, RetryService],
    exports: [ChessComService],
})
export class ChessComModule { }
