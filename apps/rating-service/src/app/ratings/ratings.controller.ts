import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { IsArray, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { RatingService } from './ratings.service';
import { RatingTarget } from '@prisma/client';

class SubmitRatingDto {
  @IsString() orderId!: string;
  @IsString() raterId!: string;
  @IsIn(['customer', 'vendor', 'rider']) raterType!: 'customer' | 'vendor' | 'rider';
  @IsIn(['vendor', 'rider', 'item', 'platform']) targetType!: RatingTarget;
  @IsString() targetId!: string;
  @IsInt() @Min(1) @Max(5) stars!: number;
  @IsOptional() @IsString() comment?: string;
  @IsOptional() @IsArray() tags?: string[];
  @IsOptional() isPublic?: boolean;
}

@Controller()
export class RatingController {
  constructor(private readonly ratings: RatingService) {}

  @Post('submit')
  async submit(@Body() dto: SubmitRatingDto) {
    try {
      return { success: true, data: await this.ratings.submit(dto) };
    } catch (err) {
      return { success: false, error: { code: 'RATING_FAILED', message: (err as Error).message } };
    }
  }

  @Get('for/:targetType/:targetId')
  async forTarget(
    @Param('targetType') targetType: RatingTarget,
    @Param('targetId') targetId: string,
    @Query('limit') limit?: string,
  ) {
    return { success: true, data: await this.ratings.getForTarget(targetType, targetId, limit ? Number(limit) : 50) };
  }

  @Get('stats/:targetType/:targetId')
  async stats(@Param('targetType') targetType: RatingTarget, @Param('targetId') targetId: string) {
    return { success: true, data: await this.ratings.getStats(targetType, targetId) };
  }

  @Get('by-rater/:raterId')
  async byRater(@Param('raterId') raterId: string) {
    return { success: true, data: await this.ratings.getByRater(raterId) };
  }

  @Get('order/:orderId')
  async forOrder(@Param('orderId') orderId: string) {
    return { success: true, data: await this.ratings.getForOrder(orderId) };
  }
}
