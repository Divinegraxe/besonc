import { Injectable, Logger, OnModuleInit, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@besonc/shared-db';
import { CodStatus } from '@prisma/client';

@Injectable()
export class CodService implements OnModuleInit {
  private readonly logger = new Logger(CodService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    const count = await this.prisma.codCollection.count();
    this.logger.log(`COD DB connected. ${count} collections.`);
  }

  /**
   * Rider reports cash collected for an order. Idempotent on orderId.
   */
  async recordCollection(input: {
    orderId: string;
    riderId: string;
    customerId: string;
    amountPesewas: number;
    expectedAmountPesewas?: number; // from the order's grandTotal
    notes?: string;
  }): Promise<{ id: string; variance: number; status: string }> {
    const existing = await this.prisma.codCollection.findUnique({ where: { orderId: input.orderId } });
    if (existing) {
      return { id: existing.id, variance: existing.variancePesewas ?? 0, status: existing.status };
    }
    const variance = input.expectedAmountPesewas !== undefined
      ? input.amountPesewas - input.expectedAmountPesewas
      : 0;
    const status: CodStatus = variance === 0 ? 'collected' : 'disputed';
    const created = await this.prisma.codCollection.create({
      data: {
        orderId: input.orderId,
        riderId: input.riderId,
        customerId: input.customerId,
        amountPesewas: input.amountPesewas,
        status,
        variancePesewas: variance === 0 ? null : variance,
        notes: input.notes,
      },
    });
    this.logger.log(`COD: order ${input.orderId} collected GHS ${input.amountPesewas / 100} by rider ${input.riderId} (variance ${variance / 100} GHS)`);
    return { id: created.id, variance, status: created.status };
  }

  /**
   * Mark a collection as deposited (rider handed cash to ops).
   */
  async markDeposited(id: string): Promise<void> {
    const c = await this.prisma.codCollection.findUnique({ where: { id } });
    if (!c) throw new NotFoundException(`COD collection ${id} not found`);
    if (c.status !== 'collected') throw new BadRequestException(`Cannot deposit collection in status ${c.status}`);
    await this.prisma.codCollection.update({
      where: { id },
      data: { status: 'deposited', depositedAt: new Date() },
    });
  }

  /**
   * Mark a collection as reconciled (finance verified it matches).
   */
  async markReconciled(id: string): Promise<void> {
    await this.prisma.codCollection.update({
      where: { id },
      data: { status: 'reconciled', reconciledAt: new Date() },
    });
  }

  /**
   * Daily summary: total expected, total collected, total variance.
   * Used by the admin back-office and the rider payout engine.
   */
  async getDailySummary(date: Date = new Date()): Promise<{
    date: string;
    totalCollected: number;
    totalDeposited: number;
    totalReconciled: number;
    totalVariance: number;
    disputeCount: number;
    byRider: Array<{ riderId: string; totalCollected: number; collectionCount: number }>;
  }> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const all = await this.prisma.codCollection.findMany({
      where: { collectedAt: { gte: startOfDay, lt: endOfDay } },
    });

    const totalCollected = all.filter((c) => c.status === 'collected' || c.status === 'deposited' || c.status === 'reconciled')
      .reduce((acc, c) => acc + c.amountPesewas, 0);
    const totalDeposited = all.filter((c) => c.status === 'deposited' || c.status === 'reconciled')
      .reduce((acc, c) => acc + c.amountPesewas, 0);
    const totalReconciled = all.filter((c) => c.status === 'reconciled')
      .reduce((acc, c) => acc + c.amountPesewas, 0);
    const totalVariance = all.reduce((acc, c) => acc + (c.variancePesewas ?? 0), 0);
    const disputeCount = all.filter((c) => c.status === 'disputed').length;

    // Group by rider
    const byRiderMap = new Map<string, { totalCollected: number; collectionCount: number }>();
    for (const c of all) {
      const cur = byRiderMap.get(c.riderId) ?? { totalCollected: 0, collectionCount: 0 };
      cur.totalCollected += c.amountPesewas;
      cur.collectionCount += 1;
      byRiderMap.set(c.riderId, cur);
    }
    const byRider = Array.from(byRiderMap.entries()).map(([riderId, v]) => ({ riderId, ...v }));

    return {
      date: startOfDay.toISOString().slice(0, 10),
      totalCollected,
      totalDeposited,
      totalReconciled,
      totalVariance,
      disputeCount,
      byRider,
    };
  }

  /**
   * What this rider owes us right now (collections marked 'collected'
   * but not 'deposited' or 'reconciled').
   */
  async getRiderOutstanding(riderId: string): Promise<{ totalOwed: number; collectionCount: number; collections: any[] }> {
    const collections = await this.prisma.codCollection.findMany({
      where: { riderId, status: 'collected' },
      orderBy: { collectedAt: 'desc' },
    });
    return {
      totalOwed: collections.reduce((acc, c) => acc + c.amountPesewas, 0),
      collectionCount: collections.length,
      collections,
    };
  }

  async listByOrder(orderId: string): Promise<any | null> {
    return this.prisma.codCollection.findUnique({ where: { orderId } });
  }
}
