import { Module } from '@nestjs/common';
import { AuthFlowController } from './auth-flow.controller';
import { AuthFlowService } from './auth-flow.service';

@Module({
  controllers: [AuthFlowController],
  providers: [AuthFlowService],
})
export class AuthFlowModule {}
