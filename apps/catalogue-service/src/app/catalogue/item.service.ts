import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@besonc/shared-db';

export interface ItemAddon {
  id: string;
  name: string;
  options: { id: string; name: string; priceDeltaPesewas: number }[];
  required: boolean;
  multiSelect: boolean;
}

export interface Item {
  id: string;
  vendorId: string;
  name: string;
  description?: string;
  pricePesewas: number;
  imageUrl?: string;
  available: boolean;
  category: string;          // "Main", "Sides", "Drinks", etc
  addons?: ItemAddon[];
  variants?: { id: string; name: string; priceDeltaPesewas: number }[];
  preparationMinutes: number;
  tags?: string[];           // "spicy", "vegetarian", "popular"
}

/**
 * Item Service — vendor menu items. Backed by Postgres via Prisma.
 */
@Injectable()
export class ItemService implements OnModuleInit {
  private readonly logger = new Logger(ItemService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    const count = await this.prisma.item.count();
    this.logger.log(`Catalogue DB: ${count} menu items.`);
    if (count === 0) {
      this.logger.warn(
        'Items table is empty. Run `pnpm run db:seed:catalogue` to insert the demo menu items.',
      );
    }
  }

  async create(item: Omit<Item, never>): Promise<Item> {
    const row = await this.prisma.item.create({
      data: {
        id: item.id,
        vendorId: item.vendorId,
        name: item.name,
        description: item.description,
        pricePesewas: item.pricePesewas,
        imageUrl: item.imageUrl,
        available: item.available,
        category: item.category,
        preparationMinutes: item.preparationMinutes,
        tags: item.tags ?? [],
        // Prisma's Json fields accept any JSON-serializable value
        addons: item.addons ? (item.addons as any) : null,
        variants: item.variants ? (item.variants as any) : null,
      },
    });
    return this.toDomain(row);
  }

  async getById(id: string): Promise<Item | null> {
    const row = await this.prisma.item.findUnique({ where: { id } });
    if (!row) return null;
    return this.toDomain(row);
  }

  async listByVendor(vendorId: string): Promise<Item[]> {
    const rows = await this.prisma.item.findMany({
      where: { vendorId, available: true },
      orderBy: { category: 'asc' },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async listByIds(ids: string[]): Promise<Item[]> {
    if (ids.length === 0) return [];
    const rows = await this.prisma.item.findMany({
      where: { id: { in: ids }, available: true },
    });
    return rows.map((r) => this.toDomain(r));
  }

  // ── Mapping helper ────────────────────────────────────────────────

  private toDomain(row: {
    id: string;
    vendorId: string;
    name: string;
    description: string | null;
    pricePesewas: number;
    imageUrl: string | null;
    available: boolean;
    category: string;
    preparationMinutes: number;
    tags: string[];
    addons: any;
    variants: any;
  }): Item {
    return {
      id: row.id,
      vendorId: row.vendorId,
      name: row.name,
      description: row.description ?? undefined,
      pricePesewas: row.pricePesewas,
      imageUrl: row.imageUrl ?? undefined,
      available: row.available,
      category: row.category,
      preparationMinutes: row.preparationMinutes,
      tags: row.tags,
      addons: row.addons ?? undefined,
      variants: row.variants ?? undefined,
    };
  }
}
