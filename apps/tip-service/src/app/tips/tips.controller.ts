import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { TipService } from './tips.service';

class AddTipDto {
  @IsString() orderId!: string;
  @IsString() customerId!: string;
  @IsString() riderId!: string;
  @IsInt() @Min(1) amountPesewas!: number;
  @IsOptional() @IsString() customerMessage?: string;
}

@Controller()
export class TipController {
  constructor(private readonly tips: TipService) {}

  @Post('add')
  async add(@Body() dto: AddTipDto) {
    try {
      return { success: true, data: await this.tips.addTip(dto) };
    } catch (err) {
      return { success: false, error: { code: 'TIP_FAILED', message: (err as Error).message } };
    }
  }

  @Get('order/:orderId')
  async forOrder(@Param('orderId') orderId: string) {
    const t = await this.tips.getForOrder(orderId);
    return { success: true, data: t };
  }

  @Get('rider/:riderId')
  async forRider(@Param('riderId') riderId: string) {
    return { success: true, data: await this.tips.getForRider(riderId) };
  }

  @Get('rider/:riderId/total')
  async riderTotal(@Param('riderId') riderId: string) {
    return { success: true, data: await this.tips.getRiderTotal(riderId) };
  }
}
