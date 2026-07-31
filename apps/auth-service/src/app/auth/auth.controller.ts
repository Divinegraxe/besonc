import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { IsOptional, IsString, Matches } from 'class-validator';

class RequestOtpDto {
  @IsString()
  @Matches(/^(\+233|0)\d{9}$/, { message: 'Must be a valid Ghana phone number' })
  phone!: string;
}

class VerifyOtpDto {
  @IsString()
  @Matches(/^(\+233|0)\d{9}$/)
  phone!: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'OTP must be 6 digits' })
  otp!: string;

  @IsOptional()
  @IsString()
  deviceId?: string;
}

@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('otp')
  async requestOtp(@Body() dto: RequestOtpDto) {
    return this.auth.requestOtp(dto.phone);
  }

  @Post('verify')
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto.phone, dto.otp, dto.deviceId);
  }

  @Get('me')
  async me(@Req() req: Request) {
    // In Sprint 3, this will validate the JWT and return user info.
    return {
      success: true,
      data: {
        message: 'Auth Service is running. JWT validation coming in Sprint 3.',
        authHeader: req.headers['authorization'] ? 'present' : 'missing',
      },
    };
  }
}
