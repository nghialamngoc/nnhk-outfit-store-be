import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { ProductService } from './product.service';
import { CreateProductInputDTO } from './dto/product.dto';

@Resolver('Product')
@UsePipes(new ValidationPipe({ transform: true }))
export class ProductResolver {
  private readonly logger = new Logger(ProductResolver.name);

  constructor(private readonly productService: ProductService) {}

  @Mutation('createProduct')
  async createProduct(@Args('input') input: CreateProductInputDTO) {
    this.logger.log('Creating product with input:', input);

    try {
      const result = await this.productService.create(input);
      this.logger.log('Product created successfully:', result.id);
      return result;
    } catch (error) {
      this.logger.error('Error creating product:', error.message);
      throw error;
    }
  }
}
