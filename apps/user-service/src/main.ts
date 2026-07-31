import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('users');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: '*' });

  const port = process.env['PORT'] ?? 3002;
  await app.listen(port);
  Logger.log(`👤 User Service running on http://localhost:${port}/users`, 'Bootstrap');
}

bootstrap();
