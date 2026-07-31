import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app/app.module';
import { initPaymentLib } from '@besonc/shared-payment';

async function bootstrap() {
  initPaymentLib();
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('payments');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: '*' });
  const port = process.env['PORT'] ?? 3007;
  await app.listen(port);
  Logger.log(`💳 Payment Service running on http://localhost:${port}/payments`, 'Bootstrap');
}
bootstrap();
