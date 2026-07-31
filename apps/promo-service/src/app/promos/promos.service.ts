import { Injectable, Logger, OnModuleInit, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@besonc/shared-db';
import { PromoType, PromoStatus } from '@prisma/client';

export interface PromoCode {
  id: string;
  code: string;
  description?: string;
  type: PromoType;
  discountPercent?: number;
  discountPesewas?: number;
  minOrderPesewas: number;
  maxDiscountPesewas?: number;
  vendorId?: string;
  category?: string;
  city?: string;
  maxUses?: number;
  maxUsesPerUser: number;
  currentUses: number;
  startsAt: string;
  expiresAt?: string;
  createdBy: string;
  status: PromoStatus;
  createdAt: string;
}

export interface PromoValidation {
  valid: boolean;
  discountAppliedPesewas: number;
  reason?: string;
  promo?: PromoCode;
}

@Injectable()
export class PromoService implements OnModuleInit {
  private readonly logger = new Logger(PromoService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    const count = await this.prisma.promoCode.count();
    this.logger.log(`Promo DB connected. ${count} promo codes.`);
  }

  /**
   * Create a promo code.
   */
  async create(input: {
    code: string;
    description?: string;
    type: PromoType;
    discountPercent?: number;
    discountPesewas?: number;
    minOrderPesewas?: number;
    maxDiscountPesewas?: number;
    vendorId?: string;
    category?: any;
    city?: string;
    maxUses?: number;
    maxUsesPerUser?: number;
    startsAt?: Date;
    expiresAt?: Date;
    createdBy: string;
  }): Promise<PromoCode> {
    if (input.type === 'percentage' && !input.discountPercent) {
      throw new BadRequestException('percentage type requires discountPercent');
    }
    if (input.type === 'fixed_amount' && !input.discountPesewas) {
      throw new BadRequestException('fixed_amount type requires discountPesewas');
    }
    const code = await this.prisma.promoCode.create({
      data: {
        code: input.code.toUpperCase(),
        description: input.description,
        type: input.type,
        discountPercent: input.discountPercent,
        discountPesewas: input.discountPesewas,
        minOrderPesewas: input.minOrderPesewas ?? 0,
        maxDiscountPesewas: input.maxDiscountPesewas,
        vendorId: input.vendorId,
        category: input.category,
        city: input.city,
        maxUses: input.maxUses,
        maxUsesPerUser: input.maxUsesPerUser ?? 1,
        startsAt: input.startsAt ?? new Date(),
        expiresAt: input.expiresAt,
        createdBy: input.createdBy,
      },
    });
    return this.toDomain(code);
  }

  async getByCode(code: string): Promise<PromoCode | null> {
    const c = await this.prisma.promoCode.findUnique({ where: { code: code.toUpperCase() } });
    return c ? this.toDomain(c) : null;
  }

  async list(filters: { status?: PromoStatus; vendorId?: string; city?: string } = {}, limit = 50): Promise<PromoCode[]> {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.vendorId) where.vendorId = filters.vendorId;
    if (filters.city) where.city = filters.city;
    const rows = await this.prisma.promoCode.findMany({ where, take: limit, orderBy: { createdAt: 'desc' } });
    return rows.map((r) => this.toDomain(r));
  }

  /**
   * Validate a promo code for a given order. Returns the discount to apply
   * (in pesewas), or an error reason.
   */
  async validate(input: { code: string; userId: string; orderTotalPesewas: number; vendorId?: string; category?: string; city?: string }): Promise<PromoValidation> {
    const code = await this.prisma.promoCode.findUnique({ where: { code: input.code.toUpperCase() } });
    if (!code) return { valid: false, discountAppliedPesewas: 0, reason: 'Promo code not found' };
    if (code.status !== 'active') return { valid: false, discountAppliedPesewas: 0, reason: `Promo is ${code.status}` };

    const now = new Date();
    if (code.startsAt > now) return { valid: false, discountAppliedPesewas: 0, reason: 'Promo not yet active' };
    if (code.expiresAt && code.expiresAt < now) return { valid: false, discountAppliedPesewas: 0, reason: 'Promo expired' };
    if (code.maxUses && code.currentUses >= code.maxUses) return { valid: false, discountAppliedPesewas: 0, reason: 'Promo fully redeemed' };
    if (input.orderTotalPesewas < code.minOrderPesewas) return { valid: false, discountAppliedPesewas: 0, reason: `Order below minimum (GHS ${code.minOrderPesewas / 100})` };
    if (code.vendorId && input.vendorId !== code.vendorId) return { valid: false, discountAppliedPesewas: 0, reason: 'Promo not valid for this vendor' };
    if (code.category && input.category !== code.category) return { valid: false, discountAppliedPesewas: 0, reason: 'Promo not valid for this category' };
    if (code.city && input.city !== code.city) return { valid: false, discountAppliedPesewas: 0, reason: 'Promo not valid in this city' };

    // Check per-user usage
    const userRedemptions = await this.prisma.promoRedemption.count({
      where: { promoId: code.id, userId: input.userId },
    });
    if (userRedemptions >= code.maxUsesPerUser) {
      return { valid: false, discountAppliedPesewas: 0, reason: 'You have already used this promo' };
    }

    // Compute discount
    let discount = 0;
    if (code.type === 'percentage' && code.discountPercent) {
      discount = Math.floor((input.orderTotalPesewas * code.discountPercent) / 100);
      if (code.maxDiscountPesewas) discount = Math.min(discount, code.maxDiscountPesewas);
    } else if (code.type === 'fixed_amount' && code.discountPesewas) {
      discount = Math.min(code.discountPesewas, input.orderTotalPesewas);
    } else if (code.type === 'free_delivery') {
      // The order's delivery fee discount is handled by the caller;
      // here we just confirm the code is valid.
      discount = 0;
    }
    return { valid: true, discountAppliedPesewas: discount, promo: this.toDomain(code) };
  }

  /**
   * Redeem a promo (called after the order is placed). Increments
   * currentUses and records the redemption.
   */
  async redeem(input: { code: string; userId: string; orderId: string; discountAppliedPesewas: number }): Promise<{ redemptionId: string }> {
    const code = await this.prisma.promoCode.findUnique({ where: { code: input.code.toUpperCase() } });
    if (!code) throw new NotFoundException('Promo code not found');
    const result = await this.prisma.$transaction([
      this.prisma.promoCode.update({
        where: { id: code.id },
        data: { currentUses: { increment: 1 } },
      }),
      this.prisma.promoRedemption.create({
        data: {
          promoId: code.id,
          userId: input.userId,
          orderId: input.orderId,
          discountAppliedPesewas: input.discountAppliedPesewas,
        },
      }),
    ]);
    return { redemptionId: result[1].id };
  }

  /**
   * Set promo status (pause, activate, expire). For back-office.
   */
  async setStatus(id: string, status: PromoStatus): Promise<PromoCode> {
    const c = await this.prisma.promoCode.update({ where: { id }, data: { status } });
    return this.toDomain(c);
  }

  /**
   * Seed a few common promos for Cape Coast launch.
   */
  async seedDefaultPromos(): Promise<number> {
    const defaults = [
      { code: 'WELCOME10', type: PromoType.percentage, discountPercent: 10, description: '10% off your first order', minOrderPesewas: 2000, maxDiscountPesewas: 2000, maxUses: 1000 },
      { code: 'CAPE20', type: PromoType.fixed_amount, discountPesewas: 2000, description: 'GHS 20 off in Cape Coast', city: 'CC', minOrderPesewas: 5000, maxUses: 500 },
      { code: 'FOODFRIDAY', type: PromoType.percentage, discountPercent: 15, description: '15% off Food on Fridays', category: 'FO' as any, minOrderPesewas: 3000, maxDiscountPesewas: 3000, maxUses: 200 },
      { code: 'FREEDELIVERY', type: PromoType.free_delivery, description: 'Free delivery on any order', minOrderPesewas: 5000, maxUses: 200 },
    ];
    let count = 0;
    for (const d of defaults) {
      const existing = await this.prisma.promoCode.findUnique({ where: { code: d.code } });
      if (existing) continue;
      await this.prisma.promoCode.create({ data: { ...d, createdBy: 'platform' } as any });
      count++;
    }
    return count;
  }

  private toDomain(c: any): PromoCode {
    return {
      id: c.id,
      code: c.code,
      description: c.description ?? undefined,
      type: c.type,
      discountPercent: c.discountPercent ?? undefined,
      discountPesewas: c.discountPesewas ?? undefined,
      minOrderPesewas: c.minOrderPesewas,
      maxDiscountPesewas: c.maxDiscountPesewas ?? undefined,
      vendorId: c.vendorId ?? undefined,
      category: c.category ?? undefined,
      city: c.city ?? undefined,
      maxUses: c.maxUses ?? undefined,
      maxUsesPerUser: c.maxUsesPerUser,
      currentUses: c.currentUses,
      startsAt: c.startsAt.toISOString(),
      expiresAt: c.expiresAt?.toISOString(),
      createdBy: c.createdBy,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
    };
  }
}
