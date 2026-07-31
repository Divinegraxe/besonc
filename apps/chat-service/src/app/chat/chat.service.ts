import { Injectable, Logger, OnModuleInit, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@besonc/shared-db';

export interface ChatMessage {
  id: string;
  threadId: string;
  orderId: string;
  senderId: string;
  senderType: 'customer' | 'vendor' | 'rider' | 'system';
  body: string;
  attachmentUrl?: string;
  readAt?: string;
  createdAt: string;
}

export interface ChatThread {
  id: string;
  orderId: string;
  customerId: string;
  vendorId?: string;
  riderId?: string;
  createdAt: string;
  lastMessageAt: string;
  unreadCount?: number;
}

/**
 * Chat Service — in-app chat between customer, vendor, and rider for a
 * specific order. v1: one thread per order, polling for new messages.
 * v2: WebSocket gateway for push delivery.
 */
@Injectable()
export class ChatService implements OnModuleInit {
  private readonly logger = new Logger(ChatService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    const count = await this.prisma.chatThread.count();
    this.logger.log(`Chat DB connected. ${count} threads.`);
  }

  /**
   * Get or create the chat thread for an order. Idempotent.
   */
  async getOrCreateThread(input: {
    orderId: string;
    customerId: string;
    vendorId?: string;
    riderId?: string;
  }): Promise<ChatThread> {
    const existing = await this.prisma.chatThread.findUnique({ where: { orderId: input.orderId } });
    if (existing) {
      // Update vendor/rider if they're newly assigned
      if (input.vendorId && !existing.vendorId) {
        await this.prisma.chatThread.update({ where: { id: existing.id }, data: { vendorId: input.vendorId } });
      }
      if (input.riderId && !existing.riderId) {
        await this.prisma.chatThread.update({ where: { id: existing.id }, data: { riderId: input.riderId } });
      }
      return this.threadToDomain({ ...existing, vendorId: input.vendorId ?? existing.vendorId, riderId: input.riderId ?? existing.riderId });
    }
    const created = await this.prisma.chatThread.create({
      data: {
        orderId: input.orderId,
        customerId: input.customerId,
        vendorId: input.vendorId,
        riderId: input.riderId,
      },
    });
    return this.threadToDomain(created);
  }

  /**
   * Send a message. Validates that the sender is part of the thread.
   */
  async sendMessage(input: {
    orderId: string;
    senderId: string;
    senderType: 'customer' | 'vendor' | 'rider' | 'system';
    body: string;
    attachmentUrl?: string;
  }): Promise<ChatMessage> {
    if (!input.body.trim() && !input.attachmentUrl) {
      throw new BadRequestException('Message body or attachment required');
    }
    const thread = await this.prisma.chatThread.findUnique({ where: { orderId: input.orderId } });
    if (!thread) throw new NotFoundException(`No chat thread for order ${input.orderId}`);

    // Authorization: sender must be one of the thread participants
    const isParticipant =
      (input.senderType === 'customer' && input.senderId === thread.customerId) ||
      (input.senderType === 'vendor' && input.senderId === thread.vendorId) ||
      (input.senderType === 'rider' && input.senderId === thread.riderId) ||
      input.senderType === 'system';
    if (!isParticipant) {
      throw new BadRequestException(`Sender ${input.senderId} (${input.senderType}) is not part of this thread`);
    }

    const msg = await this.prisma.$transaction([
      this.prisma.chatMessage.create({
        data: {
          threadId: thread.id,
          senderId: input.senderId,
          senderType: input.senderType,
          body: input.body,
          attachmentUrl: input.attachmentUrl,
        },
      }),
      this.prisma.chatThread.update({
        where: { id: thread.id },
        data: { lastMessageAt: new Date() },
      }),
    ]);
    return this.messageToDomain(msg[0]);
  }

  /**
   * Get all messages in a thread, oldest first.
   */
  async getMessages(orderId: string, limit = 100, beforeId?: string): Promise<ChatMessage[]> {
    const thread = await this.prisma.chatThread.findUnique({ where: { orderId } });
    if (!thread) return [];
    const where: any = { threadId: thread.id };
    if (beforeId) {
      const before = await this.prisma.chatMessage.findUnique({ where: { id: beforeId } });
      if (before) where.createdAt = { lt: before.createdAt };
    }
    const rows = await this.prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.reverse().map((r) => this.messageToDomain(r));
  }

  /**
   * Mark all messages in a thread as read by the given user.
   * (In v1 we just track per-message readAt; this is a shortcut.)
   */
  async markRead(orderId: string, userId: string): Promise<{ marked: number }> {
    const thread = await this.prisma.chatThread.findUnique({ where: { orderId } });
    if (!thread) throw new NotFoundException(`No chat thread for order ${orderId}`);
    const result = await this.prisma.chatMessage.updateMany({
      where: {
        threadId: thread.id,
        senderId: { not: userId },
        readAt: null,
      },
      data: { readAt: new Date() },
    });
    return { marked: result.count };
  }

  /**
   * Unread count for a user across all their threads.
   */
  async getUnreadCount(userId: string): Promise<number> {
    const threads = await this.prisma.chatThread.findMany({
      where: {
        OR: [
          { customerId: userId },
          { vendorId: userId },
          { riderId: userId },
        ],
      },
      select: { id: true },
    });
    if (threads.length === 0) return 0;
    return this.prisma.chatMessage.count({
      where: {
        threadId: { in: threads.map((t) => t.id) },
        senderId: { not: userId },
        readAt: null,
      },
    });
  }

  // ── Mapping ───────────────────────────────────────────────────────

  private threadToDomain(t: any): ChatThread {
    return {
      id: t.id,
      orderId: t.orderId,
      customerId: t.customerId,
      vendorId: t.vendorId ?? undefined,
      riderId: t.riderId ?? undefined,
      createdAt: t.createdAt.toISOString(),
      lastMessageAt: t.lastMessageAt.toISOString(),
    };
  }

  private messageToDomain(m: any): ChatMessage {
    return {
      id: m.id,
      threadId: m.threadId,
      orderId: '', // caller can look up from thread
      senderId: m.senderId,
      senderType: m.senderType,
      body: m.body,
      attachmentUrl: m.attachmentUrl ?? undefined,
      readAt: m.readAt?.toISOString(),
      createdAt: m.createdAt.toISOString(),
    };
  }
}
