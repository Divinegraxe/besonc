import { Module } from '@nestjs/common';
import { PrismaModule } from '@besonc/shared-db';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

@Module({
  imports: [PrismaModule],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
