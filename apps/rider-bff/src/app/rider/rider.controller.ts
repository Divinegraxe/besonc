import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { RiderService } from './rider.service';

class AcceptJobDto {
  @IsString() orderId!: string;
}

class TransitionDto {
  @IsString() newState!: string;
  @IsString() riderId!: string;
}

class SetStatusDto {
  @IsIn(['offline', 'available', 'on_delivery', 'on_break']) status!: string;
}

class PingDto {
  @IsString() riderId!: string;
  @IsNumber() @Min(-90) latitude!: number;
  @IsNumber() @Min(-180) longitude!: number;
  @IsOptional() @IsNumber() heading?: number;
  @IsOptional() @IsNumber() speedKmh?: number;
  @IsOptional() @IsNumber() batteryPct?: number;
  @IsOptional() @IsString() orderId?: string;
}

@Controller()
export class RiderController {
  constructor(private readonly rider: RiderService) {}

  @Get('dashboard/:riderId')
  async dashboard(@Param('riderId') riderId: string) {
    try {
      return { success: true, data: await this.rider.getDashboard(riderId) };
    } catch (err) {
      return { success: false, error: { code: 'DASHBOARD_FAILED', message: (err as Error).message } };
    }
  }

  @Get('jobs/available')
  async availableJobs(@Query('city') city?: string, @Query('limit') limit?: string) {
    return { success: true, data: await this.rider.getAvailableJobs(city, limit ? Number(limit) : 20) };
  }

  @Get('orders/:riderId')
  async myOrders(@Param('riderId') riderId: string, @Query('limit') limit?: string) {
    return { success: true, data: await this.rider.getMyOrders(riderId, limit ? Number(limit) : 20) };
  }

  @Post('jobs/accept')
  async accept(@Body() dto: AcceptJobDto, @Query('riderId') riderId: string) {
    try {
      return { success: true, data: await this.rider.acceptJob(riderId, dto.orderId) };
    } catch (err) {
      return { success: false, error: { code: 'ACCEPT_FAILED', message: (err as Error).message } };
    }
  }

  @Patch('orders/:orderId/transition')
  async transition(@Param('orderId') orderId: string, @Body() dto: TransitionDto) {
    try {
      return { success: true, data: await this.rider.transitionOrder(orderId, dto.newState, dto.riderId) };
    } catch (err) {
      return { success: false, error: { code: 'TRANSITION_FAILED', message: (err as Error).message } };
    }
  }

  @Post('heartbeat')
  async heartbeat(@Body() dto: PingDto) {
    return { success: true, data: await this.rider.sendPing(dto) };
  }

  @Patch('status/:riderId')
  async setStatus(@Param('riderId') riderId: string, @Body() dto: SetStatusDto) {
    return { success: true, data: await this.rider.setStatus(riderId, dto.status) };
  }
}
