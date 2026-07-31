import { Module } from '@nestjs/common';
import { Admin-bffModule } from './bff/admin/bff/admin.module';
import { HealthModule } from './health/health.module';

@Module({ imports: [Admin-bffModule, HealthModule] })
export class AppModule {}
