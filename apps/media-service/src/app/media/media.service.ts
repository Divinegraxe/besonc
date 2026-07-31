import { Injectable, BadRequestException, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '@besonc/shared-db';
import { randomUUID } from 'node:crypto';

export type MediaContext = 'avatar' | 'vendor_logo' | 'item_image' | 'errand_proof' | 'order_proof' | 'general';

export interface MediaRecord {
  id: string;
  url: string;
  thumbnailUrl?: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  context: MediaContext;
  storageBackend: 'mock' | 'r2' | 's3';
  createdAt: string;
}

/**
 * Media Service — file uploads.
 *
 * Backed by Postgres (MediaAsset table) for the metadata. The actual
 * binary storage is abstracted:
 *   - 'mock' (default in dev): returns a fake cdn.besonc.gh URL
 *   - 'r2' (prod): uploads to Cloudflare R2 via S3 SDK
 *   - 's3' (future): generic S3-compatible storage
 *
 * For now, the upload() method just records the metadata. A real
 * implementation would receive multipart/form-data, validate, upload
 * to R2, then record the resulting URL.
 */
@Injectable()
export class MediaService implements OnModuleInit {
  private readonly logger = new Logger(MediaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    const count = await this.prisma.mediaAsset.count();
    this.logger.log(`Media DB connected. ${count} assets.`);
  }

  /**
   * Record a media upload. Returns the asset metadata + a public URL
   * the client can use to access the file.
   */
  async upload(input: {
    uploadedBy: string;
    context: MediaContext;
    filename: string;
    mimeType: string;
    sizeBytes: number;
  }): Promise<{ id: string; uploadUrl: string; record: MediaRecord }> {
    if (input.sizeBytes > 5 * 1024 * 1024) {
      throw new BadRequestException('File too large (max 5MB)');
    }
    if (!input.mimeType.startsWith('image/')) {
      throw new BadRequestException('Only image uploads supported for now');
    }
    const id = randomUUID();
    const storageBackend = process.env['STORAGE_BACKEND'] === 'r2' ? 'r2' : process.env['STORAGE_BACKEND'] === 's3' ? 's3' : 'mock';
    const baseUrl = storageBackend === 'mock' ? 'https://cdn.besonc.gh' : 'https://storage.besonc.gh';
    const url = `${baseUrl}/${input.context}/${id}-${input.filename}`;
    const record = await this.prisma.mediaAsset.create({
      data: {
        id,
        url,
        thumbnailUrl: `${url}?w=200`,
        filename: input.filename,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        uploadedBy: input.uploadedBy,
        context: input.context as any,
        storageBackend,
      },
    });
    return { id, uploadUrl: record.url, record: this.toDomain(record) };
  }

  async getById(id: string): Promise<MediaRecord | null> {
    const row = await this.prisma.mediaAsset.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async listByUploader(uploadedBy: string, limit = 50): Promise<MediaRecord[]> {
    const rows = await this.prisma.mediaAsset.findMany({
      where: { uploadedBy },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((r) => this.toDomain(r));
  }

  async listByContext(context: MediaContext, limit = 100): Promise<MediaRecord[]> {
    const rows = await this.prisma.mediaAsset.findMany({
      where: { context: context as any },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((r) => this.toDomain(r));
  }

  private toDomain(r: any): MediaRecord {
    return {
      id: r.id,
      url: r.url,
      thumbnailUrl: r.thumbnailUrl ?? undefined,
      filename: r.filename,
      mimeType: r.mimeType,
      sizeBytes: r.sizeBytes,
      uploadedBy: r.uploadedBy,
      context: r.context,
      storageBackend: r.storageBackend,
      createdAt: r.createdAt.toISOString(),
    };
  }
}
