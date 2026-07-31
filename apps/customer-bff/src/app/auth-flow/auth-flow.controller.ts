import { Body, Controller, Post } from '@nestjs/common';
import { IsOptional, IsString, Matches } from 'class-validator';
import { AuthFlowService } from './auth-flow.service';

class OtpRequestDto {
  @IsString() @Matches(/^(\+233|0)\d{9}$/) phone!: string;
  @IsOptional() @IsString() deviceId?: string;
}

class OtpVerifyDto {
  @IsString() @Matches(/^(\+233|0)\d{9}$/) phone!: string;
  @IsString() @Matches(/^\d{6}$/) otp!: string;
  @IsOptional() @IsString() deviceId?: string;
}

@Controller()
export class AuthFlowController {
  constructor(private readonly flow: AuthFlowService) {}

  @Post('auth/otp')
  async otp(@Body() dto: OtpRequestDto) {
    return this.flow.requestOtp(dto.phone, dto.deviceId);
  }

  @Post('auth/verify')
  async verify(@Body() dto: OtpVerifyDto) {
    return this.flow.verifyOtp(dto.phone, dto.otp, dto.deviceId);
  }
}
