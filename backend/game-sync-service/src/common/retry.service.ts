import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface RetryOptions {
    maxRetries?: number;
    delayMs?: number;
    multiplier?: number;
    maxDelayMs?: number;
    shouldRetry?: (error: Error) => boolean;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
    maxRetries: 3,
    delayMs: 1000,
    multiplier: 2,
    maxDelayMs: 30000,
    shouldRetry: () => true,
};

/**
 * Retry service with exponential backoff
 */
@Injectable()
export class RetryService {
    private readonly logger = new Logger(RetryService.name);
    private readonly defaultOptions: RetryOptions;

    constructor(private readonly configService: ConfigService) {
        this.defaultOptions = {
            maxRetries: this.configService.get<number>('MAX_RETRIES', 3),
            delayMs: this.configService.get<number>('RETRY_DELAY_MS', 1000),
            multiplier: this.configService.get<number>('RETRY_MULTIPLIER', 2),
            maxDelayMs: 30000,
            shouldRetry: this.defaultShouldRetry.bind(this),
        };
    }

    /**
     * Execute a function with retry logic
     */
    async execute<T>(
        fn: () => Promise<T>,
        context: string,
        options?: RetryOptions,
    ): Promise<T> {
        const opts = { ...this.defaultOptions, ...options };
        let lastError: Error | null = null;
        let delay = opts.delayMs || 1000;

        for (let attempt = 0; attempt <= (opts.maxRetries || 3); attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));

                if (attempt === opts.maxRetries) {
                    this.logger.error(
                        `${context}: All ${opts.maxRetries} retries exhausted. Error: ${lastError.message}`,
                    );
                    throw lastError;
                }

                if (opts.shouldRetry && !opts.shouldRetry(lastError)) {
                    this.logger.warn(`${context}: Error not retryable. Error: ${lastError.message}`);
                    throw lastError;
                }

                this.logger.warn(
                    `${context}: Attempt ${attempt + 1} failed. Retrying in ${delay}ms. Error: ${lastError.message}`,
                );

                await this.sleep(delay);
                delay = Math.min(delay * (opts.multiplier || 2), opts.maxDelayMs || 30000);
            }
        }

        throw lastError || new Error(`${context}: Unknown error after retries`);
    }

    /**
     * Default logic to determine if an error should be retried
     */
    private defaultShouldRetry(error: Error): boolean {
        const message = error.message.toLowerCase();

        // Don't retry on client errors (except rate limiting)
        if (message.includes('400') || message.includes('401') ||
            message.includes('403') || message.includes('404')) {
            return false;
        }

        // Retry on rate limit (429)
        if (message.includes('429') || message.includes('rate limit')) {
            return true;
        }

        // Retry on server errors (5xx)
        if (message.includes('500') || message.includes('502') ||
            message.includes('503') || message.includes('504')) {
            return true;
        }

        // Retry on network errors
        if (message.includes('timeout') || message.includes('econnreset') ||
            message.includes('econnrefused') || message.includes('network')) {
            return true;
        }

        return true; // Default to retry
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
