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

  listByCategory(category: ServiceCode, onlyOpen = false): Vendor[] {
    return this.vendors.listByCategory(category, onlyOpen);
  }

  getVendorWithMenu(vendorId: string): { vendor: Vendor; items: Item[] } | null {
    const vendor = this.vendors.getById(vendorId);
    if (!vendor) return null;
    return { vendor, items: this.items.listByVendor(vendorId) };
  }

  getItemsByIds(ids: string[]): Item[] {
    return this.items.listByIds(ids);
  }
}
