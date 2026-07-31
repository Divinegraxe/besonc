import { Injectable } from '@nestjs/common';
import { ServiceCode } from '@besonc/shared-types';
import { VendorService, Vendor } from './vendor.service';
import { ItemService, Item } from './item.service';

/**
 * Catalogue Service — composed facade over Vendor + Item services.
 * Used by the customer app to fetch "vendor with menu" in a single call.
 */
@Injectable()
export class CatalogueService {
  constructor(
    private readonly vendors: VendorService,
    private readonly items: ItemService,
  ) {}

  listByCategory(category: ServiceCode, onlyOpen = false): Promise<Vendor[]> {
    return this.vendors.listByCategory(category, onlyOpen);
  }

  async getVendorWithMenu(vendorId: string): Promise<{ vendor: Vendor; items: Item[] } | null> {
    const vendor = await this.vendors.getById(vendorId);
    if (!vendor) return null;
    const items = await this.items.listByVendor(vendorId);
    return { vendor, items };
  }

  getItemsByIds(ids: string[]): Promise<Item[]> {
    return this.items.listByIds(ids);
  }
}
