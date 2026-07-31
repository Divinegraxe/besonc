import { Module } from '@nestjs/common';
import { TrackingModule } from './tracking/tracking.module';
import { HealthModule } from './health/health.module';

@Module({ imports: [TrackingModule, HealthModule] })
export class AppModule {}
