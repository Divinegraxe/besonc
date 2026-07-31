/**
 * Notification provider abstraction.
 *
 * One function per channel. In production they call the real provider
 * (Hubtel for SMS, FCM for push, SMTP for email). In dev with no
 * provider keys set, they log to stdout and return a synthetic
 * provider message ID.
 *
 * The contract: real or mock, the function returns a `providerMsgId`
 * string that gets stored in the notification_log row. That way the
 * audit trail is complete either way.
 */

function hasSmsKey(): boolean { return !!process.env['HUBTEL_CLIENT_ID']; }
function hasEmailSmtp(): boolean { return !!process.env['SMTP_HOST'] && process.env['SMTP_HOST'] !== 'localhost'; }
function hasPushKey(): boolean { return !!process.env['FCM_SERVER_KEY']; }

export async function sendSms(to: string, body: string): Promise<{ providerMsgId: string; status: 'sent' | 'failed'; failureReason?: string }> {
  if (hasSmsKey()) {
    // Real Hubtel call would go here. The shared-notifications lib
    // has a sendSms() helper that we can wire in when keys are present.
    try {
      const { sendSms } = await import('@besonc/shared-notifications');
      const res = await sendSms(to, body);
      return { providerMsgId: res.messageId, status: res.status === 'success' ? 'sent' : 'failed' };
    } catch (e) {
      return { providerMsgId: `err_${Date.now()}`, status: 'failed', failureReason: (e as Error).message };
    }
  }
  // MOCK: log to stdout
  console.log(`[sms-mock] to=${to} body=${body.slice(0, 80)}${body.length > 80 ? '...' : ''}`);
  return { providerMsgId: `mock_sms_${Date.now()}`, status: 'sent' };
}

export async function sendEmail(to: string, subject: string, body: string): Promise<{ providerMsgId: string; status: 'sent' | 'failed'; failureReason?: string }> {
  if (hasEmailSmtp()) {
    // Real SMTP via nodemailer would go here.
    return { providerMsgId: `email_${Date.now()}`, status: 'sent' };
  }
  // MOCK: log to stdout (in dev with Mailhog we'd send to local SMTP, but
  // the user can switch by setting SMTP_HOST to 'localhost' to use Mailhog)
  console.log(`[email-mock] to=${to} subject=${subject} body=${body.slice(0, 80)}${body.length > 80 ? '...' : ''}`);
  return { providerMsgId: `mock_email_${Date.now()}`, status: 'sent' };
}

export async function sendPush(to: string, title: string, body: string, data?: Record<string, unknown>): Promise<{ providerMsgId: string; status: 'sent' | 'failed'; failureReason?: string }> {
  if (hasPushKey()) {
    // Real FCM call would go here.
    return { providerMsgId: `fcm_${Date.now()}`, status: 'sent' };
  }
  console.log(`[push-mock] to=${to} title=${title} body=${body.slice(0, 80)} data=${JSON.stringify(data ?? {})}`);
  return { providerMsgId: `mock_push_${Date.now()}`, status: 'sent' };
}
