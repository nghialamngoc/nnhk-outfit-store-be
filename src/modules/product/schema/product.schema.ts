import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Gender, ProductStatus } from 'src/types/product';

@Schema({
  timestamps: true,
  toJSON: {
    transform: (doc, ret: any) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class Product {
  @Prop({ required: true, index: true })
  name: string;

  @Prop({ required: true, unique: true, index: true })
  slug: string;

  @Prop({ required: true })
  description: string;

  @Prop({
    type: {
      _id: { type: Types.ObjectId, required: true, ref: 'Category' },
      name: { type: String, required: true },
    },
    required: true,
  })
  category: { _id: Types.ObjectId; name: string };

  @Prop({
    type: {
      _id: { type: Types.ObjectId, required: true, ref: 'Brand' },
      name: { type: String, required: true },
    },
  })
  brand: { _id: Types.ObjectId; name: string };

  @Prop({ required: true })
  price: number;

  @Prop()
  discountPrice?: number;

  @Prop({
    type: [
      {
        size: { type: String, required: true },
        color: { type: String, required: true },
        quantity: { type: Number, required: true, min: 0 },
      },
    ],
    required: true,
  })
  stock: { size: string; color: string; quantity: number }[];

  @Prop()
  material?: string;

  @Prop({ enum: Gender, default: Gender.unisex })
  gender: string;

  @Prop({
    type: [{ url: { type: String, required: true }, alt: { type: String } }],
  })
  images: { url: string; alt?: string }[];

  @Prop({ type: [String], index: true })
  tags: string[];

  @Prop({ enum: ProductStatus, default: ProductStatus.active })
  status: string;

  @Prop({ required: true, unique: true, index: true })
  sku: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export type ProductDocument = Product & Document;
export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.index({ name: 'text', tags: 'text' });
ProductSchema.index({ 'category._id': 1 });
ProductSchema.index({ sku: 1 });
