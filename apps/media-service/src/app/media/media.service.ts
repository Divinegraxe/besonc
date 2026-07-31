import { Injectable, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

export interface MediaRecord {
  id: string;
  url: string;             // public URL (after upload)
  thumbnailUrl?: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;      // userId
  context: 'avatar' | 'vendor_logo' | 'item_image' | 'errand_proof' | 'order_proof' | 'general';
  createdAt: string;
}

/**
 * Media Service — file uploads.
 *
 * Sprint 3-4 (current): in-memory storage that returns a fake URL.
 * Sprint 5+ integration: Cloudflare R2 via S3 SDK.
 *
 * For the real implementation, we'd receive multipart/form-data, validate
 * the file, upload to R2, and return the public URL.
 */
@Injectable()
export class MediaService {
  private readonly records = new Map<string, MediaRecord>();

  upload(input: {
    uploadedBy: string;
    context: MediaRecord['context'];
    filename: string;
    mimeType: string;
    sizeBytes: number;
  }): { id: string; uploadUrl: string; record: MediaRecord } {
    if (input.sizeBytes > 5 * 1024 * 1024) {
      throw new BadRequestException('File too large (max 5MB)');
    }
    if (!input.mimeType.startsWith('image/')) {
      throw new BadRequestException('Only image uploads supported for now');
    }
    const id = randomUUID();
    const url = `https://cdn.besonc.gh/${input.context}/${id}-${input.filename}`;
    const record: MediaRecord = {
      id,
      url,
      thumbnailUrl: `${url}?w=200`,
      filename: input.filename,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      uploadedBy: input.uploadedBy,
      context: input.context,
      createdAt: new Date().toISOString(),
    };
    this.records.set(id, record);
    return { id, uploadUrl: record.url, record };
  }

  getById(id: string): MediaRecord | null {
    return this.records.get(id) ?? null;
  }
}
