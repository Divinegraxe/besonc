import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { isValidGhanaPhone, normalizeGhanaPhone, shortId } from '@besonc/shared-utils';
import { sendSms, otpSms } from '@besonc/shared-notifications';
import type { ApiResponse } from '@besonc/shared-types';

interface OtpRecord {
  phone: string;
  otp: string;
  expiresAt: number;
  attempts: number;
}

/**
 * Auth Service — phone OTP + JWT issuance.
 *
 * Sprint 1-2 implementation: in-memory OTP store (replace with Redis in Sprint 3).
 * For now the otp is also returned in the dev response so the mobile app can
 * skip SMS in dev mode.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly otpStore = new Map<string, OtpRecord>();
  private readonly OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly OTP_MAX_ATTEMPTS = 5;

  constructor(private readonly jwtService: JwtService) {}

  async requestOtp(phone: string): Promise<ApiResponse<{ devOtp?: string }>> {
    if (!isValidGhanaPhone(phone)) {
      return {
        success: false,
        error: { code: 'INVALID_PHONE', message: 'Invalid Ghana phone number' },
      };
    }

    const normalized = normalizeGhanaPhone(phone);
    const otp = this.generateOtp();

    this.otpStore.set(normalized, {
      phone: normalized,
      otp,
      expiresAt: Date.now() + this.OTP_TTL_MS,
      attempts: 0,
    });

    // Send via Hubtel SMS
    try {
      await sendSms({ to: normalized, message: otpSms(otp) });
      this.logger.log(`OTP sent to ${normalized.slice(0, 6)}***`);
    } catch (err) {
      this.logger.error(`SMS failed: ${(err as Error).message}`);
      return {
        success: false,
        error: { code: 'SMS_FAILED', message: 'Failed to send OTP. Please try again.' },
      };
    }

    return {
      success: true,
      // DEV ONLY: return the OTP in the response so you can test without a real SIM
      data: { devOtp: process.env['NODE_ENV'] !== 'production' ? otp : undefined },
    };
  }

  async verifyOtp(
    phone: string,
    otp: string,
    deviceId?: string,
  ): Promise<ApiResponse<{ token: string; userId: string }>> {
    if (!isValidGhanaPhone(phone)) {
      return { success: false, error: { code: 'INVALID_PHONE', message: 'Invalid phone' } };
    }

    const normalized = normalizeGhanaPhone(phone);
    const record = this.otpStore.get(normalized);

    if (!record) {
      return { success: false, error: { code: 'NO_OTP', message: 'No OTP requested' } };
    }
    if (record.expiresAt < Date.now()) {
      this.otpStore.delete(normalized);
      return { success: false, error: { code: 'OTP_EXPIRED', message: 'OTP expired' } };
    }
    if (record.attempts >= this.OTP_MAX_ATTEMPTS) {
      this.otpStore.delete(normalized);
      return { success: false, error: { code: 'TOO_MANY_ATTEMPTS', message: 'Try again later' } };
    }
    if (record.otp !== otp) {
      record.attempts += 1;
      return { success: false, error: { code: 'WRONG_OTP', message: 'Wrong OTP' } };
    }

    // OTP verified — issue JWT
    this.otpStore.delete(normalized);

    // In Sprint 3, the Auth Service will look up or create the customer in User Service.
    // For Sprint 1-2, we return a temp userId.
    const userId = `YDC-${new Date().getFullYear()}-${shortId()}`;

    const token = this.jwtService.sign({
      sub: userId,
      phone: normalized,
      deviceId,
      iat: Math.floor(Date.now() / 1000),
    });

    return { success: true, data: { token, userId } };
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
