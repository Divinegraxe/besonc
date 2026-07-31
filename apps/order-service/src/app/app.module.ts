import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { OrderModule } from './order/order.module';
@Module({
  // HealthModule first so /orders/health is registered before
  // OrderController's @Get(':id') route.
  imports: [HealthModule, OrderModule],
})
export class AppModule {}
