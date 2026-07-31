import { Module } from '@nestjs/common';
import { ChatModule } from './chat/chat.module';
import { HealthModule } from './health/health.module';

@Module({ imports: [ChatModule, HealthModule] })
export class AppModule {}
