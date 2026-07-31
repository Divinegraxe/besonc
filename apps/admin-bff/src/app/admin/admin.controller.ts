import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { IsString } from 'class-validator';
import { AdminService } from './admin.service';

class VerifyKycDto {
  @IsString() smileIdId!: string;
  @IsString() ghanaCardNumber!: string;
}

@Controller()
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('dashboard')
  async dashboard() {
    try {
      return { success: true, data: await this.admin.getDashboard() };
    } catch (err) {
      return { success: false, error: { code: 'DASHBOARD_FAILED', message: (err as Error).message } };
    }
  }

  @Get('kyc/pending-riders')
  async pendingKycRiders() {
    return { success: true, data: await this.admin.getPendingKycRiders() };
  }

  @Post('kyc/verify-rider/:riderId')
  async verifyRider(@Param('riderId') riderId: string, @Body() dto: VerifyKycDto) {
    return { success: true, data: await this.admin.verifyRider(riderId, dto.smileIdId, dto.ghanaCardNumber) };
  }

  @Get('cod/today')
  async codToday() {
    return { success: true, data: await this.admin.getCodToday() };
  }

  @Get('cod/rider/:riderId/outstanding')
  async riderOutstanding(@Param('riderId') riderId: string) {
    return { success: true, data: await this.admin.getRiderOutstanding(riderId) };
  }

  @Get('system/health')
  async systemHealth() {
    return { success: true, data: await this.admin.getSystemHealth() };
  }
}
