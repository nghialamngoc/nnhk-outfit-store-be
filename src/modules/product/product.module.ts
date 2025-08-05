import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from '../schemas/product.schema';
import { ProductService } from './product.service';
import { ProductResolver } from './product.resolver';
import { CategoryModule } from '../category/category.module';

@Module({
  imports: [
    CategoryModule,
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
  ],
  controllers: [],
  providers: [ProductService, ProductResolver],
  exports: [
    ProductService,
    MongooseModule.forFeature([
      { name: ProductService.name, schema: ProductSchema },
    ]),
  ],
})
export class ProductModule {}
