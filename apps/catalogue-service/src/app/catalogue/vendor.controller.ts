import { Controller, Get, Param, Query } from '@nestjs/common';
import { ServiceCode } from '@besonc/shared-types';
import { VendorService } from './vendor.service';

@Controller('vendors')
export class VendorController {
  constructor(private readonly vendors: VendorService) {}

  @Get()
  async list(
    @Query('category') category?: ServiceCode,
    @Query('q') query?: string,
    @Query('openOnly') openOnly?: string,
  ) {
    const onlyOpen = openOnly === 'true' || openOnly === '1';
    let result;
    if (query) result = await this.vendors.searchByName(query);
    else if (category) result = await this.vendors.listByCategory(category, onlyOpen);
    else result = await this.vendors.listAll(onlyOpen);
    return { success: true, data: result };
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    const v = await this.vendors.getById(id);
    if (!v) return { success: false, error: { code: 'NOT_FOUND', message: 'Vendor not found' } };
    return { success: true, data: v };
  }
}
