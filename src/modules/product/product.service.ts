import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from '../schemas/product.schema';
import {
  CreateProductInputDTO,
  GetProductsInputDTO,
  UpdateProductInputDTO,
} from './dto/product.dto';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  async create(input: CreateProductInputDTO) {
    this.logger.log(`Creating product: ${JSON.stringify(input)}`);

    const { slug, variants } = input;

    // Check if slug already exists
    const existingProduct = await this.productModel.findOne({ slug });
    if (existingProduct) {
      throw new ConflictException(`Product with slug '${slug}' already exists`);
    }

    // Validate SKU uniqueness in variants
    if (variants && variants.length > 0) {
      const skus = variants.map((variant) => variant.sku);
      const duplicateSkus = await this.productModel.find({
        'variants.sku': { $in: skus },
      });
      if (duplicateSkus.length > 0) {
        const existingSkus = duplicateSkus.flatMap((doc) =>
          doc.variants.map((v) => v.sku),
        );
        const conflictingSkus = skus.filter((sku) =>
          existingSkus.includes(sku),
        );
        if (conflictingSkus.length > 0) {
          throw new ConflictException(
            `Variant SKUs '${conflictingSkus.join(', ')}' already exist`,
          );
        }
      }
    }

    try {
      const createdProduct = new this.productModel(input);
      const savedProduct = await createdProduct.save();

      this.logger.log(`Created product with ID: ${savedProduct.id}`);

      return savedProduct;
    } catch (error) {
      this.logger.error(`Failed to create product: ${error.message}`);
      throw new BadRequestException(
        `Failed to create product: ${error.message}`,
      );
    }
  }

  async update(input: UpdateProductInputDTO) {
    const { id, slug, variants } = input;

    this.logger.log(`Updating product ${id}: ${JSON.stringify(input)}`);

    // Validate MongoDB ObjectId format
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid product ID format');
    }

    // Check if product exists
    const existingProduct = await this.productModel.findById(id);
    if (!existingProduct) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Check slug uniqueness if provided and different from current
    if (slug && slug !== existingProduct.slug) {
      const productWithSlug = await this.productModel.findOne({ slug });
      if (productWithSlug) {
        throw new ConflictException(
          `Product with slug '${slug}' already exists`,
        );
      }
    }

    // Validate SKU uniqueness in variants
    if (variants && variants.length > 0) {
      const skus = variants.map((variant) => variant.sku);
      const duplicateSkus = await this.productModel.find({
        _id: { $ne: id }, // Exclude the current product
        'variants.sku': { $in: skus },
      });
      if (duplicateSkus.length > 0) {
        const existingSkus = duplicateSkus.flatMap((doc) =>
          doc.variants.map((v) => v.sku),
        );
        const conflictingSkus = skus.filter((sku) =>
          existingSkus.includes(sku),
        );
        if (conflictingSkus.length > 0) {
          throw new ConflictException(
            `Variant SKUs '${conflictingSkus.join(', ')}' already exist`,
          );
        }
      }
    }

    try {
      const updateData = {
        ...input,
        updatedAt: new Date(),
      };

      // Remove undefined fields
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      const updatedProduct = await this.productModel.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true },
      );

      if (!updatedProduct) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }

      this.logger.log(`Updated product with ID: ${updatedProduct.id}`);

      return updatedProduct;
    } catch (error) {
      this.logger.error(`Failed to update product: ${error.message}`);
      throw new BadRequestException(
        `Failed to update product: ${error.message}`,
      );
    }
  }

  async delete(id: string): Promise<boolean> {
    this.logger.log(`Deleting product with ID: ${id}`);

    // Validate MongoDB ObjectId format
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid product ID format');
    }

    try {
      const product = await this.productModel.findById(id);

      if (!product) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }

      // Delete the product from database
      const result = await this.productModel.findByIdAndDelete(id);

      if (!result) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }

      this.logger.log(`Successfully deleted product with ID: ${id}`);
      return true;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(`Failed to delete product: ${error.message}`);
      throw new BadRequestException(
        `Failed to delete product: ${error.message}`,
      );
    }
  }

  async getProducts(input: GetProductsInputDTO): Promise<{
    products: ProductDocument[];
    totalCount: number;
    pageInfo: {
      currentPage: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  }> {
    this.logger.log(`Fetching products with input: ${JSON.stringify(input)}`);

    const { page, limit, sortBy, sortOrder, ids } = input;

    // Validate page and limit
    if (page < 1 || limit < 1) {
      throw new BadRequestException('Page and limit must be greater than 0');
    }

    // Build query
    const query: any = {};
    if (ids && ids.length > 0) {
      const validIds = ids.filter((id) => Types.ObjectId.isValid(id));
      if (validIds.length !== ids.length) {
        throw new BadRequestException('One or more IDs are invalid');
      }
      query._id = { $in: validIds.map((id) => new Types.ObjectId(id)) };
    }

    // Build sort options
    const sort: any = {};
    if (sortBy && sortOrder) {
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    } else {
      sort.createdAt = -1; // Default sort by createdAt desc
    }

    this.logger.log(`Fetching products with query ${JSON.stringify(query)}`);

    try {
      // Fetch total count
      const totalCount = await this.productModel.countDocuments(query);

      // Calculate pagination
      const skip = (page - 1) * limit;
      const totalPages = Math.ceil(totalCount / limit);

      // Fetch products
      const products = await this.productModel
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec();

      // Build pageInfo
      const pageInfo = {
        currentPage: page,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };

      this.logger.log(`Fetched ${products.length} products for page ${page}`);

      return {
        products,
        totalCount,
        pageInfo,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch products: ${error.message}`);
      throw new BadRequestException(
        `Failed to fetch products: ${error.message}`,
      );
    }
  }
}
