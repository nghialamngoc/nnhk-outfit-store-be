import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CategoryDocument, Category } from './schema/category.schema';
import {
  CreateCategoryInputDTO,
  UpdateCategoryInputDTO,
} from './dto/category.dto';

@Injectable()
export class CategoryService {
  private readonly logger = new Logger(CategoryService.name);

  constructor(
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
  ) {}

  async create(createCategoryInput: CreateCategoryInputDTO): Promise<Category> {
    this.logger.log(
      `Creating category: ${JSON.stringify(createCategoryInput)}`,
    );

    try {
      // Check if slug already exists
      const existingCategory = await this.categoryModel.findOne({
        slug: createCategoryInput.slug,
      });

      if (existingCategory) {
        throw new ConflictException(
          `Category with slug '${createCategoryInput.slug}' already exists`,
        );
      }

      const createdCategory = new this.categoryModel(createCategoryInput);
      const savedCategory = await createdCategory.save();

      this.logger.log(`Created category with ID: ${savedCategory.id}`);
      return savedCategory;
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('Category with this slug already exists');
      }
      throw error;
    }
  }

  async findById(categoryId: string): Promise<Category | null> {
    this.logger.log(`Fetching category: ${categoryId}`);

    if (!Types.ObjectId.isValid(categoryId)) {
      throw new BadRequestException('Invalid category ID format');
    }

    const category = await this.categoryModel.findById(categoryId).exec();
    return category ? category : null;
  }

  async findAll(
    options: {
      limit?: number;
      offset?: number;
      search?: string;
    } = {},
  ): Promise<{
    categories: Category[];
    total: number;
  }> {
    this.logger.log('Fetching all categories');

    const { limit = 20, offset = 0, search } = options;

    let query = {};
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ],
      };
    }

    const [categories, total] = await Promise.all([
      this.categoryModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .exec(),
      this.categoryModel.countDocuments(query),
    ]);

    return {
      categories: categories.map((cat) => cat),
      total,
    };
  }

  async update(
    id: string,
    updateCategoryInput: UpdateCategoryInputDTO,
  ): Promise<Category> {
    this.logger.log(
      `Updating category with ID: ${id}, data: ${JSON.stringify(updateCategoryInput)}`,
    );

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid category ID format');
    }

    // Check if slug is being updated and already exists
    if (updateCategoryInput.slug) {
      const existingCategory = await this.categoryModel.findOne({
        slug: updateCategoryInput.slug,
        _id: { $ne: id },
      });

      if (existingCategory) {
        throw new ConflictException(
          `Category with slug '${updateCategoryInput.slug}' already exists`,
        );
      }
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

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid category ID format');
    }

    const result = await this.categoryModel.deleteOne({ _id: id }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    this.logger.log(`Deleted category with ID: ${id}`);
    return true;
  }

  async exists(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) {
      return false;
    }

    const count = await this.categoryModel.countDocuments({ _id: id });
    return count > 0;
  }

  async getCount(): Promise<number> {
    return this.categoryModel.countDocuments();
  }
}
