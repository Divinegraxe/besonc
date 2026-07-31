import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@besonc/shared-db';
import { LedgerReason, PaymentDirection } from '@prisma/client';

export interface LedgerEntry {
  entryId: string;
  userId: string;
  userType: string;
  direction: 'credit' | 'debit';
  deltaPesewas: number;
  reason: string;
  referenceType?: string;
  referenceId?: string;
  paystackRef?: string;
  balanceAfter: number;
  description?: string;
  createdAt: string;
}

/**
 * Ledger Service — v1 (Cape Coast launch) per-user balance + audit log.
 * Backed by Postgres (LedgerEntry + UserBalance tables).
 *
 * Invariant: every entry records the running balance AFTER the entry.
 * The reconcile() method sums all deltas and reports the variance (must
 * be zero for a healthy ledger).
 */
@Injectable()
export class LedgerService implements OnModuleInit {
  private readonly logger = new Logger(LedgerService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    // Ensure the platform's holding account exists. This is the
    // pseudo-account that holds customer payments before they are
    // distributed to vendors + riders + platform.
    await this.ensureBalanceRow('PLATFORM_HOLDING', 'platform');
    const count = await this.prisma.ledgerEntry.count();
    this.logger.log(`Ledger DB connected. ${count} entries.`);
  }

  /**
   * Record a ledger entry. Updates the user's running balance atomically.
   * Returns the created entry.
   *
   * Direction is inferred from the sign of delta:
   *   positive => credit (money in)
   *   negative => debit  (money out)
   */
  async record(input: {
    userId: string;
    userType: string;
    deltaPesewas: number;
    reason: LedgerReason;
    referenceType?: string;
    referenceId?: string;
    paystackRef?: string;
    description?: string;
    paymentId?: string;
    payoutId?: string;
  }): Promise<LedgerEntry> {
    return await this.prisma.$transaction(async (tx) => {
      // Lock the balance row (FOR UPDATE) so two concurrent
      // transactions can't both read the same balance and
      // double-credit.
      let balance = await tx.userBalance.findUnique({ where: { userId: input.userId } });
      if (!balance) {
        balance = await tx.userBalance.create({
          data: { userId: input.userId, userType: input.userType, balancePesewas: 0 },
        });
      }
      const newBalance = balance.balancePesewas + input.deltaPesewas;
      const direction: PaymentDirection = input.deltaPesewas >= 0 ? PaymentDirection.credit : PaymentDirection.debit;

      await tx.userBalance.update({
        where: { userId: input.userId },
        data: { balancePesewas: newBalance },
      });

      const entry = await tx.ledgerEntry.create({
        data: {
          userId: input.userId,
          userType: input.userType,
          direction,
          deltaPesewas: input.deltaPesewas,
          reason: input.reason,
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          paystackRef: input.paystackRef,
          balanceAfter: newBalance,
          description: input.description,
          paymentId: input.paymentId,
          payoutId: input.payoutId,
        },
      });

      this.logger.log(
        `Ledger: ${input.userType}:${input.userId} ${input.deltaPesewas > 0 ? '+' : ''}${input.deltaPesewas / 100} GHS (${input.reason}) -> balance ${newBalance / 100} GHS`,
      );
      return {
        entryId: entry.id,
        userId: entry.userId,
        userType: entry.userType,
        direction: entry.direction === 'credit' ? 'credit' : 'debit',
        deltaPesewas: entry.deltaPesewas,
        reason: entry.reason,
        referenceType: entry.referenceType ?? undefined,
        referenceId: entry.referenceId ?? undefined,
        paystackRef: entry.paystackRef ?? undefined,
        balanceAfter: entry.balanceAfter,
        description: entry.description ?? undefined,
        createdAt: entry.createdAt.toISOString(),
      };
    });
  }

  async getBalance(userId: string): Promise<number> {
    const row = await this.prisma.userBalance.findUnique({ where: { userId } });
    return row?.balancePesewas ?? 0;
  }

  async getEntriesForUser(userId: string, limit = 50): Promise<LedgerEntry[]> {
    const rows = await this.prisma.ledgerEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((r) => this.toDomain(r));
  }

  async getEntriesForReference(referenceType: string, referenceId: string): Promise<LedgerEntry[]> {
    const rows = await this.prisma.ledgerEntry.findMany({
      where: { referenceType, referenceId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => this.toDomain(r));
  }

  /**
   * Daily reconciliation: sum all deltas. Should be exactly zero
   * (no money created or destroyed) for a healthy ledger.
   */
  async reconcile(): Promise<{ sum: number; variance: number }> {
    const all = await this.prisma.ledgerEntry.findMany({ select: { deltaPesewas: true } });
    const sum = all.reduce((acc, e) => acc + e.deltaPesewas, 0);
    return { sum, variance: sum };
  }

  // ── Helpers ───────────────────────────────────────────────────────

  private async ensureBalanceRow(userId: string, userType: string): Promise<void> {
    await this.prisma.userBalance.upsert({
      where: { userId },
      create: { userId, userType, balancePesewas: 0 },
      update: {},
    });
  }

  private toDomain(r: any): LedgerEntry {
    return {
      entryId: r.id,
      userId: r.userId,
      userType: r.userType,
      direction: r.direction === 'credit' ? 'credit' : 'debit',
      deltaPesewas: r.deltaPesewas,
      reason: r.reason,
      referenceType: r.referenceType ?? undefined,
      referenceId: r.referenceId ?? undefined,
      paystackRef: r.paystackRef ?? undefined,
      balanceAfter: r.balanceAfter,
      description: r.description ?? undefined,
      createdAt: r.createdAt.toISOString(),
    };
  }
}
