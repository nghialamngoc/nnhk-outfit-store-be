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
import { R2Service } from '../r2/r2.service';
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
    private readonly r2Service: R2Service,
  ) {}

  async create(input: CreateProductInputDTO) {
    this.logger.log(
      `Creating product: ${JSON.stringify({
        ...input,
        images: input.images ? `[${input.images.length} images]` : 'none',
        variants: input.variants?.map((v) => ({
          ...v,
          image: v.image ? '[base64 image]' : 'none',
        })),
      })}`,
    );

    const { slug, variants, images } = input;

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
      // Upload product images to R2 if provided
      let productImageUrls: string[] = [];
      if (images && images.length > 0) {
        this.logger.log(`Uploading ${images.length} product images to R2`);
        productImageUrls = await this.r2Service.uploadMultipleImagesFromBase64(
          images,
          'products',
        );
      }

      // Process variants and upload variant images
      let processedVariants: any = [];
      if (variants && variants.length > 0) {
        this.logger.log(`Processing ${variants.length} product variants`);

        processedVariants = await Promise.all(
          variants.map(async (variant) => {
            let variantImageUrl: string | undefined;

            // Upload variant image if provided
            if (variant.image) {
              this.logger.log(
                `Uploading variant image for SKU: ${variant.sku}`,
              );
              variantImageUrl = await this.r2Service.uploadImageFromBase64(
                variant.image,
                'products/variants',
              );
            }

            return {
              ...variant,
              image: variantImageUrl,
              _id: new Types.ObjectId(), // Generate new ObjectId for variant
            };
          }),
        );
      }

      // Create product data with uploaded image URLs
      const productData = {
        ...input,
        images: productImageUrls,
        variants: processedVariants,
      };

      const createdProduct = new this.productModel(productData);
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
    const { id, slug, variants, images } = input;

    this.logger.log(
      `Updating product ${id}: ${JSON.stringify({
        ...input,
        images:
          input.images !== undefined
            ? `[${input.images?.length || 0} images]`
            : 'unchanged',
        variants: input.variants?.map((v) => ({
          ...v,
          image: v.image ? '[base64 image]' : 'unchanged',
        })),
      })}`,
    );

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
      let productImageUrls: string[] = existingProduct.images || [];

      // Handle product images updates if provided
      if (images !== undefined) {
        if (images && images.length > 0) {
          // Replace old product images with new ones
          this.logger.log(
            `Replacing ${existingProduct.images?.length || 0} old product images with ${images.length} new images`,
          );
          productImageUrls = await this.r2Service.replaceImages(
            existingProduct.images,
            images,
            'products',
          );
        } else if (images.length === 0) {
          // Delete all existing product images
          this.logger.log(
            `Deleting all ${existingProduct.images?.length || 0} existing product images`,
          );
          if (existingProduct.images && existingProduct.images.length > 0) {
            await this.r2Service.deleteMultipleImages(existingProduct.images);
          }
          productImageUrls = [];
        }
      }

      // Process variants updates
      let processedVariants = existingProduct.variants || [];

      if (variants !== undefined) {
        if (variants && variants.length > 0) {
          this.logger.log(`Processing ${variants.length} variant updates`);

          // Collect old variant images for cleanup
          const oldVariantImages =
            existingProduct.variants
              ?.filter((v) => v.image)
              .map((v) => v.image as string) || [];

          // Process new variants
          processedVariants = await Promise.all(
            variants.map(async (variant) => {
              let variantImageUrl: string | undefined = variant.image;

              // If variant has new base64 image, upload it
              if (variant.image && variant.image.startsWith('data:')) {
                this.logger.log(
                  `Uploading new variant image for SKU: ${variant.sku}`,
                );
                variantImageUrl = await this.r2Service.uploadImageFromBase64(
                  variant.image,
                  'products/variants',
                );
              }

              return {
                ...variant,
                image: variantImageUrl,
                _id: variant.id
                  ? new Types.ObjectId(variant.id)
                  : new Types.ObjectId(),
              };
            }),
          );

          // Clean up old variant images (don't await to not block response)
          if (oldVariantImages.length > 0) {
            this.r2Service
              .deleteMultipleImages(oldVariantImages)
              .catch((error) => {
                this.logger.error(
                  `Failed to delete old variant images: ${error.message}`,
                );
              });
          }
        } else {
          // Delete all existing variant images if variants array is empty
          const oldVariantImages =
            existingProduct.variants
              ?.filter((v) => v.image)
              .map((v) => v.image as string) || [];

          if (oldVariantImages.length > 0) {
            this.r2Service
              .deleteMultipleImages(oldVariantImages)
              .catch((error) => {
                this.logger.error(
                  `Failed to delete variant images: ${error.message}`,
                );
              });
          }
          processedVariants = [];
        }
      }

      const updateData = {
        ...input,
        images: productImageUrls,
        variants: processedVariants,
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

      // Collect all images to delete
      const imagesToDelete: string[] = [];

      // Add product images
      if (product.images && product.images.length > 0) {
        imagesToDelete.push(...product.images);
      }

      // Add variant images
      if (product.variants && product.variants.length > 0) {
        const variantImages = product.variants
          .filter((v) => v.image)
          .map((v) => v.image as string);
        imagesToDelete.push(...variantImages);
      }

      // Delete associated images from R2
      if (imagesToDelete.length > 0) {
        this.logger.log(`Deleting ${imagesToDelete.length} images from R2`);
        // Don't await to not block the deletion process
        this.r2Service.deleteMultipleImages(imagesToDelete).catch((error) => {
          this.logger.error(
            `Failed to delete images for product ${id}: ${error.message}`,
          );
        });
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
