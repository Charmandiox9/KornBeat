import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ collection: 'likes_canciones', _id: true })
export class LikeCancion extends Document {
  @Prop({
    type: Types.ObjectId,
    required: true,
    ref: 'User',
  })
  usuario_id: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    required: true,
    ref: 'Cancion',
  })
  cancion_id: Types.ObjectId;

  @Prop({ type: Date, default: () => new Date() })
  fecha_like: Date;
}

export type LikeCancionDocument = LikeCancion & Document;

export const LikeCancionSchema = SchemaFactory.createForClass(LikeCancion);

LikeCancionSchema.index(
  { usuario_id: 1, cancion_id: 1 },
  { unique: true },
);
LikeCancionSchema.index({ cancion_id: 1 });
LikeCancionSchema.index({ fecha_like: -1 });
