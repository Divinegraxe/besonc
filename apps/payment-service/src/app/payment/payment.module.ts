import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { LedgerService } from './ledger.service';

@Module({
  controllers: [PaymentController],
  providers: [PaymentService, LedgerService],
  exports: [PaymentService, LedgerService],
})
export class PaymentModule {}
