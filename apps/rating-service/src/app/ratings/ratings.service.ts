import { Injectable, Logger, OnModuleInit, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@besonc/shared-db';
import { RatingTarget } from '@prisma/client';

export interface Rating {
  id: string;
  orderId: string;
  raterId: string;
  raterType: string;
  targetType: RatingTarget;
  targetId: string;
  stars: number;
  comment?: string;
  tags: string[];
  isPublic: boolean;
  createdAt: string;
}

@Injectable()
export class RatingService implements OnModuleInit {
  private readonly logger = new Logger(RatingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    const count = await this.prisma.rating.count();
    this.logger.log(`Rating DB connected. ${count} ratings.`);
  }

  /**
   * Submit a rating. Idempotent on (orderId, raterId, targetType, targetId)
   * — re-submitting updates the existing rating rather than creating a duplicate.
   */
  async submit(input: {
    orderId: string;
    raterId: string;
    raterType: 'customer' | 'vendor' | 'rider';
    targetType: RatingTarget;
    targetId: string;
    stars: number;
    comment?: string;
    tags?: string[];
    isPublic?: boolean;
  }): Promise<Rating> {
    if (input.stars < 1 || input.stars > 5) {
      throw new BadRequestException('Stars must be 1-5');
    }
    // Validate target exists
    if (input.targetType === 'vendor') {
      const v = await this.prisma.vendor.findUnique({ where: { id: input.targetId } });
      if (!v) throw new NotFoundException(`Vendor ${input.targetId} not found`);
    } else if (input.targetType === 'rider') {
      const r = await this.prisma.rider.findUnique({ where: { id: input.targetId } });
      if (!r) throw new NotFoundException(`Rider ${input.targetId} not found`);
    } else if (input.targetType === 'item') {
      const i = await this.prisma.item.findUnique({ where: { id: input.targetId } });
      if (!i) throw new NotFoundException(`Item ${input.targetId} not found`);
    }

    const rating = await this.prisma.rating.upsert({
      where: {
        orderId_raterId_targetType_targetId: {
          orderId: input.orderId,
          raterId: input.raterId,
          targetType: input.targetType,
          targetId: input.targetId,
        },
      },
      create: {
        orderId: input.orderId,
        raterId: input.raterId,
        raterType: input.raterType,
        targetType: input.targetType,
        targetId: input.targetId,
        stars: input.stars,
        comment: input.comment,
        tags: input.tags ?? [],
        isPublic: input.isPublic ?? true,
      },
      update: {
        stars: input.stars,
        comment: input.comment,
        tags: input.tags ?? [],
        isPublic: input.isPublic ?? true,
      },
    });
    return this.toDomain(rating);
  }

  /**
   * Get all ratings for a target (e.g. all ratings for a vendor).
   */
  async getForTarget(targetType: RatingTarget, targetId: string, limit = 50, publicOnly = true): Promise<Rating[]> {
    const where: any = { targetType, targetId };
    if (publicOnly) where.isPublic = true;
    const rows = await this.prisma.rating.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((r) => this.toDomain(r));
  }

  /**
   * Get aggregate stats for a target.
   */
  async getStats(targetType: RatingTarget, targetId: string): Promise<{ count: number; average: number; distribution: Record<string, number> }> {
    const rows = await this.prisma.rating.findMany({
      where: { targetType, targetId, isPublic: true },
      select: { stars: true },
    });
    if (rows.length === 0) return { count: 0, average: 0, distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 } };
    const distribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    let sum = 0;
    for (const r of rows) {
      sum += r.stars;
      distribution[String(r.stars)] = (distribution[String(r.stars)] ?? 0) + 1;
    }
    return { count: rows.length, average: Math.round((sum / rows.length) * 10) / 10, distribution };
  }

  /**
   * Get all ratings submitted by a single user.
   */
  async getByRater(raterId: string, limit = 50): Promise<Rating[]> {
    const rows = await this.prisma.rating.findMany({
      where: { raterId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((r) => this.toDomain(r));
  }

  /**
   * Get all ratings for an order (used by the order detail screen to
   * show "rate your order" prompts).
   */
  async getForOrder(orderId: string): Promise<Rating[]> {
    const rows = await this.prisma.rating.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toDomain(r));
  }

  private toDomain(r: any): Rating {
    return {
      id: r.id,
      orderId: r.orderId,
      raterId: r.raterId,
      raterType: r.raterType,
      targetType: r.targetType,
      targetId: r.targetId,
      stars: r.stars,
      comment: r.comment ?? undefined,
      tags: r.tags,
      isPublic: r.isPublic,
      createdAt: r.createdAt.toISOString(),
    };
  }
}
