import { Logger, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Args, Query, Mutation, Resolver } from '@nestjs/graphql';
import { ProductService } from './product.service';
import {
  CreateProductInputDTO,
  GetProductsInputDTO,
  UpdateProductInputDTO,
} from './dto/product.dto';
import { ProductConnection } from '../../graphql';
import { GqlAuthGuard } from 'src/common/guards/gql.guard';
import { Public } from 'src/common/decorators/public.decorator';

@Resolver('Product')
@UseGuards(GqlAuthGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class ProductResolver {
  constructor(private readonly productService: ProductService) {}

  @Public()
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
