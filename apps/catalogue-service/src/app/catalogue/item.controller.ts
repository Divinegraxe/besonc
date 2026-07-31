import { Controller, Get, Param } from '@nestjs/common';
import { ItemService } from './item.service';

@Controller('items')
export class ItemController {
  constructor(private readonly items: ItemService) {}

  @Get('by-vendor/:vendorId')
  async byVendor(@Param('vendorId') vendorId: string) {
    return { success: true, data: await this.items.listByVendor(vendorId) };
  }

  @Get(':id')
  async byId(@Param('id') id: string) {
    const item = await this.items.getById(id);
    if (!item) return { success: false, error: { code: 'NOT_FOUND', message: 'Item not found' } };
    return { success: true, data: item };
  }
}
