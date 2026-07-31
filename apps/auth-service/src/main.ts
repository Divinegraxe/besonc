import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app/app.module';
import { initPaymentLib } from '@besonc/shared-payment';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('auth');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors({ origin: '*' });

  initPaymentLib();

  const port = process.env['PORT'] ?? 3001;
  await app.listen(port);
  Logger.log(`🔐 Auth Service running on http://localhost:${port}/auth`, 'Bootstrap');
}

bootstrap();
