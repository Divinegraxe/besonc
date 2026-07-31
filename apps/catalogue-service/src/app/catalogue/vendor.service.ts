import { Injectable } from '@nestjs/common';
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
 * Vendor Service — stores, restaurants, businesses, individual sellers.
 * Sprint 3-4: in-memory store + seed data. Sprint 5: Neon Postgres + full CRUD.
 */
@Injectable()
export class VendorService {
  private readonly vendors = new Map<string, Vendor>();
  private readonly byCategory = new Map<ServiceCode, Set<string>>();

  constructor() {
    this.seed();
  }

  private seed(): void {
    const sample: Vendor[] = [
      this.makeVendor({
        id: 'YDV-2026-0001',
        name: 'Auntie Ama Kitchen',
        description: 'Authentic Cape Coast home cooking. Banku & tilapia, fufu & light soup.',
        type: 'individual',
        city: 'CC',
        category: 'FO',
        rating: 4.7,
        reviewCount: 142,
        prepTimeMinutes: 25,
        minimumOrderPesewas: 2000,
        deliveryFeePesewas: 500,
        address: 'Pedu, Cape Coast',
        coordinates: { lat: 5.1036, lng: -1.2466 },
        phone: '+233241234567',
      }),
      this.makeVendor({
        id: 'YDV-2026-0002',
        name: 'Cape Coast Mall Foods',
        description: 'Multi-cuisine food court. Pizza, burgers, Chinese, local dishes.',
        type: 'business',
        city: 'CC',
        category: 'FO',
        rating: 4.3,
        reviewCount: 87,
        prepTimeMinutes: 20,
        minimumOrderPesewas: 1500,
        deliveryFeePesewas: 500,
        address: 'Cape Coast Mall, Bakano',
        coordinates: { lat: 5.1056, lng: -1.2444 },
        phone: '+233501234567',
      }),
      this.makeVendor({
        id: 'YDV-2026-0003',
        name: 'Kotokuraba Fresh Foods',
        description: 'Fresh tomatoes, onions, peppers, plantain, fish, meat. Direct from market.',
        type: 'individual',
        city: 'CC',
        category: 'GR',
        rating: 4.5,
        reviewCount: 56,
        prepTimeMinutes: 30,
        minimumOrderPesewas: 1000,
        deliveryFeePesewas: 700,
        address: 'Kotokuraba Market',
        coordinates: { lat: 5.1100, lng: -1.2430 },
        phone: '+233208765432',
      }),
      this.makeVendor({
        id: 'YDV-2026-0004',
        name: 'PhoneFix Cape Coast',
        description: 'Phones, chargers, earphones, screen protectors. Genuine products.',
        type: 'business',
        city: 'CC',
        category: 'SH',
        rating: 4.4,
        reviewCount: 31,
        prepTimeMinutes: 15,
        minimumOrderPesewas: 1000,
        deliveryFeePesewas: 800,
        address: 'Kotokuraba',
        coordinates: { lat: 5.1095, lng: -1.2420 },
        phone: '+233244556677',
      }),
      this.makeVendor({
        id: 'YDV-2026-0005',
        name: 'Cape Coast Pharmacy',
        description: 'Licensed pharmacy. Prescriptions, OTC medicines, health products.',
        type: 'business',
        city: 'CC',
        category: 'PH',
        rating: 4.8,
        reviewCount: 95,
        prepTimeMinutes: 10,
        minimumOrderPesewas: 0,
        deliveryFeePesewas: 1000,
        address: 'Adisadel',
        coordinates: { lat: 5.1150, lng: -1.2400 },
        phone: '+233244112233',
      }),
    ];
    for (const v of sample) this.create(v);
  }

  private makeVendor(partial: Omit<Vendor, 'hours' | 'isOpen' | 'createdAt' | 'bannerUrl' | 'logoUrl'> & { logoUrl?: string; bannerUrl?: string }): Vendor {
    return {
      ...partial,
      logoUrl: partial.logoUrl ?? `https://cdn.besonc.gh/vendors/${partial.id}/logo.png`,
      bannerUrl: partial.bannerUrl,
      hours: this.defaultHours(),
      isOpen: this.isCurrentlyOpen(this.defaultHours()),
      createdAt: new Date().toISOString(),
    };
  }

  private defaultHours(): VendorHours[] {
    return Array.from({ length: 7 }, (_, i) => ({
      dayOfWeek: i,
      open: '07:00',
      close: '22:00',
      closed: i === 0, // Closed Sundays
    }));
  }

  private isCurrentlyOpen(hours: VendorHours[]): boolean {
    const now = new Date();
    const day = now.getDay();
    const minutes = now.getHours() * 60 + now.getMinutes();
    const today = hours.find((h) => h.dayOfWeek === day);
    if (!today || today.closed) return false;
    const [oh, om] = today.open.split(':').map(Number);
    const [ch, cm] = today.close.split(':').map(Number);
    return minutes >= oh * 60 + om && minutes <= ch * 60 + cm;
  }

  create(v: Vendor): Vendor {
    this.vendors.set(v.id, v);
    if (!this.byCategory.has(v.category)) this.byCategory.set(v.category, new Set());
    this.byCategory.get(v.category)!.add(v.id);
    return v;
  }

  getById(id: string): Vendor | null {
    return this.vendors.get(id) ?? null;
  }

  listByCategory(category: ServiceCode, onlyOpen = false): Vendor[] {
    const ids = this.byCategory.get(category);
    if (!ids) return [];
    const all = Array.from(ids).map((id) => this.vendors.get(id)!).filter(Boolean);
    return onlyOpen ? all.filter((v) => v.isOpen) : all;
  }

  listAll(onlyOpen = false): Vendor[] {
    const all = Array.from(this.vendors.values());
    return onlyOpen ? all.filter((v) => v.isOpen) : all;
  }

  searchByName(query: string): Vendor[] {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return Array.from(this.vendors.values()).filter((v) => v.name.toLowerCase().includes(q));
  }
}
