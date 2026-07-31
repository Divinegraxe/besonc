import { Injectable, Logger } from '@nestjs/common';
import { CONFIG } from '@besonc/shared-config';
import type { ApiResponse } from '@besonc/shared-types';

/**
 * Customer BFF — orchestrates the login flow across Auth + User services.
 * Mobile app calls BFF; BFF calls downstream services.
 */
@Injectable()
export class AuthFlowService {
  private readonly logger = new Logger(AuthFlowService.name);

  async requestOtp(phone: string, deviceId?: string): Promise<ApiResponse<{ devOtp?: string }>> {
    // BFF adds the device-id header for the Auth service.
    return this.callAuth<{ devOtp?: string }>('/otp', 'POST', { phone, deviceId });
  }

  async verifyOtp(phone: string, otp: string, deviceId?: string): Promise<ApiResponse<{ token: string; userId: string }>> {
    return this.callAuth<{ token: string; userId: string }>('/verify', 'POST', { phone, otp, deviceId });
  }

  private async callAuth<T>(path: string, method: string, body: unknown): Promise<ApiResponse<T>> {
    const url = `${CONFIG.endpoints.authService}${path}`;
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const json = (await res.json()) as ApiResponse<T>;
      return json;
    } catch (err) {
      this.logger.error(`Auth service call failed: ${(err as Error).message}`);
      return { success: false, error: { code: 'UPSTREAM_ERROR', message: 'Auth service unavailable' } };
    }
  }
}
