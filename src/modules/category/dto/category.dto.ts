import {
  IsString,
  IsNotEmpty,
  IsOptional,
  Length,
  Matches,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateCategoryInputDTO {
  @Field()
  @IsString()
  @IsNotEmpty()
  @Length(1, 100, { message: 'Name must be between 1 and 100 characters' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @Length(1, 100, { message: 'Slug must be between 1 and 100 characters' })
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  @Transform(({ value }) => value?.trim().toLowerCase())
  slug: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  @Length(0, 500, { message: 'Description must not exceed 500 characters' })
  @Transform(({ value }) => value?.trim())
  description?: string;
}

@InputType()
export class UpdateCategoryInputDTO {
  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  @Length(1, 100, { message: 'Name must be between 1 and 100 characters' })
  @Transform(({ value }) => value?.trim())
  name?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  @Length(1, 100, { message: 'Slug must be between 1 and 100 characters' })
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  @Transform(({ value }) => value?.trim().toLowerCase())
  slug?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  @Length(0, 500, { message: 'Description must not exceed 500 characters' })
  @Transform(({ value }) => value?.trim())
  description?: string;
}

export class FindCategoriesQueryDTO {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 20;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => parseInt(value, 10))
  offset?: number = 0;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  @Transform(({ value }) => value?.trim())
  search?: string;
}

export class CategoryParamDTO {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9a-fA-F]{24}$/, { message: 'Invalid category ID format' })
  id: string;
}

export class CategorySlugParamDTO {
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Invalid slug format',
  })
  slug: string;
}
