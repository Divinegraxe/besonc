/**
 * Paystack provider abstraction.
 *
 * The real Paystack provider (in @besonc/shared-payment) makes HTTP calls
 * to api.paystack.co. When PAYSTACK_SECRET_KEY is set in env, the real
 * provider is used. When it's not set (dev mode), this mock returns
 * deterministic fake-success responses so the rest of the payment flow
 * can be tested end-to-end without burning real money.
 *
 * Switching between mock and real is automatic — the consumer of this
 * module doesn't need to change.
 */
import * as real from '@besonc/shared-payment';

export interface PaystackChargeResult {
  reference: string;
  status: 'success' | 'failed' | 'pending' | 'abandoned';
  paystackChargeId?: string;
  channel?: string;
  gatewayResponse?: string;
}

export interface PaystackTransferResult {
  reference: string;
  paystackTransferCode: string;
  status: 'success' | 'failed' | 'pending';
}

function hasPaystackKey(): boolean {
  return !!process.env['PAYSTACK_SECRET_KEY'];
}

export async function charge(input: real.ChargeRequest): Promise<PaystackChargeResult> {
  if (hasPaystackKey()) {
    const res = await real.paystackCharge(input);
    return {
      reference: res.data.reference,
      status: res.data.status as PaystackChargeResult['status'],
      paystackChargeId: String(res.data.amount),
      channel: res.data.channel,
      gatewayResponse: res.data.gateway_response,
    };
  }
  // ── MOCK: dev mode without API keys ─────────────────────────────
  // Simulate a successful charge. The "pending" branch would be for MoMo
  // in real life (you wait for the customer to approve the prompt on
  // their phone); here we return success immediately.
  console.log(`[paystack-mock] charge: ${input.amountPesewas/100} GHS via ${input.mobileMoney ? 'MoMo' : 'card'} (ref=${input.reference})`);
  return {
    reference: input.reference,
    status: 'success',
    paystackChargeId: `mock_ch_${Date.now()}`,
    channel: input.mobileMoney ? 'mobile_money' : 'card',
    gatewayResponse: 'Mock successful charge (no real Paystack call)',
  };
}

export async function createTransferRecipient(input: real.CreateTransferRecipientRequest): Promise<{ recipientCode: string }> {
  if (hasPaystackKey()) {
    const res = await real.createTransferRecipient(input);
    return { recipientCode: res.data.recipient_code };
  }
  console.log(`[paystack-mock] createTransferRecipient: ${input.type} ${input.accountNumber}`);
  return { recipientCode: `mock_rcp_${Date.now()}` };
}

export async function transfer(input: real.TransferRequest): Promise<PaystackTransferResult> {
  if (hasPaystackKey()) {
    const res = await real.paystackTransfer(input);
    return {
      reference: res.data.reference,
      paystackTransferCode: res.data.transfer_code,
      status: res.data.status as PaystackTransferResult['status'],
    };
  }
  console.log(`[paystack-mock] transfer: ${input.amountPesewas/100} GHS to ${input.recipientCode} (ref=${input.reference})`);
  return {
    reference: input.reference,
    paystackTransferCode: `mock_trf_${Date.now()}`,
    status: 'success',
  };
}

export { generatePaystackReference, bankCodeForTransfer } from '@besonc/shared-payment';
