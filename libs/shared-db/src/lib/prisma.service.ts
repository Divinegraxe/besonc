/**
 * Shared Prisma service base class for NestJS services.
 *
 * Each service in the BESONC monorepo has its own Prisma schema
 * (apps/<service>/prisma/schema.prisma) and its own generated client
 * (apps/<service>/node_modules/.prisma/client). They all live in the
 * same Postgres database but own different tables.
 *
 * To use this in a service:
 *
 *   1. Run `pnpm run db:generate` (or `npx prisma generate --schema=...`)
 *      to generate the client for your service.
 *
 *   2. Add `PrismaModule` (from this file) to your AppModule imports.
 *
 *   3. Inject `PrismaService` into your services:
 *
 *        constructor(private readonly prisma: PrismaService) {}
 *
 *   4. Use it:
 *
 *        const vendors = await this.prisma.vendor.findMany();
 *
 * The `onModuleInit` hook connects to the DB; the `beforeExit` hook
 * closes it cleanly when NestJS shuts down.
 */
import { Injectable, OnModuleInit, OnModuleDestroy, INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: process.env['NODE_ENV'] === 'development'
        ? ['warn', 'error']  // 'query' is very noisy; enable selectively
        : ['error'],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Wire Prisma's beforeExit into NestJS's shutdown hooks. Call this
   * from your main.ts after creating the app:
   *
   *   const prismaService = app.get(PrismaService);
   *   await prismaService.enableShutdownHooks(app);
   */
  async enableShutdownHooks(app: INestApplication): Promise<void> {
    // Prisma's beforeExit event only fires on SIGINT/SIGTERM in some
    // Node versions; the safer pattern is to listen for them ourselves.
    process.on('beforeExit', async () => {
      await app.close();
    });
  }
}
