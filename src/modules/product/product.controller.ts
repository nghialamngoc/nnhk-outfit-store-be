import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { RolesGuard, UseRole } from 'src/common/guards/roles.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { ProductService } from './product.service';
import {
  CreateProductInputDTO,
  GetProductsInputDTO,
  UpdateProductInputDTO,
} from './dto/product.dto';

@Controller('product')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseRole(['admin'])
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get('/list')
  async getProducts(@Query('input') input: GetProductsInputDTO) {
    return this.productService.getProducts(input);
  }

  @Post('/create')
  async createProduct(@Body() input: CreateProductInputDTO) {
    return this.productService.create(input);
  }

  @Post('/update')
  async updateProduct(@Body() input: UpdateProductInputDTO) {
    return this.productService.update(input);
  }
}
