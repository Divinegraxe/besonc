import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('bff/rider');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: '*' });
  const port = process.env['PORT'] ?? 4002;
  await app.listen(port);
  Logger.log(`rider-bff running on http://localhost:${port}/bff/rider`, 'Bootstrap');
}

bootstrap();
