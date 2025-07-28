import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { Category } from 'src/graphql';
import { CategoryService } from './category.service';
import {
  CreateCategoryInputDTO,
  UpdateCategoryInputDTO,
} from './dto/category.dto';

@Resolver(() => Category)
export class CategoryResolver {
  constructor(private readonly categoryService: CategoryService) {}

  @Mutation(() => Category)
  async createCategory(@Args('input') input: CreateCategoryInputDTO) {
    return this.categoryService.create(input);
  }

  @Query(() => [Category], { name: 'categories' })
  async findAllCategories() {
    return this.categoryService.findAll();
  }

  @Mutation(() => Category)
  async updateCategory(
    @Args('id') id: string,
    @Args('input') input: UpdateCategoryInputDTO,
  ) {
    return this.categoryService.update(id, input);
  }

  @Mutation(() => Boolean)
  async deleteCategory(@Args('id') id: string) {
    return this.categoryService.delete(id);
  }
}
