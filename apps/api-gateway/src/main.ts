import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
