import { Resolver, Mutation, Args, Query, ID, Int } from '@nestjs/graphql';
import { UsePipes, ValidationPipe, Logger } from '@nestjs/common';
import { Category } from '../../graphql';
import { CategoryService } from './category.service';
import {
  CreateCategoryInputDTO,
  UpdateCategoryInputDTO,
} from './dto/category.dto';

@Resolver(() => Category)
@UsePipes(new ValidationPipe({ transform: true }))
export class CategoryResolver {
  private readonly logger = new Logger(CategoryResolver.name);

  constructor(private readonly categoryService: CategoryService) {}

  @Query(() => Category, {
    name: 'category',
    description: 'Get a category by ID',
    nullable: true,
  })
  async findCategory(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Category | null> {
    this.logger.log(`GraphQL: Fetching category with ID: ${id}`);
    return this.categoryService.findById(id);
  }

  @Query(() => Category, {
    name: 'categories',
    description: 'Get a category by ID',
    nullable: true,
  })
  async findAllCategory(): Promise<Category[] | null> {
    this.logger.log(`GraphQL: Fetching all category`);
    return (await this.categoryService.findAll()).categories;
  }

  @Mutation(() => Category, {
    description: 'Create a new category',
  })
  async createCategory(
    @Args('input', { type: () => CreateCategoryInputDTO })
    input: CreateCategoryInputDTO,
  ): Promise<Category> {
    this.logger.log(`GraphQL: Creating category with name: ${input.name}`);
    return this.categoryService.create(input);
  }

  @Mutation(() => Category, {
    description: 'Update an existing category',
  })
  async updateCategory(
    @Args('id', { type: () => ID }) id: string,
    @Args('input', { type: () => UpdateCategoryInputDTO })
    input: UpdateCategoryInputDTO,
  ): Promise<Category> {
    this.logger.log(`GraphQL: Updating category with ID: ${id}`);
    return this.categoryService.update(id, input);
  }

  @Mutation(() => Boolean, {
    description: 'Delete a category by ID',
  })
  async deleteCategory(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    this.logger.log(`GraphQL: Deleting category with ID: ${id}`);
    return this.categoryService.delete(id);
  }
}
