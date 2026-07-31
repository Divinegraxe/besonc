import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@besonc/shared-db';

export interface LocationPing {
  riderId: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speedKmh?: number;
  accuracyM?: number;
  batteryPct?: number;
  orderId?: string;
  occurredAt: string;
}

/**
 * Tracking Service — stores GPS pings from riders, exposes the latest
 * location for any given order or rider.
 *
 * v1: write to Postgres, read from Postgres. The customer app polls
 *     this every 10s to show "where's my rider" on the map.
 * v2: cache latest ping in Redis (TTL 1 hour), stream new pings to
 *     customer apps via WebSocket. Out of scope for Sprint 5.
 */
@Injectable()
export class TrackingService implements OnModuleInit {
  private readonly logger = new Logger(TrackingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    const count = await this.prisma.riderLocationPing.count();
    this.logger.log(`Tracking DB connected. ${count} pings in store.`);
  }

  /**
   * Record a GPS ping. Called by the rider app every 5-10 seconds
   * while on an active delivery.
   */
  async recordPing(ping: LocationPing): Promise<{ id: string }> {
    const row = await this.prisma.riderLocationPing.create({
      data: {
        riderId: ping.riderId,
        latitude: ping.latitude,
        longitude: ping.longitude,
        heading: ping.heading,
        speedKmh: ping.speedKmh,
        accuracyM: ping.accuracyM,
        batteryPct: ping.batteryPct,
        orderId: ping.orderId,
        occurredAt: ping.occurredAt ? new Date(ping.occurredAt) : new Date(),
      },
    });
    return { id: row.id };
  }

  /**
   * Get the latest known location for a rider. Used by the order
   * tracking screen on the customer app.
   */
  async getRiderLocation(riderId: string): Promise<LocationPing | null> {
    const row = await this.prisma.riderLocationPing.findFirst({
      where: { riderId },
      orderBy: { occurredAt: 'desc' },
    });
    if (!row) return null;
    return {
      riderId: row.riderId,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      heading: row.heading ? Number(row.heading) : undefined,
      speedKmh: row.speedKmh ? Number(row.speedKmh) : undefined,
      accuracyM: row.accuracyM ? Number(row.accuracyM) : undefined,
      batteryPct: row.batteryPct ?? undefined,
      orderId: row.orderId ?? undefined,
      occurredAt: row.occurredAt.toISOString(),
    };
  }

  /**
   * Get the rider's location for a specific order. Returns the latest
   * ping tagged with that orderId. Used by the customer app to show
   * "your rider is here" on the map.
   */
  async getOrderLocation(orderId: string): Promise<LocationPing | null> {
    const row = await this.prisma.riderLocationPing.findFirst({
      where: { orderId },
      orderBy: { occurredAt: 'desc' },
    });
    if (!row) return null;
    return {
      riderId: row.riderId,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      heading: row.heading ? Number(row.heading) : undefined,
      speedKmh: row.speedKmh ? Number(row.speedKmh) : undefined,
      accuracyM: row.accuracyM ? Number(row.accuracyM) : undefined,
      batteryPct: row.batteryPct ?? undefined,
      orderId: row.orderId ?? undefined,
      occurredAt: row.occurredAt.toISOString(),
    };
  }

  /**
   * Get the last N pings for a rider. Used to draw a trail on the map.
   */
  async getRiderTrail(riderId: string, limit = 100): Promise<LocationPing[]> {
    const rows = await this.prisma.riderLocationPing.findMany({
      where: { riderId },
      orderBy: { occurredAt: 'desc' },
      take: limit,
    });
    return rows.map((r) => ({
      riderId: r.riderId,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      heading: r.heading ? Number(r.heading) : undefined,
      speedKmh: r.speedKmh ? Number(r.speedKmh) : undefined,
      accuracyM: r.accuracyM ? Number(r.accuracyM) : undefined,
      batteryPct: r.batteryPct ?? undefined,
      orderId: r.orderId ?? undefined,
      occurredAt: r.occurredAt.toISOString(),
    }));
  }

  /**
   * Compute a simple ETA (minutes) from a rider's current location to a
   * destination. Uses straight-line distance + 30 km/h average speed
   * for Cape Coast urban. v2 will use Google Maps Distance Matrix.
   */
  async computeEtaMinutes(riderId: string, destLat: number, destLng: number): Promise<{ etaMinutes: number; distanceKm: number } | null> {
    const loc = await this.getRiderLocation(riderId);
    if (!loc) return null;
    const distanceKm = haversineKm(loc.latitude, loc.longitude, destLat, destLng);
    const etaMinutes = Math.round((distanceKm / 30) * 60); // 30 km/h
    return { etaMinutes, distanceKm: Math.round(distanceKm * 10) / 10 };
  }
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
