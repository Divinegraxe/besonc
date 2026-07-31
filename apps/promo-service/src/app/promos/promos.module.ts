import { Module } from '@nestjs/common';
import { PrismaModule } from '@besonc/shared-db';
import { PromoController } from './promos.controller';
import { PromoService } from './promos.service';

@Module({
  imports: [PrismaModule],
  controllers: [PromoController],
  providers: [PromoService],
  exports: [PromoService],
})
export class PromoModule {}
