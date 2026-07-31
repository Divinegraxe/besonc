import { Module } from '@nestjs/common';
import { MediaModule } from './media/media.module';
import { HealthModule } from './health/health.module';
@Module({ imports: [MediaModule, HealthModule] })
export class AppModule {}
