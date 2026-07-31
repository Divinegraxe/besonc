import { Module } from '@nestjs/common';
import { PromoModule } from './promos/promos.module';
import { HealthModule } from './health/health.module';

@Module({ imports: [PromoModule, HealthModule] })
export class AppModule {}
