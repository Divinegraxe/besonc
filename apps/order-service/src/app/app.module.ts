import { Module } from '@nestjs/common';
import { OrderModule } from './order/order.module';
import { HealthModule } from './health/health.module';
@Module({ imports: [OrderModule, HealthModule] })
export class AppModule {}
