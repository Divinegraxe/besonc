import { Injectable, Logger, BadRequestException, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@besonc/shared-db';
import { charge, createTransferRecipient, transfer, generatePaystackReference } from './paystack-provider';
import type { PaystackMobileMoneyProvider } from '@besonc/shared-types';
import { LedgerService } from './ledger.service';
import { LedgerReason } from '@prisma/client';

export type PaymentMethod = 'momo' | 'card' | 'cash';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'abandoned';

export interface PaymentRecord {
  id: string;
  orderId: string;
  customerId: string;
  amountPesewas: number;
  method: PaymentMethod;
  status: PaymentStatus;
  paystackReference?: string;
  paystackChargeId?: string;
  mobileMoney?: { phone: string; provider: PaystackMobileMoneyProvider };
  createdAt: string;
  completedAt?: string;
  failureReason?: string;
}

export interface PayoutRecord {
  id: string;
  recipientId: string;
  recipientType: 'rider' | 'vendor';
  amountPesewas: number;
  paystackTransferCode?: string;
  status: PaymentStatus;
  reason: string;
  relatedOrderId?: string;
  createdAt: string;
  completedAt?: string;
}

@Injectable()
export class PaymentService implements OnModuleInit {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) {}

  async onModuleInit(): Promise<void> {
    const payments = await this.prisma.payment.count();
    const payouts = await this.prisma.payout.count();
    this.logger.log(`Payment DB connected. ${payments} payments, ${payouts} payouts.`);
  }

  /**
   * Charge a customer. Uses the real Paystack if PAYSTACK_SECRET_KEY is
   * set, otherwise the mock provider in paystack-provider.ts. Either way
   * the response shape is identical.
   */
  async chargeCustomer(input: {
    orderId: string;
    customerId: string;
    customerEmail: string;
    amountPesewas: number;
    method: PaymentMethod;
    mobileMoney?: { phone: string; provider: PaystackMobileMoneyProvider };
  }): Promise<{ reference: string; paystackStatus: string; paymentId: string }> {
    if (input.amountPesewas <= 0) throw new BadRequestException('Amount must be > 0');
    const reference = generatePaystackReference('BESONC-CHARGE');

    const payment = await this.prisma.payment.create({
      data: {
        orderId: input.orderId,
        customerId: input.customerId,
        amountPesewas: input.amountPesewas,
        method: input.method as any,
        status: 'pending',
        paystackReference: reference,
        mobileMoneyPhone: input.mobileMoney?.phone,
        mobileMoneyProvider: input.mobileMoney?.provider,
      },
    });

    try {
      const res = await charge({
        amountPesewas: input.amountPesewas,
        email: input.customerEmail,
        reference,
        mobileMoney: input.method === 'momo' && input.mobileMoney ? input.mobileMoney : undefined,
        metadata: { orderId: input.orderId, customerId: input.customerId, paymentId: payment.id },
      });

      const newStatus = res.status === 'success' ? 'paid' : res.status === 'failed' ? 'failed' : res.status === 'abandoned' ? 'failed' : 'pending';
      const updated = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: newStatus as any,
          paystackChargeId: res.paystackChargeId,
          completedAt: newStatus === 'paid' ? new Date() : undefined,
        },
      });

      if (newStatus === 'paid') {
        // Record ledger entries:
        //   1. PLATFORM_HOLDING  +amount  (we received the money)
        //   2. customer  +0 (no balance change, but we audit the order)
        await this.ledger.record({
          userId: 'PLATFORM_HOLDING',
          userType: 'platform',
          deltaPesewas: input.amountPesewas,
          reason: LedgerReason.order_payment,
          referenceType: 'order',
          referenceId: input.orderId,
          paystackRef: reference,
          description: `Order payment received from ${input.customerId}`,
          paymentId: payment.id,
        });
      }
      return { reference, paystackStatus: newStatus, paymentId: updated.id };
    } catch (err) {
      const message = (err as Error).message;
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'failed', failureReason: message },
      });
      throw err;
    }
  }

  /**
   * When a Paystack webhook (or async MoMo confirmation) lands, mark
   * the payment as success and record the ledger entry if not already done.
   */
  async markPaidByReference(reference: string): Promise<PaymentRecord | null> {
    const payment = await this.prisma.payment.findUnique({ where: { paystackReference: reference } });
    if (!payment) return null;
    if (payment.status === 'paid') return this.toDomain(payment);

    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'paid', completedAt: new Date() },
    });

    // Ledger entry (only if not already recorded)
    const existingEntries = await this.ledger.getEntriesForReference('payment', updated.id);
    if (existingEntries.length === 0) {
      await this.ledger.record({
        userId: 'PLATFORM_HOLDING',
        userType: 'platform',
        deltaPesewas: updated.amountPesewas,
        reason: LedgerReason.order_payment,
        referenceType: 'payment',
        referenceId: updated.id,
        paystackRef: reference,
        description: `Payment received (webhook) from ${updated.customerId}`,
        paymentId: updated.id,
      });
    }
    return this.toDomain(updated);
  }

  async getPayment(id: string): Promise<PaymentRecord | null> {
    const row = await this.prisma.payment.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async listPaymentsByOrder(orderId: string): Promise<PaymentRecord[]> {
    const rows = await this.prisma.payment.findMany({ where: { orderId }, orderBy: { createdAt: 'desc' } });
    return rows.map((r) => this.toDomain(r));
  }

  async listPaymentsByCustomer(customerId: string, limit = 50): Promise<PaymentRecord[]> {
    const rows = await this.prisma.payment.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((r) => this.toDomain(r));
  }

  /**
   * Record a vendor settlement (called after delivery is confirmed).
   * Increases the vendor's balance; actual Paystack transfer happens
   * in the daily batch payout job (Sprint 5+).
   */
  async recordVendorSettlement(input: { vendorId: string; orderId: string; amountPesewas: number }): Promise<void> {
    await this.ledger.record({
      userId: `vendor:${input.vendorId}`,
      userType: 'vendor',
      deltaPesewas: input.amountPesewas,
      reason: LedgerReason.vendor_settlement,
      referenceType: 'order',
      referenceId: input.orderId,
      description: `Vendor settlement for order ${input.orderId}`,
    });
  }

  /**
   * Record rider earning (after delivery). Combines base pay + tip.
   */
  async recordRiderEarning(input: { riderId: string; orderId: string; amountPesewas: number; tipPesewas: number }): Promise<void> {
    await this.ledger.record({
      userId: `rider:${input.riderId}`,
      userType: 'rider',
      deltaPesewas: input.amountPesewas + input.tipPesewas,
      reason: LedgerReason.rider_earning,
      referenceType: 'order',
      referenceId: input.orderId,
      description: `Rider earning (incl. tip) for order ${input.orderId}`,
    });
  }

  /**
   * Execute a payout to a vendor or rider via Paystack Transfer. The
   * transfer is real in prod (deducts from PLATFORM_HOLDING, adds to
   * the recipient's wallet — for vendors it stays in our ledger until
   * they cash out, for riders we hold it for T+1).
   */
  async recordPayout(input: {
    recipientId: string;
    recipientType: 'rider' | 'vendor';
    amountPesewas: number;
    paystackTransferCode?: string;
    reason: string;
    relatedOrderId?: string;
  }): Promise<PayoutRecord> {
    const payout = await this.prisma.payout.create({
      data: {
        recipientId: input.recipientId,
        recipientType: input.recipientType,
        amountPesewas: input.amountPesewas,
        paystackTransferCode: input.paystackTransferCode,
        status: input.paystackTransferCode ? 'success' : 'pending',
        reason: input.reason,
        relatedOrderId: input.relatedOrderId,
        completedAt: input.paystackTransferCode ? new Date() : undefined,
      },
    });

    // Payout reduces recipient's "earned but not yet paid" balance.
    // In our simple model we treat vendor_settlement as positive
    // (earned), and the payout debit brings it back to zero. For
    // riders we treat it the same way.
    await this.ledger.record({
      userId: input.recipientId,
      userType: input.recipientType,
      deltaPesewas: -input.amountPesewas,
      reason: input.reason === 'vendor_settlement' ? LedgerReason.vendor_settlement : LedgerReason.rider_payout,
      referenceType: 'payout',
      referenceId: payout.id,
      paystackRef: input.paystackTransferCode,
      description: `Payout to ${input.recipientType} ${input.recipientId}`,
      payoutId: payout.id,
    });
    return this.toPayoutDomain(payout);
  }

  async listPendingPayouts(): Promise<PayoutRecord[]> {
    const rows = await this.prisma.payout.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => this.toPayoutDomain(r));
  }

  async listPayments(): Promise<PaymentRecord[]> {
    const rows = await this.prisma.payment.findMany({ orderBy: { createdAt: 'desc' } });
    return rows.map((r) => this.toDomain(r));
  }

  async listPayouts(): Promise<PayoutRecord[]> {
    const rows = await this.prisma.payout.findMany({ orderBy: { createdAt: 'desc' } });
    return rows.map((r) => this.toPayoutDomain(r));
  }

  // ── Mapping helpers ───────────────────────────────────────────────

  private toDomain(r: any): PaymentRecord {
    return {
      id: r.id,
      orderId: r.orderId,
      customerId: r.customerId,
      amountPesewas: r.amountPesewas,
      method: r.method as PaymentMethod,
      status: r.status as PaymentStatus,
      paystackReference: r.paystackReference ?? undefined,
      paystackChargeId: r.paystackChargeId ?? undefined,
      mobileMoney: r.mobileMoneyPhone ? { phone: r.mobileMoneyPhone, provider: r.mobileMoneyProvider as PaystackMobileMoneyProvider } : undefined,
      createdAt: r.createdAt.toISOString(),
      completedAt: r.completedAt?.toISOString(),
      failureReason: r.failureReason ?? undefined,
    };
  }

  private toPayoutDomain(r: any): PayoutRecord {
    return {
      id: r.id,
      recipientId: r.recipientId,
      recipientType: r.recipientType,
      amountPesewas: r.amountPesewas,
      paystackTransferCode: r.paystackTransferCode ?? undefined,
      status: r.status as PaymentStatus,
      reason: r.reason,
      relatedOrderId: r.relatedOrderId ?? undefined,
      createdAt: r.createdAt.toISOString(),
      completedAt: r.completedAt?.toISOString(),
    };
  }
}
