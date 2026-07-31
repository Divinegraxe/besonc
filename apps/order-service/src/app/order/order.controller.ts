import { Body, Controller, Get, Param, Patch, Post, Query, BadRequestException, NotFoundException } from '@nestjs/common';
import { IsArray, IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderService, OrderItem, AddressSnapshot } from './order.service';
import { OrderState, ServiceCode } from '@besonc/shared-types';

class CoordinatesDto {
  @IsNumber() lat!: number;
  @IsNumber() lng!: number;
}

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
  @IsObject() @ValidateNested() @Type(() => CoordinatesDto) coordinates!: { lat: number; lng: number };
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
  @IsOptional() @IsString() actor?: string;
}

@Controller()
export class OrderController {
  constructor(private readonly orders: OrderService) {}

  @Post()
  async create(@Body() dto: CreateOrderDto) {
    const order = await this.orders.create(dto as any);
    return { success: true, data: order };
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    const order = await this.orders.getById(id);
    if (!order) throw new NotFoundException('Order not found');
    return { success: true, data: order };
  }

  @Get('by-customer/:customerId')
  async byCustomer(@Param('customerId') customerId: string, @Query('limit') limit?: string) {
    return { success: true, data: await this.orders.listByCustomer(customerId, limit ? Number(limit) : 20) };
  }

  @Get('by-vendor/:vendorId')
  async byVendor(@Param('vendorId') vendorId: string, @Query('limit') limit?: string) {
    return { success: true, data: await this.orders.listByVendor(vendorId, limit ? Number(limit) : 50) };
  }

  @Get('by-rider/:riderId')
  async byRider(@Param('riderId') riderId: string, @Query('limit') limit?: string) {
    return { success: true, data: await this.orders.listByRider(riderId, limit ? Number(limit) : 50) };
  }

  @Get('available-for-rider')
  async availableForRider() {
    return { success: true, data: await this.orders.listAvailableForRider() };
  }

  @Patch(':id/transition')
  async transition(@Param('id') id: string, @Body() dto: TransitionDto) {
    try {
      const order = await this.orders.transition(id, dto.newState, {
        riderId: dto.riderId,
        paymentStatus: dto.paymentStatus,
        actor: dto.actor,
      });
      return { success: true, data: order };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      if (err instanceof BadRequestException) throw err;
      // Wrap any other error with our standard shape
      const message = (err as Error).message;
      throw new BadRequestException(message);
    }
  }
}
