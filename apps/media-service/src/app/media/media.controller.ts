import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { IsIn, IsInt, IsString, Min } from 'class-validator';
import { MediaService } from './media.service';

class UploadDto {
  @IsString() uploadedBy!: string;
  @IsIn(['avatar', 'vendor_logo', 'item_image', 'errand_proof', 'order_proof', 'general']) context!: 'avatar' | 'vendor_logo' | 'item_image' | 'errand_proof' | 'order_proof' | 'general';
  @IsString() filename!: string;
  @IsString() mimeType!: string;
  @IsInt() @Min(1) sizeBytes!: number;
}

@Controller()
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('upload')
  upload(@Body() dto: UploadDto) {
    try {
      const res = this.media.upload(dto);
      return { success: true, data: res };
    } catch (err) {
      return { success: false, error: { code: 'UPLOAD_FAILED', message: (err as Error).message } };
    }
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    const m = this.media.getById(id);
    if (!m) return { success: false, error: { code: 'NOT_FOUND', message: 'Media not found' } };
    return { success: true, data: m };
  }
}
