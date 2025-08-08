import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { Args, Query, Mutation, Resolver } from '@nestjs/graphql';
import { ProductService } from './product.service';
import {
  CreateProductInputDTO,
  GetProductsInputDTO,
  UpdateProductInputDTO,
} from './dto/product.dto';
import { ProductConnection } from '../../graphql';

@Resolver('Product')
@UsePipes(new ValidationPipe({ transform: true }))
export class ProductResolver {
  private readonly logger = new Logger(ProductResolver.name);

  constructor(private readonly productService: ProductService) {}

  @Query(() => ProductConnection)
  async getProducts(@Args('input') input: GetProductsInputDTO) {
    return this.productService.getProducts(input);
  }

  @Mutation()
  async createProduct(@Args('input') input: CreateProductInputDTO) {
    return this.productService.create(input);
  }

  @Mutation()
  async updateProduct(@Args('input') input: UpdateProductInputDTO) {
    return this.productService.update(input);
  }
}
