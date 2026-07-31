/**
 * Dispatch seed (5 demo riders in Cape Coast).
 *
 * Idempotent: skips riders whose phone already exists.
 *
 * Usage:
 *   pnpm run db:seed:dispatch
 */
import { PrismaClient, RiderStatus, VehicleType } from '@prisma/client';

const prisma = new PrismaClient();

const riders = [
  {
    name: 'Kofi Mensah',
    phone: '+233241111111',
    email: 'kofi@besonc.gh',
    vehicleType: VehicleType.motorcycle,
    vehiclePlate: 'GR-1234-23',
    mobileMoneyPhone: '+233241111111',
    mobileMoneyProvider: 'mtn',
    isVerified: true,
    status: RiderStatus.available,
    rating: 4.8,
    totalDeliveries: 312,
  },
  {
    name: 'Ama Boateng',
    phone: '+233242222222',
    email: 'ama@besonc.gh',
    vehicleType: VehicleType.bicycle,
    vehiclePlate: null,
    mobileMoneyPhone: '+233242222222',
    mobileMoneyProvider: 'vod',
    isVerified: true,
    status: RiderStatus.available,
    rating: 4.9,
    totalDeliveries: 187,
  },
  {
    name: 'Yaw Asante',
    phone: '+233243333333',
    email: 'yaw@besonc.gh',
    vehicleType: VehicleType.motorcycle,
    vehiclePlate: 'GR-5678-23',
    mobileMoneyPhone: '+233243333333',
    mobileMoneyProvider: 'mtn',
    isVerified: true,
    status: RiderStatus.available,
    rating: 4.6,
    totalDeliveries: 245,
  },
  {
    name: 'Akosua Sarpong',
    phone: '+233244444444',
    email: 'akosua@besonc.gh',
    vehicleType: VehicleType.motorcycle,
    vehiclePlate: 'GR-9012-23',
    mobileMoneyPhone: '+233244444444',
    mobileMoneyProvider: 'atl',
    isVerified: true,
    status: RiderStatus.offline,
    rating: 4.7,
    totalDeliveries: 98,
  },
  {
    name: 'Kwame Owusu',
    phone: '+233205555555',
    email: 'kwame@besonc.gh',
    vehicleType: VehicleType.bicycle,
    vehiclePlate: null,
    mobileMoneyPhone: '+233205555555',
    mobileMoneyProvider: 'mtn',
    isVerified: false, // pending KYC
    status: RiderStatus.offline,
    rating: 0,
    totalDeliveries: 0,
  },
];

async function main() {
  console.log('🌱 Seeding dispatch database (5 Cape Coast riders)...');
  const year = new Date().getFullYear();
  const existingCount = await prisma.rider.count({ where: { id: { startsWith: `YDR-${year}-` } } });
  let nextSeq = existingCount + 1;

  for (const r of riders) {
    const existing = await prisma.rider.findUnique({ where: { phone: r.phone } });
    if (existing) {
      console.log(`  ✓ Rider ${r.phone} (${r.name}) already exists, skipping`);
      continue;
    }
    const id = `YDR-${year}-${String(nextSeq++).padStart(4, '0')}`;
    await prisma.rider.create({
      data: {
        id,
        name: r.name,
        phone: r.phone,
        email: r.email,
        vehicleType: r.vehicleType,
        vehiclePlate: r.vehiclePlate,
        city: 'CC',
        status: r.status,
        isVerified: r.isVerified,
        mobileMoneyPhone: r.mobileMoneyPhone,
        mobileMoneyProvider: r.mobileMoneyProvider,
        rating: r.rating,
        totalDeliveries: r.totalDeliveries,
        smileIdStatus: r.isVerified ? 'verified' : 'pending',
        smileIdId: r.isVerified ? `sid_mock_${id}` : null,
        ghanaCardNumber: r.isVerified ? `GHA-${r.phone.slice(-9)}` : null,
      },
    });
    console.log(`  + Inserted rider ${id} (${r.name})`);
  }
  const count = await prisma.rider.count();
  console.log(`\n✅ Seed complete: ${count} riders.`);
}

main().catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); }).finally(() => prisma.$disconnect());
