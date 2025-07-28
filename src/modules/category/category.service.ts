import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category } from './schema/category.schema';
import {
  CreateCategoryInputDTO,
  UpdateCategoryInputDTO,
} from './dto/category.dto';

@Injectable()
export class CategoryService {
  private readonly logger = new Logger(CategoryService.name);

  constructor(
    @InjectModel(Category.name) private categoryModel: Model<Category>,
  ) {}

  async create(createCategoryInput: CreateCategoryInputDTO): Promise<Category> {
    this.logger.log(
      `Creating category: ${JSON.stringify(createCategoryInput)}`,
    );
    if (!createCategoryInput.name || !createCategoryInput.slug) {
      throw new BadRequestException('Name and slug are required');
    }
    const category = new this.categoryModel(createCategoryInput);
    return category.save();
  }

  async findAll(): Promise<Category[]> {
    this.logger.log('Fetching all categories');
    const result = await this.categoryModel.find().exec();
    return result;
  }

  async update(
    id: string,
    updateCategoryInput: UpdateCategoryInputDTO,
  ): Promise<Category> {
    this.logger.log(
      `Updating category with ID: ${id}, data: ${JSON.stringify(updateCategoryInput)}`,
    );

    if (!id) {
      throw new BadRequestException('Category ID is required');
    }

    const category = await this.categoryModel
      .findByIdAndUpdate(id, updateCategoryInput, {
        new: true,
        runValidators: true,
      })
      .exec();
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    this.logger.log(`Updated category: ${category.name}`);
    return category;
  }

  async delete(id: string): Promise<boolean> {
    this.logger.log(`Deleting category with ID: ${id}`);

    if (!id) {
      throw new BadRequestException('Category ID is required');
    }

    const result = await this.categoryModel.deleteOne({ _id: id }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    this.logger.log(`Deleted category with ID: ${id}`);
    return true;
  }
}
