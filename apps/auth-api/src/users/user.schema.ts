import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'usuarios', _id: true })
export class User extends Document {
  @Prop({ type: String, required: true, unique: true })
  email: string;

  @Prop({ type: String, required: true })
  password: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, unique: true })
  username: string;

  @Prop({ type: String })
  country?: string;

  @Prop({ type: Date })
  date_of_birth?: Date | null;

  @Prop({ type: Boolean, default: false })
  is_premium: boolean;

  @Prop({ type: Boolean, default: false })
  es_artist: boolean;

  @Prop({ type: String })
  artist_name?: string | null;

  @Prop({ type: Boolean, default: false })
  isAdmin: boolean;

  @Prop({ type: Date, default: () => new Date() })
  date_of_register: Date;

  @Prop({ type: Date })
  last_acces?: Date;

  @Prop({ type: Boolean, default: true })
  active: boolean;

  @Prop({ type: [String], default: [] })
  refreshTokens: string[];

  @Prop({ type: Date })
  lastLogin?: Date;
}

export type UserDocument = User & Document;

export const UserSchema = SchemaFactory.createForClass(User);
