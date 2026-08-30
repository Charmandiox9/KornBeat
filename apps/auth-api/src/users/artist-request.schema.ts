import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { MONGO_COLLECTIONS } from '@kornbeat/shared';

export enum ArtistRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Schema({ collection: MONGO_COLLECTIONS.artistRequests, timestamps: true })
export class ArtistRequest extends Document {
  @Prop({ type: String, required: true, index: true })
  userId: string;

  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String, required: true, trim: true })
  artistName: string;

  @Prop({ type: String, trim: true })
  genre?: string | null;

  @Prop({ type: String, trim: true })
  description?: string | null;

  @Prop({ type: String, trim: true })
  links?: string | null;

  @Prop({
    type: String,
    enum: Object.values(ArtistRequestStatus),
    default: ArtistRequestStatus.PENDING,
    index: true,
  })
  status: ArtistRequestStatus;

  @Prop({ type: String, trim: true })
  rejectReason?: string | null;

  @Prop({ type: String })
  reviewedBy?: string | null;

  @Prop({ type: Date })
  reviewedAt?: Date | null;

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export type ArtistRequestDocument = ArtistRequest & Document;

export const ArtistRequestSchema = SchemaFactory.createForClass(ArtistRequest);
