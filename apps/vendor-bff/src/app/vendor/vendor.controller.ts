import { Body, Controller, Get, Param, Patch, Put, Query } from '@nestjs/common';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { VendorService } from './vendor.service';

class TransitionOrderDto {
  @IsString() newState!: string;
  @IsString() vendorId!: string;
}

class SetAvailabilityDto {
  @IsBoolean() available!: boolean;
}

@Controller()
export class VendorController {
  constructor(private readonly vendor: VendorService) {}

  @Get('dashboard/:vendorId')
  async dashboard(@Param('vendorId') vendorId: string) {
    try {
      return { success: true, data: await this.vendor.getDashboard(vendorId) };
    } catch (err) {
      return { success: false, error: { code: 'DASHBOARD_FAILED', message: (err as Error).message } };
    }
  }

  @Get('orders/:vendorId')
  async orders(
    @Param('vendorId') vendorId: string,
    @Query('state') state?: string,
    @Query('limit') limit?: string,
  ) {
    return { success: true, data: await this.vendor.getOrders(vendorId, state, limit ? Number(limit) : 50) };
  }

  @Get('menu/:vendorId')
  async menu(@Param('vendorId') vendorId: string) {
    return { success: true, data: await this.vendor.getMenu(vendorId) };
  }

  @Get('ratings/:vendorId')
  async ratings(@Param('vendorId') vendorId: string, @Query('limit') limit?: string) {
    return { success: true, data: await this.vendor.getRatings(vendorId, limit ? Number(limit) : 50) };
  }

  @Patch('menu/:vendorId/items/:itemId/availability')
  async setAvailability(
    @Param('vendorId') vendorId: string,
    @Param('itemId') itemId: string,
    @Body() dto: SetAvailabilityDto,
  ) {
    return { success: true, data: await this.vendor.setItemAvailability(vendorId, itemId, dto.available) };
  }

  @Patch('orders/:orderId/transition')
  async transitionOrder(@Param('orderId') orderId: string, @Body() dto: TransitionOrderDto) {
    try {
      return { success: true, data: await this.vendor.transitionOrder(orderId, dto.newState, dto.vendorId) };
    } catch (err) {
      return { success: false, error: { code: 'TRANSITION_FAILED', message: (err as Error).message } };
    }
  }
}
