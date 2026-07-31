import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('bff/customer');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: '*' });

  const port = process.env['PORT'] ?? 4000;
  await app.listen(port);
  Logger.log(`🛒 Customer BFF running on http://localhost:${port}/bff/customer`, 'Bootstrap');
}

bootstrap();
