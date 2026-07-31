import { Module } from '@nestjs/common';
import { AuthFlowModule } from './auth-flow/auth-flow.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [AuthFlowModule, HealthModule],
})
export class AppModule {}
