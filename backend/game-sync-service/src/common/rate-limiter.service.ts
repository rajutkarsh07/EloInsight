import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Bottleneck from 'bottleneck';

/**
 * Rate limiter service using Bottleneck
 * Manages API request rates for Chess.com and Lichess
 */
@Injectable()
export class RateLimiterService {
    private readonly logger = new Logger(RateLimiterService.name);
    private readonly limiters: Map<string, Bottleneck> = new Map();

    constructor(private readonly configService: ConfigService) {
        this.initializeLimiters();
    }

    private initializeLimiters(): void {
        // Chess.com: 300 requests per minute
        const chessComLimiter = new Bottleneck({
            reservoir: this.configService.get<number>('CHESS_COM_RATE_LIMIT', 300),
            reservoirRefreshAmount: this.configService.get<number>('CHESS_COM_RATE_LIMIT', 300),
            reservoirRefreshInterval: this.configService.get<number>('CHESS_COM_RATE_WINDOW', 60000),
            maxConcurrent: 5,
            minTime: 200, // Min 200ms between requests
        });

        chessComLimiter.on('failed', (error, jobInfo) => {
            this.logger.warn(`Chess.com rate limit hit, job ${jobInfo.options.id} failed: ${error.message}`);
            if (jobInfo.retryCount < 3) {
                return 1000 * (jobInfo.retryCount + 1); // Exponential backoff
            }
        });

        // Lichess: 15 requests per second
        const lichessLimiter = new Bottleneck({
            reservoir: this.configService.get<number>('LICHESS_RATE_LIMIT', 15),
            reservoirRefreshAmount: this.configService.get<number>('LICHESS_RATE_LIMIT', 15),
            reservoirRefreshInterval: this.configService.get<number>('LICHESS_RATE_WINDOW', 1000),
            maxConcurrent: 2,
            minTime: 70, // Min 70ms between requests (~14 req/sec)
        });

        lichessLimiter.on('failed', (error, jobInfo) => {
            this.logger.warn(`Lichess rate limit hit, job ${jobInfo.options.id} failed: ${error.message}`);
            if (jobInfo.retryCount < 3) {
                return 500 * (jobInfo.retryCount + 1);
            }
        });

        this.limiters.set('chess.com', chessComLimiter);
        this.limiters.set('lichess', lichessLimiter);

        this.logger.log('Rate limiters initialized');
    }

    /**
     * Get the rate limiter for a specific platform
     */
    getLimiter(platform: 'chess.com' | 'lichess'): Bottleneck {
        const limiter = this.limiters.get(platform);
        if (!limiter) {
            throw new Error(`No rate limiter configured for platform: ${platform}`);
        }
        return limiter;
    }

    /**
     * Schedule a function with rate limiting
     */
    async schedule<T>(
        platform: 'chess.com' | 'lichess',
        fn: () => Promise<T>,
        priority: number = 5,
    ): Promise<T> {
        const limiter = this.getLimiter(platform);
        return limiter.schedule({ priority }, fn);
    }

    /**
     * Get current limiter stats
     */
    async getStats(platform: 'chess.com' | 'lichess') {
        const limiter = this.getLimiter(platform);
        const counts = await limiter.counts();
        return {
            platform,
            running: counts.RUNNING,
            queued: counts.QUEUED,
            done: counts.DONE,
        };
    }
}
