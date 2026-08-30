import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, _id: true })
export class Song extends Document {
  @Prop({ type: String, required: true, trim: true })
  title: string;

  @Prop({ type: String, required: true, trim: true })
  artist: string;

  @Prop({ type: [String], default: [] })
  composers: string[];

  @Prop({ type: String, trim: true })
  album: string;

  @Prop({ type: Number, required: true })
  duration: number;

  @Prop({ type: String, trim: true })
  genre: string;

  @Prop({ type: [String], default: [] })
  categorias: string[];

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: String, required: true })
  fileName: string;

  @Prop({ type: Number, required: true })
  fileSize: number;

  @Prop({ type: String, default: null })
  coverUrl: string | null;

  @Prop({ type: Date, default: () => new Date() })
  uploadDate: Date;

  @Prop({ type: Number, default: 0 })
  playCount: number;

  @Prop({ type: Number, default: 0 })
  likes: number;

  @Prop({ type: String, index: true })
  artist_id?: string | null;

  @Prop({ type: Types.ObjectId, ref: 'albumes', index: true })
  album_id?: Types.ObjectId | null;
}

export type SongDocument = Song & Document;

export const SongSchema = SchemaFactory.createForClass(Song);

SongSchema.index({ title: 'text', artist: 'text', composers: 'text' });
SongSchema.index({ artist: 1 });
SongSchema.index({ composers: 1 });
SongSchema.index({ title: 1 });
SongSchema.index({ genre: 1 });
SongSchema.index({ categorias: 1 });
SongSchema.index({ tags: 1 });
