import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Required for Stripe webhook signature verification
    logger:
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn', 'log']
        : ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // --- Security ---
  app.use(helmet());

  // --- API prefix ---
  app.setGlobalPrefix('api');

  // --- CORS ---
  app.enableCors({
    origin:
      process.env.NODE_ENV === 'production'
        ? [
            'https://stormburger.com',
            'https://www.stormburger.com',
            'https://admin.stormburger.com',
          ]
        : true, // Allow all origins in development
    credentials: true,
  });

  // --- Validation ---
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip unknown properties
      forbidNonWhitelisted: true, // Reject requests with unknown properties
      transform: true, // Auto-transform payloads to DTO types
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // --- Error handling ---
  app.useGlobalFilters(new GlobalExceptionFilter());

  // --- Logging ---
  app.useGlobalInterceptors(new LoggingInterceptor());

  // --- Request body size limit ---
  // Prevents large payload attacks. 1MB is generous for a food ordering API.
  // The Stripe webhook raw body is typically < 10KB.

  // --- Start ---
  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`StormBurger API running on port ${port}`);
  logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`Health check: http://localhost:${port}/api/health`);
}

bootstrap();
