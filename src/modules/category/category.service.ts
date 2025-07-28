import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category } from './schema/category.schema';
import { CreateCategoryInputDTO } from './dto/category.dto';

@Injectable()
export class CategoryService {
  private readonly logger = new Logger(CategoryService.name);

  constructor(
    @InjectModel(Category.name) private categoryModel: Model<Category>,
  ) {}

  async create(createCategoryInput: CreateCategoryInputDTO): Promise<Category> {
    this.logger.log(`Creating product: ${JSON.stringify(createCategoryInput)}`);
    return new this.categoryModel(createCategoryInput).save();
  }

  async findAll(): Promise<Category[]> {
    this.logger.log('Fetching all products');
    const result = await this.categoryModel.find().exec();
    return result;
  }
}
