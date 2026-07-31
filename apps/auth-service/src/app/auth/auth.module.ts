import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { optionalEnv } from '@besonc/shared-utils';

@Module({
  imports: [
    JwtModule.register({
      secret: optionalEnv('JWT_SECRET', 'besonc-dev-secret-change-in-production'),
      signOptions: { expiresIn: '30d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
