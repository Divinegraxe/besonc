import { Injectable, NotFoundException, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '@besonc/shared-db';
import { ServiceCode } from '@besonc/shared-types';

export type VendorType = 'business' | 'individual';

export interface VendorHours {
  dayOfWeek: number; // 0=Sunday
  open: string;       // "HH:mm"
  close: string;      // "HH:mm"
  closed: boolean;
}

export interface Vendor {
  id: string;        // YDV-YYYY-NNNN
  name: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  type: VendorType;
  city: string;       // CC / AC / etc.
  category: ServiceCode;
  rating: number;     // 0-5
  reviewCount: number;
  isOpen: boolean;
  hours: VendorHours[];
  prepTimeMinutes: number;
  minimumOrderPesewas: number;
  deliveryFeePesewas: number;
  address: string;
  coordinates: { lat: number; lng: number };
  phone: string;
  createdAt: string;
}

/**
 * Vendor Service — backed by Postgres via Prisma.
 *
 * The external API is unchanged from the in-memory version: same
 * method names, same return types. The controllers and other services
 * don't need to know the storage layer changed.
 *
 * `isOpen` is computed at read time (based on current time vs the
 * vendor's `hours` rows) — we don't store it in the DB.
 */
@Injectable()
export class VendorService implements OnModuleInit {
  private readonly logger = new Logger(VendorService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    // Lightweight smoke check that the DB is reachable + has data.
    // The seed script (`pnpm run db:seed:catalogue`) populates the
    // initial 5 vendors; this just logs if it's empty.
    const count = await this.prisma.vendor.count();
    this.logger.log(`Catalogue DB connected. ${count} vendors in store.`);
    if (count === 0) {
      this.logger.warn(
        'Catalogue DB is empty. Run `pnpm run db:seed:catalogue` to insert the 5 demo vendors.',
      );
    }
  }

  async create(v: Omit<Vendor, 'isOpen' | 'createdAt' | 'hours'> & { hours: VendorHours[] }): Promise<Vendor> {
    const created = await this.prisma.vendor.create({
      data: {
        id: v.id,
        name: v.name,
        description: v.description,
        logoUrl: v.logoUrl,
        bannerUrl: v.bannerUrl,
        type: v.type,
        city: v.city,
        category: v.category,
        rating: v.rating,
        reviewCount: v.reviewCount,
        prepTimeMinutes: v.prepTimeMinutes,
        minimumOrderPesewas: v.minimumOrderPesewas,
        deliveryFeePesewas: v.deliveryFeePesewas,
        address: v.address,
        latitude: v.coordinates.lat,
        longitude: v.coordinates.lng,
        phone: v.phone,
        hours: {
          create: v.hours.map((h) => ({
            dayOfWeek: h.dayOfWeek,
            openTime: h.open,
            closeTime: h.close,
            isClosed: h.closed,
          })),
        },
      },
      include: { hours: true },
    });
    return this.toDomain(created);
  }

  async getById(id: string): Promise<Vendor | null> {
    const row = await this.prisma.vendor.findUnique({
      where: { id },
      include: { hours: { orderBy: { dayOfWeek: 'asc' } } },
    });
    if (!row) return null;
    return this.toDomain(row);
  }

  async listByCategory(category: ServiceCode, onlyOpen = false): Promise<Vendor[]> {
    const rows = await this.prisma.vendor.findMany({
      where: { category, isActive: true },
      include: { hours: { orderBy: { dayOfWeek: 'asc' } } },
      orderBy: { name: 'asc' },
    });
    const vendors = rows.map((r) => this.toDomain(r));
    return onlyOpen ? vendors.filter((v) => v.isOpen) : vendors;
  }

  async listAll(onlyOpen = false): Promise<Vendor[]> {
    const rows = await this.prisma.vendor.findMany({
      where: { isActive: true },
      include: { hours: { orderBy: { dayOfWeek: 'asc' } } },
      orderBy: { name: 'asc' },
    });
    const vendors = rows.map((r) => this.toDomain(r));
    return onlyOpen ? vendors.filter((v) => v.isOpen) : vendors;
  }

  async searchByName(query: string): Promise<Vendor[]> {
    const q = query.trim();
    if (!q) return [];
    const rows = await this.prisma.vendor.findMany({
      where: {
        isActive: true,
        name: { contains: q, mode: 'insensitive' },
      },
      include: { hours: { orderBy: { dayOfWeek: 'asc' } } },
      orderBy: { name: 'asc' },
    });
    return rows.map((r) => this.toDomain(r));
  }

  // ── Mapping helpers ────────────────────────────────────────────────

  private toDomain(row: {
    id: string;
    name: string;
    description: string | null;
    logoUrl: string | null;
    bannerUrl: string | null;
    type: 'business' | 'individual';
    city: string;
    category: ServiceCode;
    rating: any; // Prisma returns Decimal
    reviewCount: number;
    prepTimeMinutes: number;
    minimumOrderPesewas: number;
    deliveryFeePesewas: number;
    address: string;
    latitude: any;
    longitude: any;
    phone: string;
    createdAt: Date;
    hours: { dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }[];
  }): Vendor {
    const hours: VendorHours[] = row.hours.map((h) => ({
      dayOfWeek: h.dayOfWeek,
      open: h.openTime,
      close: h.closeTime,
      closed: h.isClosed,
    }));
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      logoUrl: row.logoUrl ?? undefined,
      bannerUrl: row.bannerUrl ?? undefined,
      type: row.type,
      city: row.city,
      category: row.category,
      rating: Number(row.rating),
      reviewCount: row.reviewCount,
      isOpen: this.isCurrentlyOpen(hours),
      hours,
      prepTimeMinutes: row.prepTimeMinutes,
      minimumOrderPesewas: row.minimumOrderPesewas,
      deliveryFeePesewas: row.deliveryFeePesewas,
      address: row.address,
      coordinates: { lat: Number(row.latitude), lng: Number(row.longitude) },
      phone: row.phone,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private isCurrentlyOpen(hours: VendorHours[]): boolean {
    const now = new Date();
    const day = now.getUTCDay(); // use UTC for consistency across services
    const minutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    const today = hours.find((h) => h.dayOfWeek === day);
    if (!today || today.closed) return false;
    const [oh, om] = today.open.split(':').map(Number);
    const [ch, cm] = today.close.split(':').map(Number);
    return minutes >= oh * 60 + om && minutes <= ch * 60 + cm;
  }
}
