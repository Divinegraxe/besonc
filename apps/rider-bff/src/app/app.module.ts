import { Module } from '@nestjs/common';
import { Rider-bffModule } from './bff/rider/bff/rider.module';
import { HealthModule } from './health/health.module';

@Module({ imports: [Rider-bffModule, HealthModule] })
export class AppModule {}
