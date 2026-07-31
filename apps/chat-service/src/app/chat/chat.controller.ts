import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ChatService } from './chat.service';

class OpenThreadDto {
  @IsString() orderId!: string;
  @IsString() customerId!: string;
  @IsOptional() @IsString() vendorId?: string;
  @IsOptional() @IsString() riderId?: string;
}

class SendMessageDto {
  @IsString() orderId!: string;
  @IsString() senderId!: string;
  @IsIn(['customer', 'vendor', 'rider', 'system']) senderType!: 'customer' | 'vendor' | 'rider' | 'system';
  @IsString() @MaxLength(2000) body!: string;
  @IsOptional() @IsString() attachmentUrl?: string;
}

class MarkReadDto {
  @IsString() userId!: string;
}

@Controller()
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  // Threads
  @Post('threads/open')
  async openThread(@Body() dto: OpenThreadDto) {
    return { success: true, data: await this.chat.getOrCreateThread(dto) };
  }

  // Messages
  @Post('messages')
  async sendMessage(@Body() dto: SendMessageDto) {
    try {
      return { success: true, data: await this.chat.sendMessage(dto) };
    } catch (err) {
      return { success: false, error: { code: 'SEND_FAILED', message: (err as Error).message } };
    }
  }

  @Get('messages/:orderId')
  async getMessages(
    @Param('orderId') orderId: string,
    @Query('limit') limit?: string,
    @Query('beforeId') beforeId?: string,
  ) {
    return { success: true, data: await this.chat.getMessages(orderId, limit ? Number(limit) : 100, beforeId) };
  }

  @Post('threads/:orderId/read')
  async markRead(@Param('orderId') orderId: string, @Body() dto: MarkReadDto) {
    return { success: true, data: await this.chat.markRead(orderId, dto.userId) };
  }

  @Get('unread/:userId')
  async unreadCount(@Param('userId') userId: string) {
    return { success: true, data: { count: await this.chat.getUnreadCount(userId) } };
  }
}
