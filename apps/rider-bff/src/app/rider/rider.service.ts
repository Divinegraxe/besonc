import { Injectable, Logger } from '@nestjs/common';
import { CONFIG } from '@besonc/shared-config';

/**
 * Rider BFF — orchestrates for the rider web/mobile apps.
 *
 * - /bff/rider/dashboard/:riderId  — earnings, today's deliveries, rating
 * - /bff/rider/jobs/available     — current available jobs (delegates to dispatch)
 * - /bff/rider/orders/:riderId    — assigned orders (with tracking)
 * - /bff/rider/orders/:id/transition — state changes (picked_up, delivered, etc.)
 * - /bff/rider/heartbeat          — POST lat/lng (delegates to tracking)
 */
@Injectable()
export class RiderService {
  private readonly logger = new Logger(RiderService.name);

  private async fetchJson(url: string, init?: RequestInit): Promise<any> {
    const res = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers as any) },
    });
    const data = await res.json();
    if (!res.ok || data.success === false) {
      throw new Error(data.error?.message ?? `HTTP ${res.status} from ${url}`);
    }
    return data.data;
  }

  async getDashboard(riderId: string): Promise<{
    riderId: string;
    today: { deliveries: number; earningsPesewas: number; tipsPesewas: number; pendingPayout: number };
    rating: number;
    totalDeliveries: number;
    status: string;
  }> {
    const [summary, rider, tips] = await Promise.all([
      this.fetchJson(`${CONFIG.endpoints.dispatchService}/dispatch/riders/${riderId}/daily-summary`).catch(() => null),
      this.fetchJson(`${CONFIG.endpoints.dispatchService}/dispatch/riders/${riderId}`).catch(() => null),
      this.fetchJson(`${CONFIG.endpoints.tipService}/tips/rider/${riderId}/total`).catch(() => null),
    ]);
    return {
      riderId,
      today: {
        deliveries: summary?.todayDeliveries ?? 0,
        earningsPesewas: summary?.todayEarningsPesewas ?? 0,
        tipsPesewas: tips?.totalPesewas ?? 0,
        pendingPayout: summary?.pendingPayoutPesewas ?? 0,
      },
      rating: rider?.rating ?? 0,
      totalDeliveries: rider?.totalDeliveries ?? 0,
      status: rider?.status ?? 'offline',
    };
  }

  async getAvailableJobs(city?: string, limit = 20): Promise<any[]> {
    const url = `${CONFIG.endpoints.dispatchService}/dispatch/jobs/available${city ? `?city=${city}` : ''}?limit=${limit}`;
    return this.fetchJson(url);
  }

  async getMyOrders(riderId: string, limit = 20): Promise<any[]> {
    return this.fetchJson(`${CONFIG.endpoints.orderService}/orders/by-rider/${riderId}?limit=${limit}`);
  }

  async acceptJob(riderId: string, orderId: string): Promise<any> {
    return this.fetchJson(
      `${CONFIG.endpoints.dispatchService}/dispatch/riders/${riderId}/accept`,
      { method: 'POST', body: JSON.stringify({ orderId }) },
    );
  }

  async transitionOrder(orderId: string, newState: string, riderId: string): Promise<any> {
    return this.fetchJson(
      `${CONFIG.endpoints.orderService}/orders/${orderId}/transition`,
      {
        method: 'PATCH',
        body: JSON.stringify({ newState, riderId, actor: `rider:${riderId}` }),
      },
    );
  }

  /**
   * Rider app sends GPS pings every 5s. Just forward to tracking.
   */
  async sendPing(ping: { riderId: string; latitude: number; longitude: number; heading?: number; speedKmh?: number; batteryPct?: number; orderId?: string }): Promise<any> {
    return this.fetchJson(
      `${CONFIG.endpoints.trackingService}/tracking/ping`,
      { method: 'POST', body: JSON.stringify(ping) },
    );
  }

  async setStatus(riderId: string, status: string): Promise<any> {
    return this.fetchJson(
      `${CONFIG.endpoints.dispatchService}/dispatch/riders/${riderId}/status`,
      { method: 'PATCH', body: JSON.stringify({ status }) },
    );
  }
}
