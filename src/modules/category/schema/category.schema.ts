import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

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
  toObject: {
    transform: (doc, ret: any) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class Category {
  // Virtual property cho TypeScript
  id: string;

  @Prop({ required: true, index: true, trim: true })
  name: string;

  @Prop({
    required: true,
    unique: true,
    index: true,
    trim: true,
    lowercase: true,
  })
  slug: string;

  @Prop({ trim: true })
  description?: string;

  createdAt: Date;
  updatedAt: Date;
}

export type CategoryDocument = Category & Document;
export const CategorySchema = SchemaFactory.createForClass(Category);

// Indexes
CategorySchema.index({ name: 'text', slug: 'text' });

// Virtual cho id
CategorySchema.virtual('id').get(function () {
  return this._id.toHexString();
});

// Middleware để validate slug format
CategorySchema.pre('save', function (next) {
  if (this.slug && !/^[a-z0-9-]+$/.test(this.slug)) {
    return next(
      new Error(
        'Slug must contain only lowercase letters, numbers, and hyphens',
      ),
    );
  }
  next();
});
