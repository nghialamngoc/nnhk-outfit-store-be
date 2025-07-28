import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { CategoryService } from './category.service';
import { CreateCategoryInputDTO } from './dto/category.dto';
import { Category } from './schema/category.schema';

@Resolver(() => Category)
export class CategoryResolver {
  constructor(private readonly categoryService: CategoryService) {}

  @Mutation(() => Category)
  async createCategory(@Args('input') input: CreateCategoryInputDTO) {
    console.log('haaa');

    return this.categoryService.create(input);
  }
}
