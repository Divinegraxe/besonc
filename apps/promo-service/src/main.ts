import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('promos');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: '*' });
  const port = process.env['PORT'] ?? 3017;
  await app.listen(port);
  Logger.log(`promo-service running on http://localhost:${port}/promos`, 'Bootstrap');
}

bootstrap();
