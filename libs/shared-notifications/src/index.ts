/**
 * BESONC Shared Notifications Library
 *
 * Per business rules: Hubtel for SMS ONLY (no Arkesel, no WhatsApp).
 * Firebase Cloud Messaging (FCM) for push notifications.
 * Resend for transactional email.
 */

import { optionalEnv } from '@besonc/shared-utils';

const HUBTEL_BASE = 'https://smsc.hubtel.com/v1/messages';
const HUBTEL_CLIENT_ID = process.env['HUBTEL_CLIENT_ID'] ?? '';
const HUBTEL_CLIENT_SECRET = process.env['HUBTEL_CLIENT_SECRET'] ?? '';
const HUBTEL_SENDER_ID = process.env['HUBTEL_SENDER_ID'] ?? 'BESONC';

export interface SmsRequest {
  to: string; // E.164 or local format
  message: string;
}

export interface SmsResponse {
  status: number;
  messageId: string;
}

/**
 * Send SMS via Hubtel. Cost: GHS 0.033 per SMS, 10K free/month.
 * Per business rules: no Arkesel, no WhatsApp.
 */
export async function sendSms(req: SmsRequest): Promise<SmsResponse> {
  if (!HUBTEL_CLIENT_ID || !HUBTEL_CLIENT_SECRET) {
    if (process.env['NODE_ENV'] !== 'production') {
      console.log(`[sms:dev] To ${req.to}: ${req.message}`);
      return { status: 0, messageId: 'dev-noop' };
    }
    throw new Error('HUBTEL_CLIENT_ID and HUBTEL_CLIENT_SECRET are required');
  }

  const auth = Buffer.from(`${HUBTEL_CLIENT_ID}:${HUBTEL_CLIENT_SECRET}`).toString('base64');

  const res = await fetch(HUBTEL_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      From: HUBTEL_SENDER_ID,
      To: normalizePhone(req.to),
      Content: req.message,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Hubtel SMS failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<SmsResponse>;
}

/** Normalize phone to E.164 (+233XXXXXXXXX) */
function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\s|-/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return '+233' + cleaned.slice(1);
  }
  return cleaned;
}

// ============================================================================
// Templates for common SMS messages
// ============================================================================

export function otpSms(otp: string): string {
  return `Your Besonc verification code is ${otp}. It expires in 5 minutes. Do not share this code.`;
}

export function orderPlacedSms(orderId: string, vendorName: string): string {
  return `Your Besonc order ${orderId} from ${vendorName} has been placed. Track it in the app.`;
}

export function riderAssignedSms(orderId: string, riderName: string, riderPhone: string): string {
  return `Besonc order ${orderId}: ${riderName} is on the way. Call ${riderPhone} if needed.`;
}

export function orderDeliveredSms(orderId: string): string {
  return `Your Besonc order ${orderId} has been delivered. Rate your experience in the app.`;
}

export function codReminderSms(amountGhs: string): string {
  return `Remittance due: GHS ${amountGhs}. Please remit today to avoid service suspension.`;
}
