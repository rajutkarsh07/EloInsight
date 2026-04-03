import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Global prefix
    const apiPrefix = process.env.API_PREFIX || 'api/v1';
    app.setGlobalPrefix(apiPrefix);

    // CORS - Handle multiple origins with callback for proper validation
    const corsOriginEnv = process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:13001,http://localhost:13000';
    const allowedOrigins = corsOriginEnv.split(',').map(origin => origin.trim());

    app.enableCors({
        origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps, curl, Postman)
            if (!origin) {
                return callback(null, true);
            }
            // Check if origin is in allowed list
            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            // Also allow any localhost port for development
            if (origin.startsWith('http://localhost:')) {
                return callback(null, true);
            }
            callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
    });

    // Global validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    // Swagger documentation
    const config = new DocumentBuilder()
        .setTitle('EloInsight API Gateway')
        .setDescription('REST API for EloInsight Chess Analysis Platform')
        .setVersion('1.0')
        .addTag('auth', 'Authentication endpoints')
        .addTag('users', 'User management endpoints')
        .addTag('games', 'Game management endpoints')
        .addTag('analysis', 'Analysis endpoints')
        .addBearerAuth(
            {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                name: 'JWT',
                description: 'Enter JWT token',
                in: 'header',
            },
            'JWT-auth',
        )
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    const port = process.env.PORT || 14000;
    await app.listen(port, '0.0.0.0');

    console.log(`
    🚀 API Gateway is running on: http://localhost:${port}/${apiPrefix}
    📚 Swagger documentation: http://localhost:${port}/api/docs
    🌍 Environment: ${process.env.NODE_ENV || 'development'}
  `);
}

bootstrap();
