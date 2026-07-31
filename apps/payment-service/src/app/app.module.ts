import { Module } from '@nestjs/common';
import { PaymentModule } from './payment/payment.module';
import { HealthModule } from './health/health.module';
@Module({ imports: [PaymentModule, HealthModule] })
export class AppModule {}
