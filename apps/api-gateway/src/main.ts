import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app/app.module';

async function bootstrap() {
  // rawBody: true so the proxy can forward the original bytes to
  // upstream services (re-serialising `req.body` from the parsed JSON
  // was causing connection aborts on the upstream side).
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors({
    origin: '*', // Restrict in production
    credentials: true,
  });

  const port = process.env['PORT'] ?? 3000;
  await app.listen(port);
  Logger.log(`🚀 API Gateway running on http://localhost:${port}/api/v1`, 'Bootstrap');
}

bootstrap();
