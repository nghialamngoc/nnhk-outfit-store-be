import { Prop, Schema } from '@nestjs/mongoose';

@Schema()
export class Brand {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  slug: string;
}
