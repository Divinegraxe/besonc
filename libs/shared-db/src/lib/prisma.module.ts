import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Global Prisma module. Import once in your AppModule:
 *
 *   @Module({
 *     imports: [PrismaModule],
 *     ...
 *   })
 *
 * All services that inject `PrismaService` get the same instance.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
