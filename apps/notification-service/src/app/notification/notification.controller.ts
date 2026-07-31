import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { IsArray, IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import { NotificationService } from './notification.service';

class SendTemplateDto {
  @IsString() template!: string;
  @IsObject() variables!: Record<string, string>;
  @IsObject() to!: { userId?: string; phone?: string; email?: string; pushToken?: string };
  @IsArray() @IsIn(['sms', 'email', 'push', 'in_app'], { each: true }) channels!: Array<'sms' | 'email' | 'push' | 'in_app'>;
  @IsOptional() @IsString() relatedOrderId?: string;
}

class SendDirectDto {
  @IsIn(['sms', 'email', 'push']) channel!: 'sms' | 'email' | 'push';
  @IsString() to!: string;
  @IsString() body!: string;
  @IsOptional() @IsString() subject?: string;
  @IsOptional() @IsString() relatedOrderId?: string;
  @IsOptional() @IsString() recipientUserId?: string;
}

@Controller()
export class NotificationController {
  constructor(private readonly notifications: NotificationService) {}

  @Post('send')
  async sendTemplate(@Body() dto: SendTemplateDto) {
    try {
      const res = await this.notifications.sendTemplate(dto);
      return { success: true, data: res };
    } catch (err) {
      return { success: false, error: { code: 'SEND_FAILED', message: (err as Error).message } };
    }
  }

  @Post('send-direct')
  async sendDirect(@Body() dto: SendDirectDto) {
    try {
      const res = await this.notifications.sendDirect(dto);
      return { success: true, data: res };
    } catch (err) {
      return { success: false, error: { code: 'SEND_FAILED', message: (err as Error).message } };
    }
  }

  @Get('inbox/:userId')
  async inbox(@Param('userId') userId: string, @Query('limit') limit?: string) {
    return { success: true, data: await this.notifications.getInbox(userId, limit ? Number(limit) : 50) };
  }

  @Post('read/:id')
  async markRead(@Param('id') id: string) {
    await this.notifications.markRead(id);
    return { success: true };
  }

  @Get('templates')
  async listTemplates() {
    return { success: true, data: await this.notifications.listTemplates() };
  }
}
