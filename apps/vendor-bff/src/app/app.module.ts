import { Module } from '@nestjs/common';
import { Vendor-bffModule } from './bff/vendor/bff/vendor.module';
import { HealthModule } from './health/health.module';

@Module({ imports: [Vendor-bffModule, HealthModule] })
export class AppModule {}
