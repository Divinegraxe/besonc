import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PaymentService } from './payment.service';
import { LedgerService } from './ledger.service';

class ChargeDto {
  @IsString() orderId!: string;
  @IsString() customerId!: string;
  @IsString() customerEmail!: string;
  @IsInt() @Min(1) amountPesewas!: number;
  @IsIn(['momo', 'card', 'bank', 'cash']) method!: 'momo' | 'card' | 'bank' | 'cash';
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsIn(['mtn', 'vod', 'atl']) provider?: 'mtn' | 'vod' | 'atl';
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
      const payment = this.payments.markPaidByReference(body.data.reference);
      return { success: true, data: payment };
    }
    return { success: true, data: { ignored: true } };
  }

  @Post('settle/vendor')
  settleVendor(@Body() dto: VendorSettleDto) {
    this.payments.recordVendorSettlement(dto);
    return { success: true };
  }

  @Post('earning/rider')
  recordRider(@Body() dto: RiderEarningDto) {
    this.payments.recordRiderEarning(dto);
    return { success: true };
  }

  @Get('balance/:userId')
  balance(@Param('userId') userId: string) {
    return { success: true, data: { balancePesewas: this.ledger.getBalance(userId) } };
  }

  @Get('ledger/:userId')
  ledgerEntries(@Param('userId') userId: string) {
    return { success: true, data: this.ledger.getEntriesForUser(userId) };
  }

  @Get('reconcile')
  reconcile() {
    return { success: true, data: this.ledger.reconcile() };
  }

  @Get('payments')
  listPayments() {
    return { success: true, data: this.payments.listPayments() };
  }

  @Get('payouts/pending')
  pendingPayouts() {
    return { success: true, data: this.payments.listPendingPayouts() };
  }
}
