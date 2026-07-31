import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { IsArray, IsEnum, IsIn, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderService, OrderItem, AddressSnapshot } from './order.service';
import { OrderState, ServiceCode } from '@besonc/shared-types';

class OrderItemDto implements OrderItem {
  @IsString() itemId!: string;
  @IsString() vendorId!: string;
  @IsString() name!: string;
  @IsInt() @Min(0) pricePesewas!: number;
  @IsInt() @Min(1) quantity!: number;
  @IsOptional() @IsString() variantId?: string;
  @IsOptional() @IsString() notes?: string;
}

class AddressDto implements AddressSnapshot {
  @IsString() label!: string;
  @IsString() areaName!: string;
  @IsString() contactPhone!: string;
  @IsOptional() @IsString() landmark?: string;
  @IsOptional() @IsString() deliveryInstructions?: string;
  @IsOptional() @IsString() recipientName?: string;
  // coordinates handled loosely
  coordinates!: { lat: number; lng: number };
}

class CreateOrderDto {
  @IsString() customerId!: string;
  @IsString() service!: ServiceCode;
  @IsArray() @ValidateNested({ each: true }) @Type(() => OrderItemDto) items!: OrderItemDto[];
  @ValidateNested() @Type(() => AddressDto) deliveryAddress!: AddressDto;
  @IsOptional() @ValidateNested() @Type(() => AddressDto) pickupAddress?: AddressDto;
  @IsIn(['momo', 'card', 'cash', 'wallet']) paymentMethod!: 'momo' | 'card' | 'cash' | 'wallet';
  @IsOptional() @IsString() paymentReference?: string;
  @IsOptional() @IsString() customerNotes?: string;
  @IsInt() @Min(0) itemTotalPesewas!: number;
  @IsInt() @Min(0) deliveryFeePesewas!: number;
  @IsInt() @Min(0) serviceFeePesewas!: number;
  @IsInt() @Min(0) tipPesewas!: number;
  @IsInt() @Min(0) grandTotalPesewas!: number;
}

class TransitionDto {
  @IsString() newState!: OrderState;
  @IsOptional() @IsString() riderId?: string;
  @IsOptional() @IsString() paymentStatus?: 'paid' | 'failed' | 'refunded';
}

@Controller()
export class OrderController {
  constructor(private readonly orders: OrderService) {}

  @Post()
  create(@Body() dto: CreateOrderDto) {
    const order = this.orders.create(dto as any);
    return { success: true, data: order };
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    const order = this.orders.getById(id);
    if (!order) return { success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } };
    return { success: true, data: order };
  }

  @Get('by-customer/:customerId')
  byCustomer(@Param('customerId') customerId: string, @Query('limit') limit?: string) {
    return { success: true, data: this.orders.listByCustomer(customerId, limit ? Number(limit) : 20) };
  }

  @Get('by-vendor/:vendorId')
  byVendor(@Param('vendorId') vendorId: string, @Query('limit') limit?: string) {
    return { success: true, data: this.orders.listByVendor(vendorId, limit ? Number(limit) : 50) };
  }

  @Get('by-rider/:riderId')
  byRider(@Param('riderId') riderId: string, @Query('limit') limit?: string) {
    return { success: true, data: this.orders.listByRider(riderId, limit ? Number(limit) : 50) };
  }

  @Get('available-for-rider')
  availableForRider() {
    return { success: true, data: this.orders.listAvailableForRider() };
  }

  @Patch(':id/transition')
  transition(@Param('id') id: string, @Body() dto: TransitionDto) {
    try {
      const order = this.orders.transition(id, dto.newState, {
        riderId: dto.riderId,
        paymentStatus: dto.paymentStatus,
      });
      return { success: true, data: order };
    } catch (err) {
      const message = (err as Error).message;
      return { success: false, error: { code: 'INVALID_TRANSITION', message } };
    }
  }
}
