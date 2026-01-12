import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Global prefix
    const apiPrefix = process.env.API_PREFIX || 'api/v1';
    app.setGlobalPrefix(apiPrefix);

    // CORS - Handle single or multiple origins
    const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
    const allowedOrigins = corsOrigin.includes(',')
        ? corsOrigin.split(',').map(origin => origin.trim())
        : corsOrigin;

    app.enableCors({
        origin: allowedOrigins,
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

    const port = process.env.PORT || 4000;
    await app.listen(port);

    console.log(`
    🚀 API Gateway is running on: http://localhost:${port}/${apiPrefix}
    📚 Swagger documentation: http://localhost:${port}/api/docs
    🌍 Environment: ${process.env.NODE_ENV || 'development'}
  `);
}

bootstrap();
