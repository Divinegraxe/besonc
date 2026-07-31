import { Module } from '@nestjs/common';
import { PricingModule } from './pricing/pricing.module';
import { HealthModule } from './health/health.module';
@Module({ imports: [PricingModule, HealthModule] })
export class AppModule {}
