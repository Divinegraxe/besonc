import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { IsIn, IsInt, IsString, Min } from 'class-validator';
import { MediaService, MediaContext } from './media.service';

class UploadDto {
  @IsString() uploadedBy!: string;
  @IsIn(['avatar', 'vendor_logo', 'item_image', 'errand_proof', 'order_proof', 'general'])
  context!: MediaContext;
  @IsString() filename!: string;
  @IsString() mimeType!: string;
  @IsInt() @Min(1) sizeBytes!: number;
}

@Controller()
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('upload')
  async upload(@Body() dto: UploadDto) {
    try {
      const res = await this.media.upload(dto);
      return { success: true, data: res };
    } catch (err) {
      return { success: false, error: { code: 'UPLOAD_FAILED', message: (err as Error).message } };
    }
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    const m = await this.media.getById(id);
    if (!m) return { success: false, error: { code: 'NOT_FOUND', message: 'Media not found' } };
    return { success: true, data: m };
  }

  @Get('by-uploader/:userId')
  async byUploader(@Param('userId') userId: string, @Query('limit') limit?: string) {
    return { success: true, data: await this.media.listByUploader(userId, limit ? Number(limit) : 50) };
  }
}
