import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Validate required env vars at startup — crash-fast with clear message
  if (!process.env.JWT_SECRET) {
    logger.error('FATAL: JWT_SECRET environment variable is not set. Exiting.');
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule);

  // Cookie parser (required for httpOnly JWT cookie extraction)
  app.use(cookieParser());

  // Global validation pipe — validates all DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown properties
      forbidNonWhitelisted: true,
      transform: true, // auto-transform payloads to DTO classes
    }),
  );

  // CORS — allow frontend origin in development
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true, // required for cookies to be sent cross-origin
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Swagger / OpenAPI documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Image Generator API')
    .setDescription('REST API for the Book Illustration Pipeline application')
    .setVersion('1.0')
    .addCookieAuth('auth_token')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  logger.log(`Server running on http://localhost:${port}`);
  logger.log(`Swagger docs at http://localhost:${port}/api-docs`);
}

bootstrap().catch((err) => {
  new Logger('Bootstrap').error(err);
});
