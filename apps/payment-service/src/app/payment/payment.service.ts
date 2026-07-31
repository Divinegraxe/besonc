import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { paystackCharge, generatePaystackReference } from '@besonc/shared-payment';
import type { PaystackMobileMoneyProvider } from '@besonc/shared-types';
import { LedgerService } from './ledger.service';
import { randomUUID } from 'node:crypto';

export type PaymentMethod = 'momo' | 'card' | 'bank' | 'cash';
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'abandoned';

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
  recipientId: string;       // 'rider:YDR-...' or 'vendor:YDV-...'
  recipientType: 'rider' | 'vendor';
  amountPesewas: number;
  paystackTransferCode?: string;
  status: 'pending' | 'success' | 'failed';
  reason: string;             // 'rider_payout', 'vendor_settlement', 'refund'
  relatedOrderId?: string;
  createdAt: string;
  completedAt?: string;
}

/**
 * Payment Service — orchestrates the v3.1 plan's Paystack + Ledger model.
 * - Customer pays via Paystack Charge (POST /charge)
 * - Money lands in Besonc Paystack balance
 * - Ledger records the money movement (source of truth)
 * - Vendor settlement and rider payout via Paystack Transfer (POST /transfer)
 * - T+1 settlement: customer payment is settled next business day, transfers
 *   require settled balance.
 */
@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly payments = new Map<string, PaymentRecord>();
  private readonly payouts = new Map<string, PayoutRecord>();

  constructor(private readonly ledger: LedgerService) {}

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

    const payment: PaymentRecord = {
      id: randomUUID(),
      orderId: input.orderId,
      customerId: input.customerId,
      amountPesewas: input.amountPesewas,
      method: input.method,
      status: 'pending',
      paystackReference: reference,
      mobileMoney: input.mobileMoney,
      createdAt: new Date().toISOString(),
    };
    this.payments.set(payment.id, payment);

    try {
      const res = await paystackCharge({
        amountPesewas: input.amountPesewas,
        email: input.customerEmail,
        reference,
        mobileMoney: input.method === 'momo' && input.mobileMoney ? input.mobileMoney : undefined,
        metadata: { orderId: input.orderId, customerId: input.customerId, paymentId: payment.id },
      });

      const paystackStatus = res.data.status;
      payment.status = paystackStatus === 'success' ? 'success' : paystackStatus === 'failed' ? 'failed' : 'pending';
      if (paystackStatus === 'success') {
        payment.completedAt = new Date().toISOString();
        // Record ledger: customer paid, money held in PLATFORM_HOLDING
        this.ledger.record({
          userId: input.customerId,
          userType: 'customer',
          deltaPesewas: 0,  // customer balance unchanged
          reason: 'order_payment',
          referenceType: 'order',
          referenceId: input.orderId,
          paystackRef: reference,
        });
      }
      this.payments.set(payment.id, payment);
      return { reference, paystackStatus, paymentId: payment.id };
    } catch (err) {
      payment.status = 'failed';
      payment.failureReason = (err as Error).message;
      this.payments.set(payment.id, payment);
      throw err;
    }
  }

  /** When a Paystack webhook confirms a charge success, we mark it. */
  markPaidByReference(reference: string): PaymentRecord | null {
    for (const p of this.payments.values()) {
      if (p.paystackReference === reference) {
        p.status = 'success';
        p.completedAt = new Date().toISOString();
        return p;
      }
    }
    return null;
  }

  getPayment(id: string): PaymentRecord | null {
    return this.payments.get(id) ?? null;
  }

  /** Record a vendor settlement (after delivery) — actual Paystack transfer happens in the
   *  daily batch payout, this just records the intention. */
  recordVendorSettlement(input: { vendorId: string; orderId: string; amountPesewas: number }): void {
    this.ledger.record({
      userId: input.vendorId,
      userType: 'vendor',
      deltaPesewas: input.amountPesewas,
      reason: 'vendor_settlement',
      referenceType: 'order',
      referenceId: input.orderId,
    });
  }

  /** Record rider earning (after delivery). Payout to rider happens in daily batch. */
  recordRiderEarning(input: { riderId: string; orderId: string; amountPesewas: number; tipPesewas: number }): void {
    this.ledger.record({
      userId: input.riderId,
      userType: 'rider',
      deltaPesewas: input.amountPesewas + input.tipPesewas,
      reason: 'rider_earning',
      referenceType: 'order',
      referenceId: input.orderId,
    });
  }

  /** Record a successful payout to a vendor or rider. */
  recordPayout(input: { recipientId: string; recipientType: 'rider' | 'vendor'; amountPesewas: number; paystackTransferCode?: string; reason: string; relatedOrderId?: string }): PayoutRecord {
    const payout: PayoutRecord = {
      id: randomUUID(),
      recipientId: input.recipientId,
      recipientType: input.recipientType,
      amountPesewas: input.amountPesewas,
      paystackTransferCode: input.paystackTransferCode,
      status: input.paystackTransferCode ? 'success' : 'pending',
      reason: input.reason,
      relatedOrderId: input.relatedOrderId,
      createdAt: new Date().toISOString(),
      completedAt: input.paystackTransferCode ? new Date().toISOString() : undefined,
    };
    this.payouts.set(payout.id, payout);
    this.ledger.record({
      userId: input.recipientId,
      userType: input.recipientType,
      deltaPesewas: -input.amountPesewas,
      reason: input.reason === 'vendor_settlement' ? 'vendor_settlement' : 'rider_payout',
      referenceType: 'order',
      referenceId: input.relatedOrderId,
      paystackRef: input.paystackTransferCode,
    });
    return payout;
  }

  /** Daily batch payout summary (Sprint 5+ will actually trigger the Paystack Transfer calls). */
  listPendingPayouts(): PayoutRecord[] {
    return Array.from(this.payouts.values()).filter((p) => p.status === 'pending');
  }

  listPayments(): PaymentRecord[] {
    return Array.from(this.payments.values());
  }

  listPayouts(): PayoutRecord[] {
    return Array.from(this.payouts.values());
  }
}
