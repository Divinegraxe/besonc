import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { UserModule } from './user/user.module';

@Module({
  // HealthModule first so /<prefix>/health is registered BEFORE the
  // feature controller's `@Get(':id')` route. Otherwise NestJS matches
  // `/users/health` against `:id = 'health'` and returns NOT_FOUND.
  imports: [HealthModule, UserModule],
})
export class AppModule {}
