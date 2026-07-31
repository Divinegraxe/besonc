import { Injectable } from '@nestjs/common';

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
 * Item Service — vendor menu items.
 * Sprint 3-4: in-memory. Seeded with sample data per vendor.
 */
@Injectable()
export class ItemService {
  private readonly items = new Map<string, Item>();
  private readonly byVendor = new Map<string, string[]>();

  constructor() {
    this.seed();
  }

  private seed(): void {
    const items: Item[] = [
      // Auntie Ama Kitchen (YDV-2026-0001)
      this.makeItem('itm-001', 'YDV-2026-0001', 'Banku & Tilapia', 4500, 20, 'Main', ['popular', 'ghanaian'], {
        imageUrl: 'https://cdn.besonc.gh/items/banku-tilapia.jpg',
        description: 'Fresh tilapia from the Cape Coast coast, served with hot banku and pepper.',
      }),
      this.makeItem('itm-002', 'YDV-2026-0001', 'Fufu & Light Soup', 4000, 25, 'Main', ['popular', 'ghanaian'], {
        description: 'Pounded fufu with light soup (goat meat or fish).',
        addons: [
          {
            id: 'add-protein', name: 'Protein', required: true, multiSelect: false,
            options: [
              { id: 'goat', name: 'Goat Meat', priceDeltaPesewas: 0 },
              { id: 'fish', name: 'Fish', priceDeltaPesewas: 0 },
              { id: 'chicken', name: 'Chicken', priceDeltaPesewas: 0 },
            ],
          },
        ],
      }),
      this.makeItem('itm-003', 'YDV-2026-0001', 'Jollof Rice with Chicken', 3500, 15, 'Main', ['popular'], {
        description: 'Smoky party-style jollof with grilled chicken.',
      }),
      this.makeItem('itm-004', 'YDV-2026-0001', 'Sobolo (Hibiscus Drink)', 800, 5, 'Drinks', []),
      this.makeItem('itm-005', 'YDV-2026-0001', 'Kelewele', 500, 10, 'Sides', ['spicy'], {
        description: 'Spicy fried plantain cubes with ginger and pepper.',
      }),

      // Cape Coast Mall Foods (YDV-2026-0002)
      this.makeItem('itm-010', 'YDV-2026-0002', 'Margherita Pizza', 5500, 18, 'Main', ['vegetarian'], {
        description: 'Classic margherita with fresh mozzarella and basil.',
        variants: [
          { id: 'small', name: 'Small (10")', priceDeltaPesewas: -1500 },
          { id: 'medium', name: 'Medium (12")', priceDeltaPesewas: 0 },
          { id: 'large', name: 'Large (14")', priceDeltaPesewas: 1500 },
        ],
      }),
      this.makeItem('itm-011', 'YDV-2026-0002', 'Beef Burger', 3800, 15, 'Main', ['popular']),
      this.makeItem('itm-012', 'YDV-2026-0002', 'Chicken Wings (6 pc)', 3200, 15, 'Sides', []),
      this.makeItem('itm-013', 'YDV-2026-0002', 'French Fries', 1500, 8, 'Sides', []),

      // Kotokuraba Fresh Foods (YDV-2026-0003)
      this.makeItem('itm-020', 'YDV-2026-0003', 'Fresh Tomatoes (1 bowl)', 800, 0, 'Vegetables', []),
      this.makeItem('itm-021', 'YDV-2026-0003', 'Red Onions (1 bag)', 1200, 0, 'Vegetables', []),
      this.makeItem('itm-022', 'YDV-2026-0003', 'Fresh Fish (per kg)', 6500, 0, 'Meat & Fish', []),
      this.makeItem('itm-023', 'YDV-2026-0003', 'Ripe Plantains (bunch)', 1500, 0, 'Vegetables', []),

      // PhoneFix (YDV-2026-0004)
      this.makeItem('itm-030', 'YDV-2026-0004', 'iPhone Charger (Lightning)', 4500, 0, 'Phones', []),
      this.makeItem('itm-031', 'YDV-2026-0004', 'USB-C Cable (1m)', 2500, 0, 'Phones', []),
      this.makeItem('itm-032', 'YDV-2026-0004', 'Earphones (Wired)', 1800, 0, 'Audio', []),
      this.makeItem('itm-033', 'YDV-2026-0004', 'Phone Case (Universal)', 1500, 0, 'Accessories', []),

      // Cape Coast Pharmacy (YDV-2026-0005)
      this.makeItem('itm-040', 'YDV-2026-0005', 'Paracetamol 500mg (20 tabs)', 800, 0, 'OTC', []),
      this.makeItem('itm-041', 'YDV-2026-0005', 'Vitamin C 1000mg (30 tabs)', 3500, 0, 'Vitamins', []),
      this.makeItem('itm-042', 'YDV-2026-0005', 'ORS Sachets (10)', 2000, 0, 'OTC', []),
    ];
    for (const i of items) this.create(i);
  }

  private makeItem(
    id: string,
    vendorId: string,
    name: string,
    pricePesewas: number,
    preparationMinutes: number,
    category: string,
    tags: string[],
    extra: Partial<Item> = {},
  ): Item {
    return {
      id,
      vendorId,
      name,
      pricePesewas,
      category,
      preparationMinutes,
      available: true,
      tags,
      imageUrl: extra.imageUrl ?? `https://cdn.besonc.gh/items/${id}.jpg`,
      description: extra.description,
      addons: extra.addons,
      variants: extra.variants,
    };
  }

  create(item: Item): Item {
    this.items.set(item.id, item);
    if (!this.byVendor.has(item.vendorId)) this.byVendor.set(item.vendorId, []);
    this.byVendor.get(item.vendorId)!.push(item.id);
    return item;
  }

  getById(id: string): Item | null {
    return this.items.get(id) ?? null;
  }

  listByVendor(vendorId: string): Item[] {
    const ids = this.byVendor.get(vendorId) ?? [];
    return ids.map((id) => this.items.get(id)!).filter(Boolean);
  }

  listByIds(ids: string[]): Item[] {
    return ids.map((id) => this.items.get(id)!).filter(Boolean);
  }
}
