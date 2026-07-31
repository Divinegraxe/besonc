import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { DispatchModule } from './dispatch/dispatch.module';

@Module({ imports: [DispatchModule, HealthModule] })
export class AppModule {}
