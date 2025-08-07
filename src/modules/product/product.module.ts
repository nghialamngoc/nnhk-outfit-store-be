import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from '../schemas/product.schema';
import { ProductService } from './product.service';
import { ProductResolver } from './product.resolver';
import { CategoryModule } from '../category/category.module';
import { R2Module } from '../r2/r2.module';

@Module({
  imports: [
    CategoryModule,
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
    R2Module,
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
