import {
  IsString,
  IsNotEmpty,
  IsOptional,
  Length,
  Matches,
  IsNumber,
  Min,
  IsArray,
  IsEnum,
  IsMongoId,
  ArrayMaxSize,
  IsUrl,
  IsInt,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { InputType, Field } from '@nestjs/graphql';
import { ProductStatus } from 'src/types/product';

export class StockItemDTO {
  @IsString()
  @IsNotEmpty()
  @Length(1, 10, { message: 'Size must be between 1 and 10 characters' })
  size: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 30, { message: 'Color must be between 1 and 30 characters' })
  color: string;

  @IsInt()
  @Min(0, { message: 'Quantity must be greater than or equal to 0' })
  quantity: number;
}

// Image item DTO
export class ImageItemDTO {
  @IsString()
  @IsNotEmpty()
  @IsUrl({}, { message: 'Image URL must be a valid URL' })
  url: string;

  @IsString()
  @IsOptional()
  @Length(0, 200, { message: 'Alt text must not exceed 200 characters' })
  alt?: string;
}

@InputType()
export class CreateProductInputDTO {
  @Field()
  @IsString()
  @IsNotEmpty()
  @Length(1, 200, {
    message: 'Product name must be between 1 and 200 characters',
  })
  @Transform(({ value }) => value?.trim())
  name: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @Length(1, 200, { message: 'Slug must be between 1 and 200 characters' })
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  @Transform(({ value }) => value?.trim().toLowerCase())
  slug: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  @Length(0, 2000, { message: 'Description must not exceed 2000 characters' })
  @Transform(({ value }) => value?.trim())
  description?: string;

  @Field()
  @IsNumber(
    { maxDecimalPlaces: 0 },
    { message: 'Price must be a valid number' },
  )
  @Min(0, { message: 'Price must be greater than or equal to 0' })
  @Type(() => Number)
  price: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 0 },
    {
      message: 'Discount price must be a valid number',
    },
  )
  @Min(0, { message: 'Original price must be greater than or equal to 0' })
  @Type(() => Number)
  discountPrice?: number;

  @Field()
  @IsString()
  @IsNotEmpty()
  @IsMongoId({ message: 'Category ID must be a valid MongoDB ObjectId' })
  categoryId: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20, { message: 'Maximum 20 tags allowed' })
  @IsString({ each: true })
  @Length(1, 50, {
    each: true,
    message: 'Each tag must be between 1 and 50 characters',
  })
  @Transform(({ value }) =>
    value?.map((tag: string) => tag.trim().toLowerCase()),
  )
  tags?: string[];

  @Field(() => [StockItemDTO])
  @IsArray()
  @ArrayMaxSize(100, { message: 'Maximum 100 stock items allowed' })
  @ValidateNested({ each: true })
  @Type(() => StockItemDTO)
  stock: StockItemDTO[];

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @Length(1, 50, { message: 'SKU must be between 1 and 50 characters' })
  @Transform(({ value }) => value?.trim().toUpperCase())
  sku?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsEnum(ProductStatus, {
    message: 'Status must be one of: active, inactive, out_of_stock',
  })
  status?: ProductStatus;

  @Field(() => [ImageItemDTO], { nullable: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20, { message: 'Maximum 20 images allowed' })
  @ValidateNested({ each: true })
  @Type(() => ImageItemDTO)
  images?: ImageItemDTO[];
}

export class ProductParamDTO {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9a-fA-F]{24}$/, { message: 'Invalid product ID format' })
  id: string;
}

export class ProductSlugParamDTO {
  @IsString()
  @IsNotEmpty()
  @Length(1, 200)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Invalid slug format',
  })
  slug: string;
}
