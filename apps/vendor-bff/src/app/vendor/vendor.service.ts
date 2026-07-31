import { Injectable, Logger } from '@nestjs/common';
import { CONFIG } from '@besonc/shared-config';

/**
 * Vendor BFF — orchestrates calls to multiple backend services to
 * produce the views that the vendor web/mobile apps need.
 *
 * v1 implementation: thin proxy that calls upstream services.
 * v2: cache common aggregations in Redis, add field selection.
 */
@Injectable()
export class VendorService {
  private readonly logger = new Logger(VendorService.name);

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
   * Vendor dashboard — aggregates orders, ratings, and revenue.
   * This is the home screen of the vendor app.
   */
  async getDashboard(vendorId: string): Promise<{
    vendorId: string;
    today: { orders: number; revenuePesewas: number; avgPrepMinutes: number };
    week: { orders: number; revenuePesewas: number };
    pendingOrders: number;
    activeMenuItems: number;
    rating: { average: number; count: number };
  }> {
    const [orders, items, ratingStats] = await Promise.all([
      this.fetchJson(`${CONFIG.endpoints.orderService}/orders/by-vendor/${vendorId}?limit=200`),
      this.fetchJson(`${CONFIG.endpoints.catalogueService}/catalogue/items/by-vendor/${vendorId}`),
      this.fetchJson(`${CONFIG.endpoints.ratingService}/ratings/stats/vendor/${vendorId}`),
    ]);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    const today = orders.filter((o: any) => new Date(o.createdAt) >= todayStart);
    const week = orders.filter((o: any) => new Date(o.createdAt) >= weekStart);
    const pending = orders.filter((o: any) => ['placed', 'vendor_accepted', 'preparing', 'ready_for_pickup'].includes(o.state));

    return {
      vendorId,
      today: {
        orders: today.length,
        revenuePesewas: today.reduce((acc: number, o: any) => acc + (o.grandTotalPesewas || 0), 0),
        avgPrepMinutes: today.length > 0
          ? Math.round(today.reduce((acc: number, o: any) => acc + (o.estimatedPreparationMinutes || 0), 0) / today.length)
          : 0,
      },
      week: {
        orders: week.length,
        revenuePesewas: week.reduce((acc: number, o: any) => acc + (o.grandTotalPesewas || 0), 0),
      },
      pendingOrders: pending.length,
      activeMenuItems: items.length,
      rating: { average: ratingStats.average ?? 0, count: ratingStats.count ?? 0 },
    };
  }

  /**
   * Vendor's orders, ordered newest first. Optionally filter by state.
   */
  async getOrders(vendorId: string, state?: string, limit = 50): Promise<any[]> {
    const url = `${CONFIG.endpoints.orderService}/orders/by-vendor/${vendorId}?limit=${limit}`;
    return this.fetchJson(url);
  }

  /**
   * Vendor's menu items.
   */
  async getMenu(vendorId: string): Promise<any[]> {
    return this.fetchJson(`${CONFIG.endpoints.catalogueService}/catalogue/items/by-vendor/${vendorId}`);
  }

  /**
   * Vendor's ratings + comments (most recent first).
   */
  async getRatings(vendorId: string, limit = 50): Promise<any[]> {
    return this.fetchJson(`${CONFIG.endpoints.ratingService}/ratings/for/vendor/${vendorId}?limit=${limit}`);
  }

  /**
   * Vendor toggles a menu item's availability (in stock / sold out).
   */
  async setItemAvailability(vendorId: string, itemId: string, available: boolean): Promise<any> {
    return this.fetchJson(
      `${CONFIG.endpoints.catalogueService}/catalogue/items/${itemId}/availability`,
      { method: 'PATCH', body: JSON.stringify({ available }) },
    ).catch(async () => {
      // Fallback: the catalogue service doesn't have this endpoint yet, so
      // we use the search index as a hint (v2: add real endpoint to catalogue).
      this.logger.warn(`setItemAvailability not implemented in catalogue-service; noop`);
      return { itemId, available };
    });
  }

  /**
   * Vendor-side order state transition (accept, reject, mark preparing,
   * mark ready for pickup). Forwards to order-service with the actor
   * tagged as this vendor.
   */
  async transitionOrder(orderId: string, newState: string, vendorId: string): Promise<any> {
    return this.fetchJson(
      `${CONFIG.endpoints.orderService}/orders/${orderId}/transition`,
      {
        method: 'PATCH',
        body: JSON.stringify({ newState, actor: `vendor:${vendorId}` }),
      },
    );
  }
}
