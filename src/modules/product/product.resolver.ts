import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { ProductService } from './product.service';
import { Product } from './schema/product.schema';
import { CreateProductInput } from './dto/product.dto';

@Resolver(() => Product)
export class ProductResolver {
  constructor(private readonly productService: ProductService) {}

  @Mutation(() => Product)
  async createProduct(@Args('input') input: CreateProductInput) {
    return this.productService.create(input);
  }
}
