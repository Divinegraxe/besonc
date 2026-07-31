import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { ProxyModule } from './proxy/proxy.module';

@Module({
  imports: [HealthModule, ProxyModule],
})
export class AppModule {}
