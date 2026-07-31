import { Module } from '@nestjs/common';
import { PrismaModule } from '@besonc/shared-db';
import { CodController } from './cod.controller';
import { CodService } from './cod.service';

@Module({
  imports: [PrismaModule],
  controllers: [CodController],
  providers: [CodService],
  exports: [CodService],
})
export class CodModule {}
