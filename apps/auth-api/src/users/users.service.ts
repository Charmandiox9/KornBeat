import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly model: Model<UserDocument>) {}

  findByIdPublic(id: string): Promise<UserDocument | null> {
    return this.model.findById(id).select('-password -refreshTokens');
  }

  findByEmail(email: string): Promise<UserDocument | null> {
    return this.model.findOne({ email });
  }

  findCaseInsensitiveByEmail(email: string): Promise<UserDocument | null> {
    return this.model.findOne({ email: { $regex: `^${email}$`, $options: 'i' } });
  }

  findById(id: string): Promise<UserDocument | null> {
    return this.model.findById(id);
  }

  findByIdsPublic(ids: string[]): Promise<UserDocument[]> {
    return this.model
      .find({ _id: { $in: ids } })
      .select('-password -refreshTokens');
  }

  update(
    id: string,
    update: Partial<UserDocument>,
  ): Promise<UserDocument | null> {
    return this.model
      .findByIdAndUpdate(id, update, { new: true, runValidators: false })
      .select('-password -refreshTokens');
  }

  findByUsername(username: string): Promise<UserDocument | null> {
    return this.model.findOne({ username });
  }

  async create(data: Partial<UserDocument>): Promise<UserDocument> {
    const doc = await this.model.create(data);
    return doc;
  }

  async assertUsernameAvailable(username: string): Promise<void> {
    const existing = await this.findByUsername(username);
    if (existing) {
      throw new ConflictException('El nombre de usuario ya está registrado');
    }
  }

  async generateUniqueUsername(base: string): Promise<string> {
    const candidate = base || 'usuario';
    const first = await this.findByUsername(candidate);
    if (!first) return candidate;

    let counter = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const withSuffix = `${candidate}_${counter}`;
      const existing = await this.findByUsername(withSuffix);
      if (!existing) return withSuffix;
      counter += 1;
    }
  }
}
