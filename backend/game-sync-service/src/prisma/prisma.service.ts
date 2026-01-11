import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);

    constructor() {
        super({
            log: process.env.NODE_ENV === 'development'
                ? ['query', 'info', 'warn', 'error']
                : ['error'],
            errorFormat: 'pretty',
        });
    }

    async onModuleInit() {
        await this.$connect();
        this.logger.log('📦 Database connected');
    }

    async onModuleDestroy() {
        await this.$disconnect();
        this.logger.log('📦 Database disconnected');
    }
}
