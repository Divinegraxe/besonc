import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { DispatchService } from './dispatch.service';
import { RiderStatus } from '@prisma/client';

class CreateRiderDto {
  @IsString() name!: string;
  @IsString() phone!: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsIn(['bicycle', 'motorcycle', 'car', 'walking']) vehicleType?: 'bicycle' | 'motorcycle' | 'car' | 'walking';
  @IsOptional() @IsString() vehiclePlate?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() mobileMoneyPhone?: string;
  @IsOptional() @IsIn(['mtn', 'vod', 'atl']) mobileMoneyProvider?: 'mtn' | 'vod' | 'atl';
}

class UpdateStatusDto {
  @IsIn(['offline', 'available', 'on_delivery', 'on_break']) status!: RiderStatus;
}

class AcceptJobDto {
  @IsString() orderId!: string;
}

class KycDto {
  @IsString() smileIdId!: string;
  @IsString() ghanaCardNumber!: string;
}

@Controller()
export class DispatchController {
  constructor(private readonly dispatch: DispatchService) {}

  // ── Riders ────────────────────────────────────────────────────────

  @Post('riders')
  async createRider(@Body() dto: CreateRiderDto) {
    try {
      const rider = await this.dispatch.createRider(dto);
      return { success: true, data: rider };
    } catch (err) {
      return { success: false, error: { code: 'RIDER_CREATE_FAILED', message: (err as Error).message } };
    }
  }

  @Get('riders')
  async listRiders(@Query('city') city?: string, @Query('status') status?: RiderStatus) {
    return { success: true, data: await this.dispatch.listRiders({ city, status }) };
  }

  @Get('riders/:id')
  async getRider(@Param('id') id: string) {
    const r = await this.dispatch.getRider(id);
    if (!r) return { success: false, error: { code: 'NOT_FOUND', message: 'Rider not found' } };
    return { success: true, data: r };
  }

  @Get('riders/by-phone/:phone')
  async getRiderByPhone(@Param('phone') phone: string) {
    const r = await this.dispatch.getRiderByPhone(phone);
    if (!r) return { success: false, error: { code: 'NOT_FOUND', message: 'Rider not found' } };
    return { success: true, data: r };
  }

  @Patch('riders/:id/status')
  async updateRiderStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    try {
      const r = await this.dispatch.updateRiderStatus(id, dto.status);
      return { success: true, data: r };
    } catch (err) {
      return { success: false, error: { code: 'RIDER_UPDATE_FAILED', message: (err as Error).message } };
    }
  }

  @Post('riders/:id/kyc/verify')
  async verifyKyc(@Param('id') id: string, @Body() dto: KycDto) {
    try {
      const r = await this.dispatch.markKycVerified(id, dto.smileIdId, dto.ghanaCardNumber);
      return { success: true, data: r };
    } catch (err) {
      return { success: false, error: { code: 'KYC_FAILED', message: (err as Error).message } };
    }
  }

  @Get('riders/:id/daily-summary')
  async dailySummary(@Param('id') id: string) {
    return { success: true, data: await this.dispatch.getRiderDailySummary(id) };
  }

  // ── Jobs ──────────────────────────────────────────────────────────

  @Get('jobs/available')
  async availableJobs(@Query('city') city?: string, @Query('limit') limit?: string) {
    return { success: true, data: await this.dispatch.listAvailableJobs({ city, limit: limit ? Number(limit) : undefined }) };
  }

  @Post('riders/:id/accept')
  async acceptJob(@Param('id') id: string, @Body() dto: AcceptJobDto) {
    try {
      const res = await this.dispatch.acceptJob(id, dto.orderId);
      return { success: true, data: res };
    } catch (err) {
      return { success: false, error: { code: 'ACCEPT_FAILED', message: (err as Error).message } };
    }
  }
}
