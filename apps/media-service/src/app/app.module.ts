import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { MediaModule } from './media/media.module';
@Module({
  // HealthModule first so /media/health is registered before
  // MediaController's @Get(':id') route.
  imports: [HealthModule, MediaModule],
})
export class AppModule {}
