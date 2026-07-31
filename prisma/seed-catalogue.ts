/**
 * Catalogue seed script (5 vendors + 20 items).
 *
 * Idempotent: skips rows that already exist (by ID).
 * Safe to run multiple times.
 *
 * Usage:
 *   pnpm run db:seed:catalogue
 */
import { PrismaClient, ServiceCode, VendorType } from '@prisma/client';

const prisma = new PrismaClient();

function defaultHours() {
  return Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i,
    openTime: '07:00',
    closeTime: '22:00',
    isClosed: i === 0, // closed Sundays
  }));
}

const vendors = [
  {
    id: 'YDV-2026-0001',
    name: 'Auntie Ama Kitchen',
    description: 'Authentic Cape Coast home cooking. Banku & tilapia, fufu & light soup.',
    type: VendorType.individual,
    city: 'CC',
    category: ServiceCode.FO,
    rating: 4.7,
    reviewCount: 142,
    prepTimeMinutes: 25,
    minimumOrderPesewas: 2000,
    deliveryFeePesewas: 500,
    address: 'Pedu, Cape Coast',
    latitude: 5.1036,
    longitude: -1.2466,
    phone: '+233241234567',
  },
  {
    id: 'YDV-2026-0002',
    name: 'Cape Coast Mall Foods',
    description: 'Multi-cuisine food court. Pizza, burgers, Chinese, local dishes.',
    type: VendorType.business,
    city: 'CC',
    category: ServiceCode.FO,
    rating: 4.3,
    reviewCount: 87,
    prepTimeMinutes: 20,
    minimumOrderPesewas: 1500,
    deliveryFeePesewas: 500,
    address: 'Cape Coast Mall, Bakano',
    latitude: 5.1056,
    longitude: -1.2444,
    phone: '+233501234567',
  },
  {
    id: 'YDV-2026-0003',
    name: 'Kotokuraba Fresh Foods',
    description: 'Fresh tomatoes, onions, peppers, plantain, fish, meat. Direct from market.',
    type: VendorType.individual,
    city: 'CC',
    category: ServiceCode.GR,
    rating: 4.5,
    reviewCount: 56,
    prepTimeMinutes: 30,
    minimumOrderPesewas: 1000,
    deliveryFeePesewas: 700,
    address: 'Kotokuraba Market',
    latitude: 5.1100,
    longitude: -1.2430,
    phone: '+233208765432',
  },
  {
    id: 'YDV-2026-0004',
    name: 'PhoneFix Cape Coast',
    description: 'Phones, chargers, earphones, screen protectors. Genuine products.',
    type: VendorType.business,
    city: 'CC',
    category: ServiceCode.SH,
    rating: 4.4,
    reviewCount: 31,
    prepTimeMinutes: 15,
    minimumOrderPesewas: 1000,
    deliveryFeePesewas: 800,
    address: 'Kotokuraba',
    latitude: 5.1095,
    longitude: -1.2420,
    phone: '+233244556677',
  },
  {
    id: 'YDV-2026-0005',
    name: 'Cape Coast Pharmacy',
    description: 'Licensed pharmacy. Prescriptions, OTC medicines, health products.',
    type: VendorType.business,
    city: 'CC',
    category: ServiceCode.PH,
    rating: 4.8,
    reviewCount: 95,
    prepTimeMinutes: 10,
    minimumOrderPesewas: 0,
    deliveryFeePesewas: 1000,
    address: 'Adisadel',
    latitude: 5.1150,
    longitude: -1.2400,
    phone: '+233244112233',
  },
];

const items = [
  { id: 'itm-001', vendorId: 'YDV-2026-0001', name: 'Banku & Tilapia', pricePesewas: 4500, preparationMinutes: 20, category: 'Main', tags: ['popular', 'ghanaian'], description: 'Fresh tilapia from the Cape Coast coast, served with hot banku and pepper.' },
  { id: 'itm-002', vendorId: 'YDV-2026-0001', name: 'Fufu & Light Soup', pricePesewas: 4000, preparationMinutes: 25, category: 'Main', tags: ['popular', 'ghanaian'], description: 'Pounded fufu with light soup (goat meat or fish).', addons: [{ id: 'add-protein', name: 'Protein', required: true, multiSelect: false, options: [{ id: 'goat', name: 'Goat Meat', priceDeltaPesewas: 0 }, { id: 'fish', name: 'Fish', priceDeltaPesewas: 0 }, { id: 'chicken', name: 'Chicken', priceDeltaPesewas: 0 }] }] },
  { id: 'itm-003', vendorId: 'YDV-2026-0001', name: 'Jollof Rice with Chicken', pricePesewas: 3500, preparationMinutes: 15, category: 'Main', tags: ['popular'], description: 'Smoky party-style jollof with grilled chicken.' },
  { id: 'itm-004', vendorId: 'YDV-2026-0001', name: 'Sobolo (Hibiscus Drink)', pricePesewas: 800, preparationMinutes: 5, category: 'Drinks', tags: [] },
  { id: 'itm-005', vendorId: 'YDV-2026-0001', name: 'Kelewele', pricePesewas: 500, preparationMinutes: 10, category: 'Sides', tags: ['spicy'], description: 'Spicy fried plantain cubes with ginger and pepper.' },
  { id: 'itm-010', vendorId: 'YDV-2026-0002', name: 'Margherita Pizza', pricePesewas: 5500, preparationMinutes: 18, category: 'Main', tags: ['vegetarian'], description: 'Classic margherita with fresh mozzarella and basil.', variants: [{ id: 'small', name: 'Small (10")', priceDeltaPesewas: -1500 }, { id: 'medium', name: 'Medium (12")', priceDeltaPesewas: 0 }, { id: 'large', name: 'Large (14")', priceDeltaPesewas: 1500 }] },
  { id: 'itm-011', vendorId: 'YDV-2026-0002', name: 'Beef Burger', pricePesewas: 3800, preparationMinutes: 15, category: 'Main', tags: ['popular'] },
  { id: 'itm-012', vendorId: 'YDV-2026-0002', name: 'Chicken Wings (6 pc)', pricePesewas: 3200, preparationMinutes: 15, category: 'Sides', tags: [] },
  { id: 'itm-013', vendorId: 'YDV-2026-0002', name: 'French Fries', pricePesewas: 1500, preparationMinutes: 8, category: 'Sides', tags: [] },
  { id: 'itm-020', vendorId: 'YDV-2026-0003', name: 'Fresh Tomatoes (1 bowl)', pricePesewas: 800, preparationMinutes: 0, category: 'Vegetables', tags: [] },
  { id: 'itm-021', vendorId: 'YDV-2026-0003', name: 'Red Onions (1 bag)', pricePesewas: 1200, preparationMinutes: 0, category: 'Vegetables', tags: [] },
  { id: 'itm-022', vendorId: 'YDV-2026-0003', name: 'Fresh Fish (per kg)', pricePesewas: 6500, preparationMinutes: 0, category: 'Meat & Fish', tags: [] },
  { id: 'itm-023', vendorId: 'YDV-2026-0003', name: 'Ripe Plantains (bunch)', pricePesewas: 1500, preparationMinutes: 0, category: 'Vegetables', tags: [] },
  { id: 'itm-030', vendorId: 'YDV-2026-0004', name: 'iPhone Charger (Lightning)', pricePesewas: 4500, preparationMinutes: 0, category: 'Phones', tags: [] },
  { id: 'itm-031', vendorId: 'YDV-2026-0004', name: 'USB-C Cable (1m)', pricePesewas: 2500, preparationMinutes: 0, category: 'Phones', tags: [] },
  { id: 'itm-032', vendorId: 'YDV-2026-0004', name: 'Earphones (Wired)', pricePesewas: 1800, preparationMinutes: 0, category: 'Audio', tags: [] },
  { id: 'itm-033', vendorId: 'YDV-2026-0004', name: 'Phone Case (Universal)', pricePesewas: 1500, preparationMinutes: 0, category: 'Accessories', tags: [] },
  { id: 'itm-040', vendorId: 'YDV-2026-0005', name: 'Paracetamol 500mg (20 tabs)', pricePesewas: 800, preparationMinutes: 0, category: 'OTC', tags: [] },
  { id: 'itm-041', vendorId: 'YDV-2026-0005', name: 'Vitamin C 1000mg (30 tabs)', pricePesewas: 3500, preparationMinutes: 0, category: 'Vitamins', tags: [] },
  { id: 'itm-042', vendorId: 'YDV-2026-0005', name: 'ORS Sachets (10)', pricePesewas: 2000, preparationMinutes: 0, category: 'OTC', tags: [] },
];

async function main() {
  console.log('🌱 Seeding catalogue database...');
  for (const v of vendors) {
    const existing = await prisma.vendor.findUnique({ where: { id: v.id } });
    if (existing) {
      console.log(`  ✓ Vendor ${v.id} (${v.name}) already exists, skipping`);
      continue;
    }
    await prisma.vendor.create({
      data: { ...v, logoUrl: `https://cdn.besonc.gh/vendors/${v.id}/logo.png`, hours: { create: defaultHours() } },
    });
    console.log(`  + Inserted vendor ${v.id} (${v.name})`);
  }
  for (const i of items) {
    const existing = await prisma.item.findUnique({ where: { id: i.id } });
    if (existing) {
      console.log(`  ✓ Item ${i.id} (${i.name}) already exists, skipping`);
      continue;
    }
    await prisma.item.create({
      data: {
        id: i.id, vendorId: i.vendorId, name: i.name,
        description: (i as any).description, pricePesewas: i.pricePesewas,
        imageUrl: `https://cdn.besonc.gh/items/${i.id}.jpg`, available: true,
        category: i.category, preparationMinutes: i.preparationMinutes, tags: i.tags,
        addons: (i as any).addons ?? null, variants: (i as any).variants ?? null,
      },
    });
    console.log(`  + Inserted item ${i.id} (${i.name})`);
  }
  const vendorCount = await prisma.vendor.count();
  const itemCount = await prisma.item.count();
  console.log(`\n✅ Seed complete: ${vendorCount} vendors, ${itemCount} items.`);
}

main().catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); }).finally(() => prisma.$disconnect());
