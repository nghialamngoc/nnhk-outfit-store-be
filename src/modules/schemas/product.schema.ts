import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ProductStatus } from '../../types/product';

@Schema({
  _id: true, // Enable _id for subdocuments
  timestamps: true,
  toObject: {
    transform: (doc, ret: any) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class ProductVariant {
  @Prop({ type: Types.ObjectId, default: () => new Types.ObjectId() })
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true, index: true })
  sku: string;

  @Prop({ required: true })
  price: number;

  @Prop()
  discountPrice?: number;

  @Prop({ required: true, min: 0 })
  stockQuantity: number;

  @Prop({
    type: [
      {
        name: { type: String, required: true },
        value: { type: String, required: true },
      },
    ],
  })
  options?: { name: string; value: string }[];

  @Prop(String)
  image?: string;

  @Prop({ enum: ProductStatus, default: ProductStatus.active })
  status?: string;

  @Prop({ default: Date.now })
  createdAt?: Date;

  @Prop({ default: Date.now })
  updatedAt?: Date;
}

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop()
  description?: string;

  @Prop([String])
  images?: string[];

  @Prop({ required: true })
  basePrice: number;

  // Embedded variants with their own IDs
  @Prop({ type: [ProductVariant], default: [] })
  variants: ProductVariant[];

  @Prop([String])
  tags?: string[];

  @Prop({ enum: ProductStatus, default: ProductStatus.active })
  status?: string;

  get priceRange(): { min: number; max: number } {
    if (this.variants.length === 0) {
      return { min: this.basePrice, max: this.basePrice };
    }
    const prices = this.variants.map((v) => v.price);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }
}

export type ProductDocument = Product & Document;
export const ProductSchema = SchemaFactory.createForClass(Product);

// Create compound indexes for efficient queries
ProductSchema.index({ 'variants._id': 1 });
ProductSchema.index({ 'variants.sku': 1 });
ProductSchema.index({
  'variants.options.name': 1,
  'variants.options.value': 1,
});
