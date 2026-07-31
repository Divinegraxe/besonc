import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('search');
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));
  app.enableCors({ origin: '*' });
  const port = process.env['PORT'] ?? 3014;
  await app.listen(port);
  Logger.log(`search-service running on http://localhost:${port}/search`, 'Bootstrap');
}

bootstrap();
