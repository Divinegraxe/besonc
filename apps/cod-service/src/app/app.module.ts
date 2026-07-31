import { Module } from '@nestjs/common';
import { CodModule } from './cod/cod.module';
import { HealthModule } from './health/health.module';

@Module({ imports: [CodModule, HealthModule] })
export class AppModule {}
