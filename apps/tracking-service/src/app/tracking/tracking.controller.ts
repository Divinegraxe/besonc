import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { TrackingService } from './tracking.service';

class PingDto {
  @IsString() riderId!: string;
  @IsNumber() @Min(-90) @Max(90) latitude!: number;
  @IsNumber() @Min(-180) @Max(180) longitude!: number;
  @IsOptional() @IsNumber() heading?: number;
  @IsOptional() @IsNumber() speedKmh?: number;
  @IsOptional() @IsNumber() accuracyM?: number;
  @IsOptional() @IsInt() @Min(0) @Max(100) batteryPct?: number;
  @IsOptional() @IsString() orderId?: string;
}

class EtaQueryDto {
  @Type(() => Number) @IsNumber() @Min(-90) @Max(90) destLat!: number;
  @Type(() => Number) @IsNumber() @Min(-180) @Max(180) destLng!: number;
}

@Controller()
export class TrackingController {
  constructor(private readonly tracking: TrackingService) {}

  @Post('ping')
  async ping(@Body() dto: PingDto) {
    const res = await this.tracking.recordPing(dto);
    return { success: true, data: res };
  }

  @Get('rider/:riderId')
  async riderLocation(@Param('riderId') riderId: string) {
    const loc = await this.tracking.getRiderLocation(riderId);
    if (!loc) return { success: false, error: { code: 'NO_PINGS', message: 'No location pings yet' } };
    return { success: true, data: loc };
  }

  @Get('rider/:riderId/trail')
  async riderTrail(@Param('riderId') riderId: string, @Query('limit') limit?: string) {
    return { success: true, data: await this.tracking.getRiderTrail(riderId, limit ? Number(limit) : 100) };
  }

  @Get('order/:orderId')
  async orderLocation(@Param('orderId') orderId: string) {
    const loc = await this.tracking.getOrderLocation(orderId);
    if (!loc) return { success: false, error: { code: 'NO_PINGS', message: 'No location pings for this order' } };
    return { success: true, data: loc };
  }

  @Get('eta/:riderId')
  async eta(@Param('riderId') riderId: string, @Query() q: EtaQueryDto) {
    const res = await this.tracking.computeEtaMinutes(riderId, q.destLat, q.destLng);
    if (!res) return { success: false, error: { code: 'NO_LOCATION', message: 'Rider has no pings yet' } };
    return { success: true, data: res };
  }
}
