import { Module } from '@nestjs/common';
import { TipModule } from './tips/tips.module';
import { HealthModule } from './health/health.module';

@Module({ imports: [TipModule, HealthModule] })
export class AppModule {}
