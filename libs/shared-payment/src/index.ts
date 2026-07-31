/**
 * BESONC Shared Payment Library
 *
 * Paystack (Charge + Transfer) helpers. The ONLY payment provider.
 * Our internal ledger is the orchestrator. No Subaccounts, no Transaction Splits.
 *
 * See besonc-v3-plan.md Section 8 for the architecture.
 */

import { PaystackChargeProvider, PaystackTransferBankCode, type PaystackMobileMoneyProvider } from '@besonc/shared-types';
import { optionalEnv } from '@besonc/shared-utils';

const PAYSTACK_BASE = 'https://api.paystack.co';
const PAYSTACK_SECRET_KEY = process.env['PAYSTACK_SECRET_KEY'] ?? '';

/** Initialize the shared payment library. Call at app startup. */
export function initPaymentLib(): void {
  if (!PAYSTACK_SECRET_KEY) {
    // Don't throw in dev — log a warning
    if (process.env['NODE_ENV'] === 'production') {
      throw new Error('PAYSTACK_SECRET_KEY is required in production');
    }
    console.warn('[payment] PAYSTACK_SECRET_KEY not set — running in dev mode without Paystack');
  }
}

function paystackHeaders() {
  return {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json',
  };
}

// ============================================================================
// API 1: CHARGE (collect money from customers)
// ============================================================================

export interface ChargeRequest {
  /** Amount in pesewas (Paystack expects subunits) */
  amountPesewas: number;
  email: string;
  reference: string;
  mobileMoney?: {
    phone: string;
    provider: PaystackMobileMoneyProvider;
  };
  metadata?: Record<string, unknown>;
}

export interface ChargeResponse {
  status: boolean;
  message: string;
  data: {
    reference: string;
    status: 'success' | 'failed' | 'pending' | 'abandoned';
    amount: number;
    channel: string;
    gateway_response: string;
    paid_at?: string;
  };
}

/**
 * POST /charge
 * Collects money from a customer. For MoMo, returns pending — must poll or
 * listen to webhook for final status.
 */
export async function paystackCharge(req: ChargeRequest): Promise<ChargeResponse> {
  const body: Record<string, unknown> = {
    amount: req.amountPesewas,
    email: req.email,
    reference: req.reference,
    currency: 'GHS',
    metadata: req.metadata ?? {},
  };

  if (req.mobileMoney) {
    body['mobile_money'] = {
      phone: req.mobileMoney.phone,
      provider: PaystackChargeProvider[req.mobileMoney.provider],
    };
  }

  const res = await fetch(`${PAYSTACK_BASE}/charge`, {
    method: 'POST',
    headers: paystackHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Paystack charge failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<ChargeResponse>;
}

// ============================================================================
// API 2: TRANSFER (send money to vendors and riders)
// ============================================================================

export interface CreateTransferRecipientRequest {
  type: 'mobile_money' | 'ghipss' | 'nuban';
  name: string;
  accountNumber: string;
  bankCode: string; // MUST be uppercase for mobile_money (MTN/VOD/ATL) or numeric for banks
  currency: 'GHS';
}

export interface CreateTransferRecipientResponse {
  status: boolean;
  data: {
    recipient_code: string;
    active: boolean;
    details: {
      account_number: string;
      bank_code: string;
      bank_name: string;
    };
  };
}

/**
 * POST /transferrecipient
 * Creates a recipient for a MoMo number or bank account. The recipient_code
 * is used in subsequent transfer calls.
 */
export async function createTransferRecipient(
  req: CreateTransferRecipientRequest,
): Promise<CreateTransferRecipientResponse> {
  // CRITICAL: For mobile_money, bank_code MUST be uppercase (MTN/VOD/ATL)
  const res = await fetch(`${PAYSTACK_BASE}/transferrecipient`, {
    method: 'POST',
    headers: paystackHeaders(),
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Paystack createTransferRecipient failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<CreateTransferRecipientResponse>;
}

export interface TransferRequest {
  amountPesewas: number;
  recipientCode: string;
  reference: string;
  reason: string;
}

export interface TransferResponse {
  status: boolean;
  data: {
    transfer_code: string;
    reference: string;
    amount: number;
    status: 'success' | 'failed' | 'pending' | 'reversed';
    reason: string;
    recipient: string;
  };
}

/**
 * POST /transfer
 * Sends money from our Paystack balance to a vendor or rider.
 * Cost: GHS 1 per MoMo transfer, GHS 8 per bank transfer (Ghana pricing).
 */
export async function paystackTransfer(req: TransferRequest): Promise<TransferResponse> {
  const res = await fetch(`${PAYSTACK_BASE}/transfer`, {
    method: 'POST',
    headers: paystackHeaders(),
    body: JSON.stringify({
      source: 'balance',
      amount: req.amountPesewas,
      recipient: req.recipientCode,
      reference: req.reference,
      reason: req.reason,
      currency: 'GHS',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Paystack transfer failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<TransferResponse>;
}

// ============================================================================
// HELPERS — bank code translation
// ============================================================================

/**
 * Translate a mobile money provider name to the UPPERCASE bank code
 * expected by the Transfer Recipient API.
 */
export function bankCodeForTransfer(provider: PaystackMobileMoneyProvider): string {
  return PaystackTransferBankCode[provider];
}

/** Generate a unique Paystack reference. Format: BESONC-{timestamp}-{rand} */
export function generatePaystackReference(prefix: string = 'BESONC'): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}
