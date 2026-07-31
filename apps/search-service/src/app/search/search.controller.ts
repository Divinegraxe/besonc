import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { IsIn, IsString } from 'class-validator';
import { SearchService } from './search.service';
import type { Request } from 'express';

class IndexOneDto {
  @IsIn(['vendor', 'item']) entityType!: 'vendor' | 'item';
  @IsString() entityId!: string;
}

@Controller()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('search')
  async searchRoute(@Req() req: Request) {
    const q = (req.query.q as string) || '';
    const city = req.query.city as string | undefined;
    const category = req.query.category as string | undefined;
    const minRating = req.query.minRating ? Number(req.query.minRating) : undefined;
    const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : undefined;
    const minPrice = req.query.minPrice ? Number(req.query.minPrice) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    return { success: true, data: await this.searchService.search(q, { city, category, minRating, maxPrice, minPrice }, limit) };
  }

  @Post('rebuild')
  async rebuild() {
    return { success: true, data: await this.searchService.rebuildIndex() };
  }

  @Post('index')
  async indexOne(@Body() dto: IndexOneDto) {
    if (dto.entityType === 'vendor') await this.searchService.indexVendor(dto.entityId);
    else await this.searchService.indexItem(dto.entityId);
    return { success: true };
  }

  @Post('vendors/:id/index')
  async indexVendorRoute(@Param('id') id: string) {
    await this.searchService.indexVendor(id);
    return { success: true };
  }
  @Post('items/:id/index')
  async indexItemRoute(@Param('id') id: string) {
    await this.searchService.indexItem(id);
    return { success: true };
  }
}
