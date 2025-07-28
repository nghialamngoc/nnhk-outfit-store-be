
/*
 * -------------------------------------------------------
 * THIS FILE WAS AUTOMATICALLY GENERATED (DO NOT MODIFY)
 * -------------------------------------------------------
 */

/* tslint:disable */
/* eslint-disable */

export class CreateCategoryInput {
    name: string;
    slug: string;
    description?: Nullable<string>;
}

export class UpdateCategoryInput {
    name?: Nullable<string>;
    slug?: Nullable<string>;
    description?: Nullable<string>;
}

export class CreateProductInput {
    name: string;
    slug: string;
    description: string;
    categoryId: string;
    brand?: Nullable<BrandInput>;
    price: number;
    discountPrice?: Nullable<number>;
    stock: StockInput[];
    material?: Nullable<string>;
    gender: string;
    images?: Nullable<ImageInput[]>;
    tags?: Nullable<string[]>;
    status: string;
    sku: string;
}

export class BrandInput {
    id: string;
    name: string;
}

export class StockInput {
    size: string;
    color: string;
    quantity: number;
}

export class ImageInput {
    url: string;
    alt?: Nullable<string>;
}

export class Category {
    id: string;
    name: string;
    slug: string;
    description?: Nullable<string>;
    createdAt: Date;
    updatedAt: Date;
}

export abstract class IQuery {
    abstract categories(): Category[] | Promise<Category[]>;

    abstract product(id: string): Nullable<Product> | Promise<Nullable<Product>>;
}

export abstract class IMutation {
    abstract createCategory(input: CreateCategoryInput): Category | Promise<Category>;

    abstract updateCategory(id: string, input: UpdateCategoryInput): Category | Promise<Category>;

    abstract deleteCategory(id: string): boolean | Promise<boolean>;

    abstract createProduct(input: CreateProductInput): Product | Promise<Product>;
}

export class Product {
    id: string;
    name: string;
    slug: string;
    description: string;
    category: Category;
    brand?: Nullable<Brand>;
    price: number;
    discountPrice?: Nullable<number>;
    stock: Stock[];
    material?: Nullable<string>;
    gender: string;
    images?: Nullable<Image[]>;
    tags?: Nullable<string[]>;
    status: string;
    sku: string;
    createdAt: Date;
    updatedAt: Date;
}

export class Brand {
    id: string;
    name: string;
}

export class Stock {
    size: string;
    color: string;
    quantity: number;
}

export class Image {
    url: string;
    alt?: Nullable<string>;
}

type Nullable<T> = T | null;
