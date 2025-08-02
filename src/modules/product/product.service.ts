import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Product, ProductDocument } from './schema/product.schema';
import { Model, Types } from 'mongoose';
import { CategoryService } from '../category/category.service';
import { CreateProductInputDTO } from './dto/product.dto';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    private readonly categoryService: CategoryService,
  ) {}

  async create(input: CreateProductInputDTO) {
    this.logger.log(`Creating product: ${JSON.stringify(input)}`);

    const { categoryId, sku, slug } = input;

    // category validation
    const category = await this.categoryService.findById(categoryId);

    if (!category) {
      throw new BadRequestException(`Category with ID ${categoryId} not found`);
    }

    // Check if slug already exists
    const existingProduct = await this.productModel.findOne({
      slug,
    });

    if (existingProduct) {
      throw new ConflictException(`Product with slug '${slug}' already exists`);
    }

    // Check SKU if provided
    if (sku) {
      const existingProductBySku = await this.productModel.findOne({
        sku,
      });

      if (existingProductBySku) {
        throw new ConflictException(`Product with SKU '${sku}' already exists`);
      }
    }

    try {
      const productData = {
        ...input,
        categoryId: new Types.ObjectId(categoryId),
        // Generate SKU if not provided
        sku: sku || `${slug}-${Date.now()}`,
      };

      const createdProduct = new this.productModel(productData);
      const savedProduct = await createdProduct.save();

      this.logger.log(`Created product with ID: ${savedProduct.id}`);

      return {
        ...savedProduct.toObject(),
        category,
      };
    } catch (error) {
      this.logger.error(`Failed to create product: ${error.message}`);
      throw new BadRequestException(
        `Failed to create product: ${error.message}`,
      );
    }
  }
}
