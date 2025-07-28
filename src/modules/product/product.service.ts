import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product } from './schema/product.schema';
import { CreateProductInput } from './dto/product.dto';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    @InjectModel(Product.name) private productModel: Model<Product>,
  ) {}

  async create(createProductInput: CreateProductInput): Promise<Product> {
    this.logger.log(`Creating product: ${JSON.stringify(createProductInput)}`);
    const createdProduct = new this.productModel(createProductInput);
    return createdProduct.save();
  }

  async findAll(): Promise<Product[]> {
    this.logger.log('Fetching all products');
    const products = await this.productModel.find().exec();
    this.logger.log(`Found ${products.length} products`);
    return products;
  }
}
