import { Injectable, Logger, OnModuleInit, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@besonc/shared-db';
import { TipStatus } from '@prisma/client';

export interface Tip {
  id: string;
  orderId: string;
  customerId: string;
  riderId: string;
  amountPesewas: number;
  status: TipStatus;
  paystackRef?: string;
  customerMessage?: string;
  createdAt: string;
  paidAt?: string;
}

/**
 * Tip Service — 100% of the tip goes to the rider.
 *
 * The pricing service (per v3.1 plan) sets tipToRiderPesewas = the tip
 * amount in the order's pricing quote. This service just records the
 * post-delivery tip and updates the ledger.
 */
@Injectable()
export class TipService implements OnModuleInit {
  private readonly logger = new Logger(TipService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    const count = await this.prisma.tip.count();
    this.logger.log(`Tip DB connected. ${count} tips.`);
  }

  /**
   * Submit a tip for a completed order. Idempotent on orderId — once
   * a tip is paid for an order, you can't add another.
   */
  async addTip(input: {
    orderId: string;
    customerId: string;
    riderId: string;
    amountPesewas: number;
    customerMessage?: string;
  }): Promise<Tip> {
    if (input.amountPesewas <= 0) throw new BadRequestException('Tip must be > 0');
    const existing = await this.prisma.tip.findUnique({ where: { orderId: input.orderId } });
    if (existing && existing.status === 'paid') {
      throw new BadRequestException(`Tip already paid for order ${input.orderId}`);
    }
    // For v1, we mark the tip as paid immediately (we'd integrate with
    // Paystack for real card/momo tips in Sprint 7+).
    const tip = existing
      ? await this.prisma.tip.update({
          where: { id: existing.id },
          data: {
            amountPesewas: input.amountPesewas,
            customerMessage: input.customerMessage,
            status: 'paid',
            paidAt: new Date(),
          },
        })
      : await this.prisma.tip.create({
          data: {
            orderId: input.orderId,
            customerId: input.customerId,
            riderId: input.riderId,
            amountPesewas: input.amountPesewas,
            customerMessage: input.customerMessage,
            status: 'paid',
            paidAt: new Date(),
          },
        });
    this.logger.log(`Tip: GHS ${input.amountPesewas / 100} from ${input.customerId} -> rider ${input.riderId} (order ${input.orderId})`);
    return this.toDomain(tip);
  }

  async getForOrder(orderId: string): Promise<Tip | null> {
    const t = await this.prisma.tip.findUnique({ where: { orderId } });
    return t ? this.toDomain(t) : null;
  }

  async getForRider(riderId: string, limit = 50): Promise<Tip[]> {
    const rows = await this.prisma.tip.findMany({
      where: { riderId, status: 'paid' },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((r) => this.toDomain(r));
  }

  async getRiderTotal(riderId: string): Promise<{ totalPesewas: number; tipCount: number }> {
    const result = await this.prisma.tip.aggregate({
      where: { riderId, status: 'paid' },
      _sum: { amountPesewas: true },
      _count: true,
    });
    return {
      totalPesewas: result._sum.amountPesewas ?? 0,
      tipCount: result._count,
    };
  }

  private toDomain(t: any): Tip {
    return {
      id: t.id,
      orderId: t.orderId,
      customerId: t.customerId,
      riderId: t.riderId,
      amountPesewas: t.amountPesewas,
      status: t.status,
      paystackRef: t.paystackRef ?? undefined,
      customerMessage: t.customerMessage ?? undefined,
      createdAt: t.createdAt.toISOString(),
      paidAt: t.paidAt?.toISOString(),
    };
  }
}
