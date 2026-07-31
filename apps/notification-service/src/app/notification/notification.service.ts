import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@besonc/shared-db';
import { sendSms, sendEmail, sendPush } from './providers';
import { NotificationChannel, NotificationStatus } from '@prisma/client';

export interface NotificationTemplate {
  name: string;
  sms?: (vars: Record<string, string>) => string;
  email?: { subject: (vars: Record<string, string>) => string; body: (vars: Record<string, string>) => string };
  push?: (vars: Record<string, string>) => { title: string; body: string };
}

/**
 * Built-in notification templates. Each is a function that takes the
 * template variables and returns the formatted text.
 *
 * The set grows as the platform adds more events. To add a new one,
 * register it in BUILTIN_TEMPLATES below + call it from
 * notificationService.send() (or directly via POST /notifications/send).
 */
export const BUILTIN_TEMPLATES: Record<string, NotificationTemplate> = {
  order_placed: {
    sms: (v) => `BESONC: Order ${v.orderId} placed. Total: GHS ${v.totalGhs}. We'll notify when vendor accepts.`,
    email: {
      subject: (v) => `Order ${v.orderId} confirmed`,
      body: (v) => `Hi ${v.customerName},\n\nWe've received your order from ${v.vendorName}. Total: GHS ${v.totalGhs}.\n\nTrack at: ${v.trackingUrl}\n\nThanks,\nBESONC`,
    },
    push: (v) => ({ title: 'Order placed', body: `Your order from ${v.vendorName} is confirmed.` }),
  },
  vendor_accepted: {
    sms: (v) => `BESONC: ${v.vendorName} accepted your order. Estimated prep: ${v.prepMinutes} min.`,
    push: (v) => ({ title: 'Vendor accepted', body: `${v.vendorName} is preparing your order.` }),
  },
  rider_assigned: {
    sms: (v) => `BESONC: ${v.riderName} is on the way to pick up your order. ETA: ${v.etaMinutes} min.`,
    push: (v) => ({ title: 'Rider assigned', body: `${v.riderName} will pick up your order shortly.` }),
  },
  rider_arrived: {
    sms: (v) => `BESONC: Your rider is at the vendor. Order arriving soon!`,
    push: (v) => ({ title: 'Rider at vendor', body: 'Your rider is picking up your order now.' }),
  },
  order_delivered: {
    sms: (v) => `BESONC: Order ${v.orderId} delivered. Total: GHS ${v.totalGhs}. Rate your order: ${v.rateUrl}`,
    push: (v) => ({ title: 'Delivered!', body: 'Your order has arrived. Enjoy!' }),
  },
  rider_new_job: {
    sms: (v) => `BESONC: New delivery available! Pickup at ${v.pickupArea}, deliver to ${v.dropoffArea}. ${v.estimateGhs} GHS.`,
  },
  kyc_approved: {
    sms: (v) => `BESONC: KYC approved! You can now accept deliveries. Open the rider app to start.`,
  },
  kyc_rejected: {
    sms: (v) => `BESONC: KYC rejected. Reason: ${v.reason}. Please contact support.`,
  },
};

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    const count = await this.prisma.notificationLog.count();
    this.logger.log(`Notification DB connected. ${count} notifications in log.`);
  }

  /**
   * Send a notification by template name. Looks up the template,
   * renders it, and sends to all requested channels.
   */
  async sendTemplate(input: {
    template: string;
    variables: Record<string, string>;
    to: { userId?: string; phone?: string; email?: string; pushToken?: string };
    channels: Array<'sms' | 'email' | 'push' | 'in_app'>;
    relatedOrderId?: string;
  }): Promise<{ sent: number; failed: number; notificationIds: string[] }> {
    const tpl = BUILTIN_TEMPLATES[input.template];
    if (!tpl) throw new Error(`Unknown template: ${input.template}`);
    const ids: string[] = [];
    let sent = 0, failed = 0;

    for (const channel of input.channels) {
      try {
        let result: { providerMsgId: string; status: 'sent' | 'failed'; failureReason?: string };
        let body: string;
        let subject: string | undefined;
        let pushData: Record<string, unknown> | undefined;

        if (channel === 'sms' && tpl.sms && input.to.phone) {
          body = tpl.sms(input.variables);
          result = await sendSms(input.to.phone, body);
        } else if (channel === 'email' && tpl.email && input.to.email) {
          subject = tpl.email.subject(input.variables);
          body = tpl.email.body(input.variables);
          result = await sendEmail(input.to.email, subject, body);
        } else if (channel === 'push' && tpl.push && input.to.pushToken) {
          const { title, body: pushBody } = tpl.push(input.variables);
          body = `${title}\n${pushBody}`;
          subject = title;
          pushData = input.variables;
          result = await sendPush(input.to.pushToken, title, pushBody, pushData);
        } else if (channel === 'in_app') {
          // In-app: just write to the log; the app polls or uses WebSocket
          // to pick it up (Sprint 5+ for the WebSocket gateway)
          result = { providerMsgId: `inapp_${Date.now()}`, status: 'sent' };
          body = (tpl.sms ?? tpl.push?.bind(tpl) ?? (() => ''))(input.variables);
        } else {
          // Channel requested but no template + recipient combination available
          continue;
        }

        const log = await this.prisma.notificationLog.create({
          data: {
            channel: channel as NotificationChannel,
            status: result.status as NotificationStatus,
            recipientUserId: input.to.userId,
            to: input.to.phone ?? input.to.email ?? input.to.pushToken ?? '',
            template: input.template,
            subject,
            body,
            data: input.variables as any,
            relatedOrderId: input.relatedOrderId,
            providerMsgId: result.providerMsgId,
            failureReason: result.failureReason,
            sentAt: result.status === 'sent' ? new Date() : undefined,
          },
        });
        ids.push(log.id);
        if (result.status === 'sent') sent++; else failed++;
      } catch (err) {
        this.logger.error(`Failed to send ${channel} for template ${input.template}: ${(err as Error).message}`);
        failed++;
      }
    }
    return { sent, failed, notificationIds: ids };
  }

  /**
   * Direct send (no template). For ad-hoc messages.
   */
  async sendDirect(input: {
    channel: 'sms' | 'email' | 'push';
    to: string;
    body: string;
    subject?: string;
    relatedOrderId?: string;
    recipientUserId?: string;
  }): Promise<{ id: string; status: 'sent' | 'failed' }> {
    let result: { providerMsgId: string; status: 'sent' | 'failed'; failureReason?: string };
    if (input.channel === 'sms') result = await sendSms(input.to, input.body);
    else if (input.channel === 'email') result = await sendEmail(input.to, input.subject ?? '', input.body);
    else result = await sendPush(input.to, input.subject ?? '', input.body);

    const log = await this.prisma.notificationLog.create({
      data: {
        channel: input.channel as NotificationChannel,
        status: result.status as NotificationStatus,
        recipientUserId: input.recipientUserId,
        to: input.to,
        subject: input.subject,
        body: input.body,
        relatedOrderId: input.relatedOrderId,
        providerMsgId: result.providerMsgId,
        failureReason: result.failureReason,
        sentAt: result.status === 'sent' ? new Date() : undefined,
      },
    });
    return { id: log.id, status: result.status };
  }

  async getInbox(userId: string, limit = 50): Promise<any[]> {
    const rows = await this.prisma.notificationLog.findMany({
      where: { recipientUserId: userId, channel: 'in_app' },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows;
  }

  async markRead(id: string): Promise<void> {
    await this.prisma.notificationLog.update({
      where: { id },
      data: { readAt: new Date(), status: 'read' },
    });
  }

  async listTemplates(): Promise<string[]> {
    return Object.keys(BUILTIN_TEMPLATES);
  }
}
