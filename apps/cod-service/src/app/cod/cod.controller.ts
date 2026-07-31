import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { CodService } from './cod.service';

class CollectDto {
  @IsString() orderId!: string;
  @IsString() riderId!: string;
  @IsString() customerId!: string;
  @IsInt() @Min(0) amountPesewas!: number;
  @IsOptional() @IsInt() @Min(0) expectedAmountPesewas?: number;
  @IsOptional() @IsString() notes?: string;
}

@Controller()
export class CodController {
  constructor(private readonly cod: CodService) {}

  @Post('collect')
  async collect(@Body() dto: CollectDto) {
    try {
      const res = await this.cod.recordCollection(dto);
      return { success: true, data: res };
    } catch (err) {
      return { success: false, error: { code: 'COLLECT_FAILED', message: (err as Error).message } };
    }
  }

  @Post(':id/deposit')
  async markDeposited(@Param('id') id: string) {
    try {
      await this.cod.markDeposited(id);
      return { success: true };
    } catch (err) {
      return { success: false, error: { code: 'DEPOSIT_FAILED', message: (err as Error).message } };
    }
  }

  @Post(':id/reconcile')
  async markReconciled(@Param('id') id: string) {
    try {
      await this.cod.markReconciled(id);
      return { success: true };
    } catch (err) {
      return { success: false, error: { code: 'RECONCILE_FAILED', message: (err as Error).message } };
    }
  }

  @Get('daily-summary')
  async dailySummary(@Query('date') date?: string) {
    const d = date ? new Date(date) : new Date();
    return { success: true, data: await this.cod.getDailySummary(d) };
  }

  @Get('rider/:riderId/outstanding')
  async riderOutstanding(@Param('riderId') riderId: string) {
    return { success: true, data: await this.cod.getRiderOutstanding(riderId) };
  }

  @Get('order/:orderId')
  async byOrder(@Param('orderId') orderId: string) {
    const c = await this.cod.listByOrder(orderId);
    if (!c) return { success: false, error: { code: 'NOT_FOUND', message: 'No COD collection for this order' } };
    return { success: true, data: c };
  }
}
