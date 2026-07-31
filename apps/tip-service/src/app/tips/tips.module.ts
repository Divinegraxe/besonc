import { Module } from '@nestjs/common';
import { PrismaModule } from '@besonc/shared-db';
import { TipController } from './tips.controller';
import { TipService } from './tips.service';

@Module({
  imports: [PrismaModule],
  controllers: [TipController],
  providers: [TipService],
  exports: [TipService],
})
export class TipModule {}
