import { Injectable, Logger, OnModuleInit, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@besonc/shared-db';
import { RiderStatus } from '@prisma/client';

export interface Rider {
  id: string;
  name: string;
  phone: string;
  email?: string;
  vehicleType: 'bicycle' | 'motorcycle' | 'car' | 'walking';
  vehiclePlate?: string;
  city: string;
  status: RiderStatus;
  isVerified: boolean;
  isActive: boolean;
  rating: number;
  totalDeliveries: number;
  lastSeenAt?: string;
  createdAt: string;
}

export interface AvailableJob {
  orderId: string;
  vendorName: string;
  pickupAddress: { latitude: number; longitude: number; areaName: string };
  deliveryAddress: { latitude: number; longitude: number; areaName: string };
  itemTotalPesewas: number;
  estimatedDeliveryAt?: string;
  prepTimeMinutes: number;
  distanceKm: number;
  serviceCode: string;
}

/**
 * Dispatch Service — rider management + order-rider matching.
 *
 * v1 (Cape Coast): simple first-come-first-served matching. Riders see
 * "available jobs" (orders in ready_for_pickup state) and accept the
 * ones they want. No auto-dispatch, no ML ranking.
 *
 * v2 (Sprint 7+): add auto-dispatch (closest rider wins), preference
 * matching (vehicle type, rider rating), and surge pricing.
 */
@Injectable()
export class DispatchService implements OnModuleInit {
  private readonly logger = new Logger(DispatchService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    const riders = await this.prisma.rider.count();
    this.logger.log(`Dispatch DB connected. ${riders} riders registered.`);
    if (riders === 0) {
      this.logger.warn('No riders. Run `pnpm run db:seed:dispatch` to add 5 demo riders.');
    }
  }

  // ── Rider CRUD ────────────────────────────────────────────────────

  async createRider(input: {
    name: string;
    phone: string;
    email?: string;
    vehicleType?: 'bicycle' | 'motorcycle' | 'car' | 'walking';
    vehiclePlate?: string;
    city?: string;
    mobileMoneyPhone?: string;
    mobileMoneyProvider?: string;
  }): Promise<Rider> {
    // Generate a YDR-YYYY-NNNN id. For v1 we just use the sequence.
    const year = new Date().getFullYear();
    const count = await this.prisma.rider.count({
      where: { id: { startsWith: `YDR-${year}-` } },
    });
    const id = `YDR-${year}-${String(count + 1).padStart(4, '0')}`;

    const rider = await this.prisma.rider.create({
      data: {
        id,
        name: input.name,
        phone: input.phone,
        email: input.email,
        vehicleType: (input.vehicleType as any) ?? 'motorcycle',
        vehiclePlate: input.vehiclePlate,
        city: input.city ?? 'CC',
        mobileMoneyPhone: input.mobileMoneyPhone,
        mobileMoneyProvider: input.mobileMoneyProvider,
        isVerified: false, // requires Smile ID KYC
      },
    });
    return this.toDomain(rider);
  }

  async getRider(id: string): Promise<Rider | null> {
    const rider = await this.prisma.rider.findUnique({ where: { id } });
    return rider ? this.toDomain(rider) : null;
  }

  async getRiderByPhone(phone: string): Promise<Rider | null> {
    const rider = await this.prisma.rider.findUnique({ where: { phone } });
    return rider ? this.toDomain(rider) : null;
  }

  async listRiders(filters?: { city?: string; status?: RiderStatus; isActive?: boolean }, limit = 100): Promise<Rider[]> {
    const rows = await this.prisma.rider.findMany({
      where: {
        ...(filters?.city ? { city: filters.city } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.isActive !== undefined ? { isActive: filters.isActive } : {}),
      },
      orderBy: [{ rating: 'desc' }, { totalDeliveries: 'desc' }],
      take: limit,
    });
    return rows.map((r) => this.toDomain(r));
  }

  async updateRiderStatus(riderId: string, status: RiderStatus): Promise<Rider> {
    const rider = await this.prisma.rider.update({
      where: { id: riderId },
      data: { status, lastSeenAt: new Date() },
    });
    return this.toDomain(rider);
  }

  async markKycVerified(riderId: string, smileIdId: string, ghanaCardNumber: string): Promise<Rider> {
    const rider = await this.prisma.rider.update({
      where: { id: riderId },
      data: { isVerified: true, smileIdId, ghanaCardNumber, smileIdStatus: 'verified' },
    });
    return this.toDomain(rider);
  }

  async incrementDeliveries(riderId: string): Promise<void> {
    await this.prisma.rider.update({
      where: { id: riderId },
      data: { totalDeliveries: { increment: 1 } },
    });
  }

  // ── Available jobs (for the rider app) ───────────────────────────

  /**
   * Returns orders in 'ready_for_pickup' state. Sorted by estimated
   * delivery time so the most urgent ones float to the top.
   *
   * v1: just returns them. v2 (Sprint 7+): filter by rider's
   * vehicle type, city, distance to vendor, etc.
   */
  async listAvailableJobs(filters?: { city?: string; limit?: number }): Promise<AvailableJob[]> {
    const limit = filters?.limit ?? 50;
    // We pull from the order-service via Prisma directly. In a true
    // microservice world we'd call order-service over HTTP, but for
    // v1 (one team, one DB) it's simpler and faster to query directly.
    const rows = await this.prisma.order.findMany({
      where: { state: 'ready_for_pickup' },
      orderBy: { estimatedDeliveryAt: 'asc' },
      take: limit,
      include: { items: { take: 1 }, deliveryAddress: true },
    });
    return rows.map((o) => ({
      orderId: o.id,
      vendorName: '(see items)', // we don't have vendor name in order
      pickupAddress: { latitude: 0, longitude: 0, areaName: 'vendor' },
      deliveryAddress: {
        latitude: Number(o.deliveryAddress.latitude),
        longitude: Number(o.deliveryAddress.longitude),
        areaName: o.deliveryAddress.areaName,
      },
      itemTotalPesewas: o.itemTotalPesewas,
      estimatedDeliveryAt: o.estimatedDeliveryAt?.toISOString(),
      prepTimeMinutes: o.estimatedPreparationMinutes,
      distanceKm: 0, // would compute via Google Maps Routes API
      serviceCode: o.service,
    }));
  }

  /**
   * Rider accepts a job. Does two things atomically (best-effort):
   *   1. Sets the rider to on_delivery (in dispatch-service's DB).
   *   2. Calls order-service to transition the order from
   *      ready_for_pickup -> rider_assigned, with this riderId.
   *
   * If the order-service call fails (e.g. the order is in a different
   * state, or order-service is down), the rider status change is
   * rolled back so we don't have a "rider on delivery but no order".
   */
  async acceptJob(riderId: string, orderId: string): Promise<{ rider: Rider; orderId: string; orderTransitioned: boolean }> {
    const rider = await this.prisma.rider.findUnique({ where: { id: riderId } });
    if (!rider) throw new NotFoundException(`Rider ${riderId} not found`);
    if (rider.status !== 'available') {
      throw new BadRequestException(`Rider is ${rider.status}, not available`);
    }
    if (!rider.isVerified) {
      throw new BadRequestException('Rider is not KYC-verified');
    }
    if (!rider.isActive) {
      throw new BadRequestException('Rider account is deactivated');
    }
    // Mark rider on_delivery first
    const updatedRider = await this.updateRiderStatus(riderId, 'on_delivery');

    // Call order-service to transition the order
    let orderTransitioned = false;
    try {
      const orderServiceUrl = process.env['ORDER_SERVICE_URL'] ?? 'http://localhost:3004';
      const res = await fetch(`${orderServiceUrl}/orders/${orderId}/transition`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newState: 'rider_assigned', riderId, actor: `rider:${riderId}` }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        orderTransitioned = true;
        // Increment total deliveries counter (we count on accept, not on deliver, for v1)
        await this.incrementDeliveries(riderId);
      } else {
        // Order transition refused — roll back rider status
        await this.updateRiderStatus(riderId, 'available');
        throw new BadRequestException(`Order transition refused: ${data.error?.message ?? 'unknown'}`);
      }
    } catch (err) {
      // Network or other error — roll back rider status
      await this.updateRiderStatus(riderId, 'available');
      throw err;
    }

    return {
      rider: updatedRider,
      orderId,
      orderTransitioned,
    };
  }

  // ── Daily summary (for the rider app home screen) ─────────────────

  async getRiderDailySummary(riderId: string): Promise<{
    riderId: string;
    todayDeliveries: number;
    todayEarningsPesewas: number;
    todayTipsPesewas: number;
    pendingPayoutPesewas: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // We don't have a delivery-record table yet (Sprint 5+), so we
    // just count completed orders assigned to this rider today.
    const completedToday = await this.prisma.order.count({
      where: {
        riderId,
        state: 'delivered',
        deliveredAt: { gte: today },
      },
    });
    // Earnings: we'd join with payment-service's ledger, but for v1
    // we just return 0 and let the rider app query payment-service
    // for the real number.
    return {
      riderId,
      todayDeliveries: completedToday,
      todayEarningsPesewas: 0,
      todayTipsPesewas: 0,
      pendingPayoutPesewas: 0,
    };
  }

  // ── Mapping ───────────────────────────────────────────────────────

  private toDomain(r: any): Rider {
    return {
      id: r.id,
      name: r.name,
      phone: r.phone,
      email: r.email ?? undefined,
      vehicleType: r.vehicleType,
      vehiclePlate: r.vehiclePlate ?? undefined,
      city: r.city,
      status: r.status,
      isVerified: r.isVerified,
      isActive: r.isActive,
      rating: Number(r.rating),
      totalDeliveries: r.totalDeliveries,
      lastSeenAt: r.lastSeenAt?.toISOString(),
      createdAt: r.createdAt.toISOString(),
    };
  }
}
