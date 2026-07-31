import { Module } from '@nestjs/common';
import { PrismaModule } from '@besonc/shared-db';
import { VendorController } from './vendor.controller';
import { ItemController } from './item.controller';
import { CatalogueService } from './catalogue.service';
import { VendorService } from './vendor.service';
import { ItemService } from './item.service';

@Module({
  imports: [PrismaModule],
  controllers: [VendorController, ItemController],
  providers: [CatalogueService, VendorService, ItemService],
  exports: [CatalogueService, VendorService, ItemService],
})
export class CatalogueModule {}
