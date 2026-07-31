import { Body, Controller, Post } from '@nestjs/common';
import { IsInt, IsNumber, IsOptional, IsPositive, IsString, Min, IsBoolean } from 'class-validator';
import { PricingService } from './pricing.service';

class QuoteDto {
  @IsString() service!: string;
  @IsNumber() @IsPositive() distanceMeters!: number;
  @IsInt() @Min(0) itemTotalPesewas!: number;
  @IsOptional() @IsInt() @Min(0) durationMinutes?: number;
  @IsOptional() @IsNumber() @Min(0) weightKg?: number;
  @IsOptional() @IsBoolean() isFragile?: boolean;
  @IsOptional() @IsBoolean() isConfidential?: boolean;
  @IsOptional() @IsNumber() @Min(1) surgeMultiplier?: number;
  @IsOptional() @IsInt() @Min(0) tipPesewas?: number;
}

@Controller()
export class PricingController {
  constructor(private readonly pricing: PricingService) {}

  @Post('quote')
  quote(@Body() dto: QuoteDto) {
    const q = this.pricing.quote({
      service: dto.service as any,
      distanceMeters: dto.distanceMeters,
      itemTotalPesewas: dto.itemTotalPesewas,
      durationMinutes: dto.durationMinutes,
      weightKg: dto.weightKg,
      isFragile: dto.isFragile,
      isConfidential: dto.isConfidential,
      surgeMultiplier: dto.surgeMultiplier,
      tipPesewas: dto.tipPesewas,
    });
    return { success: true, data: q };
  }
}
