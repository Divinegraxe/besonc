import { Injectable, Logger } from '@nestjs/common';
import { CONFIG } from '@besonc/shared-config';

/**
 * Admin BFF — the back-office dashboard for the BESONC team.
 *
 * Aggregates: platform metrics, finance, KYC, dispute queue, system
 * health. The mobile-admin app and admin-web both consume this.
 */
@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

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

  /**
   * Platform dashboard — top-line numbers for the home screen.
   */
  async getDashboard(): Promise<{
    vendors: { total: number; active: number };
    riders: { total: number; available: number; onDelivery: number };
    orders: { today: number; week: number; total: number };
    revenue: { todayPesewas: number; weekPesewas: number; totalPesewas: number };
    ratings: { overall: number; count: number };
    pendingKyc: number;
  }> {
    const [vendors, riders, orders, codSummary] = await Promise.all([
      this.fetchJson(`${CONFIG.endpoints.catalogueService}/catalogue/vendors`).catch(() => []),
      this.fetchJson(`${CONFIG.endpoints.dispatchService}/dispatch/riders?limit=500`).catch(() => []),
      this.fetchJson(`${CONFIG.endpoints.orderService}/orders/by-customer/all?limit=500`).catch(() => []),
      this.fetchJson(`${CONFIG.endpoints.codService}/cod/daily-summary`).catch(() => null),
    ]);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    const today = orders.filter((o: any) => new Date(o.createdAt) >= todayStart);
    const week = orders.filter((o: any) => new Date(o.createdAt) >= weekStart);
    const delivered = orders.filter((o: any) => o.state === 'delivered');

    return {
      vendors: { total: vendors.length, active: vendors.filter((v: any) => v.isActive !== false).length },
      riders: {
        total: riders.length,
        available: riders.filter((r: any) => r.status === 'available').length,
        onDelivery: riders.filter((r: any) => r.status === 'on_delivery').length,
      },
      orders: { today: today.length, week: week.length, total: orders.length },
      revenue: {
        todayPesewas: today.reduce((a: number, o: any) => a + o.grandTotalPesewas, 0),
        weekPesewas: week.reduce((a: number, o: any) => a + o.grandTotalPesewas, 0),
        totalPesewas: delivered.reduce((a: number, o: any) => a + o.grandTotalPesewas, 0),
      },
      ratings: { overall: 0, count: 0 }, // computed in a future commit
      pendingKyc: riders.filter((r: any) => !r.isVerified).length,
    };
  }

  /**
   * Riders pending KYC verification.
   */
  async getPendingKycRiders(): Promise<any[]> {
    const riders = await this.fetchJson(`${CONFIG.endpoints.dispatchService}/dispatch/riders?limit=500`);
    return riders.filter((r: any) => !r.isVerified);
  }

  /**
   * Mark a rider's KYC as verified (delegates to dispatch).
   */
  async verifyRider(riderId: string, smileIdId: string, ghanaCardNumber: string): Promise<any> {
    return this.fetchJson(
      `${CONFIG.endpoints.dispatchService}/dispatch/riders/${riderId}/kyc/verify`,
      { method: 'POST', body: JSON.stringify({ smileIdId, ghanaCardNumber }) },
    );
  }

  /**
   * Today's COD summary.
   */
  async getCodToday(): Promise<any> {
    return this.fetchJson(`${CONFIG.endpoints.codService}/cod/daily-summary`);
  }

  /**
   * Rider outstanding (what each rider owes us).
   */
  async getRiderOutstanding(riderId: string): Promise<any> {
    return this.fetchJson(`${CONFIG.endpoints.codService}/cod/rider/${riderId}/outstanding`);
  }

  /**
   * System health — pings every service and returns the results.
   */
  async getSystemHealth(): Promise<Record<string, { status: string; latencyMs: number }>> {
    const services = [
      ['auth', CONFIG.endpoints.authService],
      ['users', CONFIG.endpoints.userService],
      ['catalogue', CONFIG.endpoints.catalogueService],
      ['orders', CONFIG.endpoints.orderService],
      ['dispatch', CONFIG.endpoints.dispatchService],
      ['tracking', CONFIG.endpoints.trackingService],
      ['payment', CONFIG.endpoints.paymentService],
      ['notification', CONFIG.endpoints.notificationService],
      ['media', CONFIG.endpoints.mediaService],
      ['pricing', CONFIG.endpoints.pricingService],
      ['cod', CONFIG.endpoints.codService],
      ['chat', CONFIG.endpoints.chatService],
      ['search', CONFIG.endpoints.searchService],
      ['ratings', CONFIG.endpoints.ratingService],
      ['tips', CONFIG.endpoints.tipService],
      ['promos', CONFIG.endpoints.promoService],
    ];
    const result: Record<string, { status: string; latencyMs: number }> = {};
    await Promise.all(services.map(async ([name, baseUrl]) => {
      const start = Date.now();
      try {
        const res = await fetch(`${baseUrl}/${name === 'users' ? 'users' : name}/health`, { signal: AbortSignal.timeout(2000) });
        const data = await res.json();
        result[name] = { status: data.status === 'ok' ? 'ok' : 'degraded', latencyMs: Date.now() - start };
      } catch {
        result[name] = { status: 'down', latencyMs: Date.now() - start };
      }
    }));
    return result;
  }
}
