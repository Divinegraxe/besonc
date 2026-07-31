import { Module } from '@nestjs/common';
import { CatalogueModule } from './catalogue/catalogue.module';
import { HealthModule } from './health/health.module';

@Module({ imports: [CatalogueModule, HealthModule] })
export class AppModule {}
