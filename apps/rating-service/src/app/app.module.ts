import { Module } from '@nestjs/common';
import { RatingModule } from './ratings/ratings.module';
import { HealthModule } from './health/health.module';

@Module({ imports: [RatingModule, HealthModule] })
export class AppModule {}
