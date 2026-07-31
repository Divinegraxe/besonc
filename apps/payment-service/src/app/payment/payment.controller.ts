import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { IsIn, IsInt, IsString, Min } from 'class-validator';
import { PaymentService } from './payment.service';
import { LedgerService } from './ledger.service';

class ChargeDto {
  @IsString() orderId!: string;
  @IsString() customerId!: string;
  @IsString() customerEmail!: string;
  @IsInt() @Min(1) amountPesewas!: number;
  @IsIn(['momo', 'card', 'cash']) method!: 'momo' | 'card' | 'cash';
  @IsString() phone?: string;
  @IsIn(['mtn', 'vod', 'atl']) provider?: 'mtn' | 'vod' | 'atl';
}

class VendorSettleDto {
  @IsString() vendorId!: string;
  @IsString() orderId!: string;
  @IsInt() @Min(0) amountPesewas!: number;
}

class RiderEarningDto {
  @IsString() riderId!: string;
  @IsString() orderId!: string;
  @IsInt() @Min(0) amountPesewas!: number;
  @IsInt() @Min(0) tipPesewas!: number;
}

@Controller()
export class PaymentController {
  constructor(
    private readonly payments: PaymentService,
    private readonly ledger: LedgerService,
  ) {}

  @Post('charge')
  async charge(@Body() dto: ChargeDto) {
    try {
      const providerMap = { mtn: 'MTN', vod: 'VODAFONE', atl: 'AIRTELTIGO' } as const;
      const provider = dto.method === 'momo' && dto.provider ? providerMap[dto.provider] : undefined;
      const res = await this.payments.chargeCustomer({
        orderId: dto.orderId,
        customerId: dto.customerId,
        customerEmail: dto.customerEmail,
        amountPesewas: dto.amountPesewas,
        method: dto.method,
        mobileMoney: dto.method === 'momo' && dto.phone && provider
          ? { phone: dto.phone, provider }
          : undefined,
      });
      return { success: true, data: res };
    } catch (err) {
      return { success: false, error: { code: 'CHARGE_FAILED', message: (err as Error).message } };
    }
  }

  @Post('webhook/paystack')
  async webhook(@Body() body: { event: string; data: { reference?: string } }) {
    if (body.event === 'charge.success' && body.data.reference) {
      const payment = await this.payments.markPaidByReference(body.data.reference);
      return { success: true, data: payment };
    }
    return { success: true, data: { ignored: true } };
  }

  @Post('settle/vendor')
  async settleVendor(@Body() dto: VendorSettleDto) {
    await this.payments.recordVendorSettlement(dto);
    return { success: true };
  }

  @Post('earning/rider')
  async recordRider(@Body() dto: RiderEarningDto) {
    await this.payments.recordRiderEarning(dto);
    return { success: true };
  }

  @Get('balance/:userId')
  async balance(@Param('userId') userId: string) {
    return { success: true, data: { balancePesewas: await this.ledger.getBalance(userId) } };
  }

  @Get('ledger/:userId')
  async ledgerEntries(@Param('userId') userId: string) {
    return { success: true, data: await this.ledger.getEntriesForUser(userId) };
  }

  @Get('reconcile')
  async reconcile() {
    return { success: true, data: await this.ledger.reconcile() };
  }

  @Get('payments')
  async listPayments() {
    return { success: true, data: await this.payments.listPayments() };
  }

  @Get('payouts/pending')
  async pendingPayouts() {
    return { success: true, data: await this.payments.listPendingPayouts() };
  }
}
