import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { LoginProvider, UserRole } from 'src/types';

@Schema({
  timestamps: true,
  toObject: {
    transform: (doc, ret: any) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      if (ret.password) delete ret.password;
      return ret;
    },
  },
})
export class User {
  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  email: string;

  @Prop()
  password?: string;

  @Prop({ enum: LoginProvider, default: LoginProvider.local })
  provider?: string;

  @Prop({ unique: true, sparse: true })
  providerId?: string;

  @Prop({ trim: true })
  name?: string;

  @Prop({
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.user,
  })
  role: string;

  @Prop({ default: true })
  isActive?: boolean;
}

export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);
