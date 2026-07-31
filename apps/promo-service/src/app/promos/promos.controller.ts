import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PromoService } from './promos.service';
import { PromoType, PromoStatus } from '@prisma/client';

class CreatePromoDto {
  @IsString() code!: string;
  @IsOptional() @IsString() description?: string;
  @IsIn(['percentage', 'fixed_amount', 'free_delivery', 'vendor_funded', 'referral']) type!: PromoType;
  @IsOptional() @IsInt() @Min(1) discountPercent?: number;
  @IsOptional() @IsInt() @Min(1) discountPesewas?: number;
  @IsOptional() @IsInt() @Min(0) minOrderPesewas?: number;
  @IsOptional() @IsInt() @Min(1) maxDiscountPesewas?: number;
  @IsOptional() @IsString() vendorId?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsInt() @Min(1) maxUses?: number;
  @IsOptional() @IsInt() @Min(1) maxUsesPerUser?: number;
  @IsString() createdBy!: string;
}

class ValidateDto {
  @IsString() code!: string;
  @IsString() userId!: string;
  @IsInt() @Min(1) orderTotalPesewas!: number;
  @IsOptional() @IsString() vendorId?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() city?: string;
}

class RedeemDto {
  @IsString() code!: string;
  @IsString() userId!: string;
  @IsString() orderId!: string;
  @IsInt() @Min(0) discountAppliedPesewas!: number;
}

class SetStatusDto {
  @IsIn(['draft', 'active', 'paused', 'expired']) status!: PromoStatus;
}

@Controller()
export class PromoController {
  constructor(private readonly promos: PromoService) {}

  @Post('create')
  async create(@Body() dto: CreatePromoDto) {
    try {
      return { success: true, data: await this.promos.create(dto) };
    } catch (err) {
      return { success: false, error: { code: 'PROMO_CREATE_FAILED', message: (err as Error).message } };
    }
  }

  @Get('code/:code')
  async byCode(@Param('code') code: string) {
    const c = await this.promos.getByCode(code);
    if (!c) return { success: false, error: { code: 'NOT_FOUND', message: 'Promo not found' } };
    return { success: true, data: c };
  }

  @Get('list')
  async list(@Query('status') status?: PromoStatus, @Query('vendorId') vendorId?: string) {
    return { success: true, data: await this.promos.list({ status, vendorId }) };
  }

  @Post('validate')
  async validate(@Body() dto: ValidateDto) {
    return { success: true, data: await this.promos.validate(dto) };
  }

  @Post('redeem')
  async redeem(@Body() dto: RedeemDto) {
    try {
      return { success: true, data: await this.promos.redeem(dto) };
    } catch (err) {
      return { success: false, error: { code: 'REDEEM_FAILED', message: (err as Error).message } };
    }
  }

  @Post(':id/status')
  async setStatus(@Param('id') id: string, @Body() dto: SetStatusDto) {
    return { success: true, data: await this.promos.setStatus(id, dto.status) };
  }

  @Post('seed-defaults')
  async seedDefaults() {
    return { success: true, data: { created: await this.promos.seedDefaultPromos() } };
  }
}
