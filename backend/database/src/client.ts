import { PrismaClient } from '@prisma/client';

// Declare global variable to prevent multiple instances during hot-reload
declare global {
    // eslint-disable-next-line no-var
    var prisma: PrismaClient | undefined;
}

/**
 * Prisma Client singleton instance
 * In development, we store the client on globalThis to prevent
 * creating new instances on every hot reload
 */
export const prisma = globalThis.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
    errorFormat: 'pretty',
});

// Store on globalThis in development for hot-reload persistence
if (process.env.NODE_ENV !== 'production') {
    globalThis.prisma = prisma;
}

/**
 * Extended Prisma Client with custom methods
 */
export class DatabaseClient {
    private client: PrismaClient;

    constructor() {
        this.client = prisma;
    }

    /**
     * Get the underlying Prisma client
     */
    get prisma(): PrismaClient {
        return this.client;
    }

    /**
     * Connect to the database
     */
    async connect(): Promise<void> {
        await this.client.$connect();
        console.log('📦 Database connected successfully');
    }

    /**
     * Disconnect from the database
     */
    async disconnect(): Promise<void> {
        await this.client.$disconnect();
        console.log('📦 Database disconnected');
    }

    /**
     * Health check - verify database connection
     */
    async healthCheck(): Promise<boolean> {
        try {
            await this.client.$queryRaw`SELECT 1`;
            return true;
        } catch (error) {
            console.error('Database health check failed:', error);
            return false;
        }
    }

    /**
     * Execute a raw SQL query
     */
    async executeRaw(query: string): Promise<number> {
        return this.client.$executeRawUnsafe(query);
    }

    /**
     * Run inside a transaction
     */
    async transaction<T>(
        fn: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
    ): Promise<T> {
        return this.client.$transaction(fn);
    }
}

// Export singleton instance
export const db = new DatabaseClient();

export default prisma;
