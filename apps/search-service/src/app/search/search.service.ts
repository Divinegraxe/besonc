import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@besonc/shared-db';

export interface SearchHit {
  entityType: 'vendor' | 'item' | 'category';
  entityId: string;
  name: string;
  description?: string;
  city?: string;
  category?: string;
  rating?: number;
  priceRangeMin?: number;
  priceRangeMax?: number;
  imageUrl?: string;
  score: number;  // Postgres similarity score
}

export interface SearchFilters {
  city?: string;
  category?: string;
  minRating?: number;
  maxPrice?: number;
  minPrice?: number;
  openNow?: boolean;
}

/**
 * Search Service — full-text search across vendors, items, categories.
 *
 * v1 implementation: Postgres full-text search via tsvector +
 * to_tsquery. Faster than LIKE/ILIKE for real text queries, and
 * built into Postgres so no Elasticsearch needed at Cape Coast scale.
 *
 * Search index is maintained in the search_index table, populated by
 * this service from the canonical tables (vendor, item) on a schedule
 * (Sprint 7+) or via direct calls from catalogue-service on mutation
 * (Sprint 7+ event-driven).
 *
 * For v1 we also support simple ILIKE search as a fallback.
 */
@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    const count = await this.prisma.searchIndex.count();
    this.logger.log(`Search DB connected. ${count} indexed rows.`);
    if (count === 0) {
      this.logger.warn('Search index is empty. Run `pnpm run db:seed:search` to index vendors + items.');
    }
  }

  /**
   * Rebuild the entire search index from the canonical tables.
   * Idempotent: re-running replaces all rows.
   * Use after a major data import or for recovery.
   */
  async rebuildIndex(): Promise<{ vendors: number; items: number }> {
    // Clear existing
    await this.prisma.searchIndex.deleteMany({});

    // Index all vendors
    const vendors = await this.prisma.vendor.findMany({
      where: { isActive: true },
      include: { items: { select: { pricePesewas: true } } },
    });
    for (const v of vendors) {
      const minPrice = v.items.length > 0 ? Math.min(...v.items.map((i) => i.pricePesewas)) : null;
      const maxPrice = v.items.length > 0 ? Math.max(...v.items.map((i) => i.pricePesewas)) : null;
      await this.prisma.searchIndex.create({
        data: {
          entityType: 'vendor',
          entityId: v.id,
          searchText: `${v.name} ${v.description ?? ''} ${v.address} ${v.phone}`,
          city: v.city,
          category: v.category,
          isActive: v.isActive,
          rating: v.rating,
          priceRangeMin: minPrice,
          priceRangeMax: maxPrice,
          latitude: v.latitude,
          longitude: v.longitude,
          metadata: { name: v.name, description: v.description, logoUrl: v.logoUrl, bannerUrl: v.bannerUrl, type: v.type, isVerified: v.isVerified } as any,
        },
      });
    }

    // Index all items
    const items = await this.prisma.item.findMany({
      where: { available: true },
      include: { vendor: { select: { city: true, category: true, isActive: true } } },
    });
    for (const i of items) {
      await this.prisma.searchIndex.create({
        data: {
          entityType: 'item',
          entityId: i.id,
          searchText: `${i.name} ${i.description ?? ''} ${i.tags.join(' ')} ${i.category}`,
          city: i.vendor.city,
          category: i.vendor.category,
          isActive: i.vendor.isActive,
          rating: null,
          priceRangeMin: i.pricePesewas,
          priceRangeMax: i.pricePesewas,
          latitude: null,
          longitude: null,
          metadata: {
            name: i.name,
            description: i.description,
            imageUrl: i.imageUrl,
            vendorId: i.vendorId,
            category: i.category,
            pricePesewas: i.pricePesewas,
            tags: i.tags,
          } as any,
        },
      });
    }

    return { vendors: vendors.length, items: items.length };
  }

  /**
   * Add or update a single entity in the index.
   */
  async indexVendor(vendorId: string): Promise<void> {
    const v = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      include: { items: { select: { pricePesewas: true } } },
    });
    if (!v) return;
    const minPrice = v.items.length > 0 ? Math.min(...v.items.map((i) => i.pricePesewas)) : null;
    const maxPrice = v.items.length > 0 ? Math.max(...v.items.map((i) => i.pricePesewas)) : null;
    await this.prisma.searchIndex.upsert({
      where: { entityType_entityId: { entityType: 'vendor', entityId: v.id } },
      create: {
        entityType: 'vendor',
        entityId: v.id,
        searchText: `${v.name} ${v.description ?? ''} ${v.address} ${v.phone}`,
        city: v.city,
        category: v.category,
        isActive: v.isActive,
        rating: v.rating,
        priceRangeMin: minPrice,
        priceRangeMax: maxPrice,
        latitude: v.latitude,
        longitude: v.longitude,
        metadata: { name: v.name, description: v.description, logoUrl: v.logoUrl, bannerUrl: v.bannerUrl, type: v.type, isVerified: v.isVerified } as any,
      },
      update: {
        searchText: `${v.name} ${v.description ?? ''} ${v.address} ${v.phone}`,
        city: v.city,
        category: v.category,
        isActive: v.isActive,
        rating: v.rating,
        priceRangeMin: minPrice,
        priceRangeMax: maxPrice,
      },
    });
  }

  async indexItem(itemId: string): Promise<void> {
    const i = await this.prisma.item.findUnique({
      where: { id: itemId },
      include: { vendor: { select: { city: true, category: true, isActive: true } } },
    });
    if (!i) return;
    await this.prisma.searchIndex.upsert({
      where: { entityType_entityId: { entityType: 'item', entityId: i.id } },
      create: {
        entityType: 'item',
        entityId: i.id,
        searchText: `${i.name} ${i.description ?? ''} ${i.tags.join(' ')} ${i.category}`,
        city: i.vendor.city,
        category: i.vendor.category,
        isActive: i.vendor.isActive,
        priceRangeMin: i.pricePesewas,
        priceRangeMax: i.pricePesewas,
        metadata: { name: i.name, description: i.description, imageUrl: i.imageUrl, vendorId: i.vendorId, category: i.category, pricePesewas: i.pricePesewas, tags: i.tags } as any,
      },
      update: {
        searchText: `${i.name} ${i.description ?? ''} ${i.tags.join(' ')} ${i.category}`,
        city: i.vendor.city,
        category: i.vendor.category,
        isActive: i.vendor.isActive,
        priceRangeMin: i.pricePesewas,
        priceRangeMax: i.pricePesewas,
      },
    });
  }

  /**
   * Search for vendors + items matching a query.
   * Uses ILIKE for v1 (simple, works on any Postgres version). v2:
   * upgrade to tsvector + GIN index.
   */
  async search(query: string, filters: SearchFilters = {}, limit = 20): Promise<SearchHit[]> {
    if (!query || query.trim().length === 0) return [];
    const q = query.trim();

    // Build the where clause
    const where: any = {
      isActive: true,
      searchText: { contains: q, mode: 'insensitive' },
    };
    if (filters.city) where.city = filters.city;
    if (filters.category) where.category = filters.category as any;
    if (filters.minRating !== undefined) where.rating = { gte: filters.minRating };
    if (filters.maxPrice !== undefined) where.priceRangeMax = { lte: filters.maxPrice };
    if (filters.minPrice !== undefined) where.priceRangeMin = { gte: filters.minPrice };

    const rows = await this.prisma.searchIndex.findMany({
      where,
      take: limit,
      orderBy: { rating: 'desc' },
    });

    return rows.map((r) => {
      const meta = (r.metadata as any) ?? {};
      return {
        entityType: r.entityType as 'vendor' | 'item' | 'category',
        entityId: r.entityId,
        name: meta.name ?? r.searchText.split(' ').slice(0, 3).join(' '),
        description: meta.description,
        city: r.city ?? undefined,
        category: r.category ?? undefined,
        rating: r.rating ? Number(r.rating) : undefined,
        priceRangeMin: r.priceRangeMin ?? undefined,
        priceRangeMax: r.priceRangeMax ?? undefined,
        imageUrl: meta.imageUrl,
        // v1: simple scoring — vendors score higher than items, higher rating = higher score
        score: r.entityType === 'vendor' ? 1.0 + Number(r.rating ?? 0) * 0.1 : 0.5 + Number(r.rating ?? 0) * 0.05,
      };
    });
  }
}
