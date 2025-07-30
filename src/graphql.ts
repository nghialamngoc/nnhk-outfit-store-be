
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
}

export abstract class IQuery {
    abstract category(id: string): Nullable<Category> | Promise<Nullable<Category>>;

    abstract categories(): Nullable<Nullable<Category>[]> | Promise<Nullable<Nullable<Category>[]>>;
}

type Nullable<T> = T | null;
