import { Module } from '@nestjs/common';
import { PrismaModule } from '@besonc/shared-db';
import { RatingController } from './ratings.controller';
import { RatingService } from './ratings.service';

@Module({
  imports: [PrismaModule],
  controllers: [RatingController],
  providers: [RatingService],
  exports: [RatingService],
})
export class RatingModule {}
