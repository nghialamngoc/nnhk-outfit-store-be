
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

export class ProductOptionInput {
    name: string;
    value: string;
}

export class ProductVariantInput {
    sku: string;
    price: number;
    discountPrice?: Nullable<number>;
    stockQuantity: number;
    images?: Nullable<string[]>;
    status?: Nullable<string>;
    options?: Nullable<ProductOptionInput[]>;
}

export class CreateProductInput {
    name: string;
    slug: string;
    description?: Nullable<string>;
    basePrice: number;
    variants?: Nullable<ProductVariantInput[]>;
    tags?: Nullable<string[]>;
    status?: Nullable<string>;
}

export class UpdateProductInput {
    id: string;
    name?: Nullable<string>;
    slug?: Nullable<string>;
    description?: Nullable<string>;
    basePrice?: Nullable<number>;
    variants?: Nullable<ProductVariantInput[]>;
    tags?: Nullable<string[]>;
    status?: Nullable<string>;
}

export class GetProductsInput {
    page: number;
    limit: number;
    sortBy?: Nullable<string>;
    sortOrder?: Nullable<string>;
    ids?: Nullable<string[]>;
}

export class Category {
    id: string;
    name: string;
    slug: string;
    description?: Nullable<string>;
    createdAt: Date;
    updatedAt: Date;
}

export abstract class IMutation {
    abstract createCategory(input: CreateCategoryInput): Category | Promise<Category>;

    abstract updateCategory(id: string, input: UpdateCategoryInput): Category | Promise<Category>;

    abstract deleteCategory(id: string): boolean | Promise<boolean>;

    abstract createProduct(input: CreateProductInput): Product | Promise<Product>;

    abstract updateProduct(input: UpdateProductInput): Product | Promise<Product>;
}

export abstract class IQuery {
    abstract category(id: string): Nullable<Category> | Promise<Nullable<Category>>;

    abstract categories(): Nullable<Nullable<Category>[]> | Promise<Nullable<Nullable<Category>[]>>;

    abstract getProducts(input: GetProductsInput): ProductConnection | Promise<ProductConnection>;
}

export class Product {
    id: string;
    name: string;
    slug: string;
    description?: Nullable<string>;
    basePrice: number;
    variants?: Nullable<ProductVariant[]>;
    tags?: Nullable<string[]>;
    status?: Nullable<string>;
    createdAt: Date;
    updatedAt: Date;
}

export class ProductVariant {
    id: string;
    sku: string;
    price: number;
    discountPrice?: Nullable<number>;
    stockQuantity: number;
    options?: Nullable<ProductOption[]>;
    images?: Nullable<string[]>;
    status?: Nullable<string>;
    createdAt: Date;
    updatedAt: Date;
}

export class ProductOption {
    name: string;
    value: string;
}

export class ProductConnection {
    products: Product[];
    totalCount: number;
    pageInfo: PageInfo;
}

export class PageInfo {
    currentPage: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

type Nullable<T> = T | null;
