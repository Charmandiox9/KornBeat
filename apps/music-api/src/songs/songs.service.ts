import { Injectable } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { Song, SongDocument } from './song.schema';

@Injectable()
export class SongsService {
  constructor(
    @InjectModel(Song.name) private readonly songModel: Model<SongDocument>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  get cancionesCollection() {
    return this.connection.collection('canciones');
  }

  get songsCollection() {
    return this.connection.collection('songs');
  }

  findSortedByCreated(): Promise<SongDocument[]> {
    return this.songModel.find().sort({ createdAt: -1 });
  }

  findById(id: string): Promise<SongDocument | null> {
    return this.songModel.findById(id);
  }

  findByIds(ids: Types.ObjectId[]): Promise<SongDocument[]> {
    return this.songModel.find({ _id: { $in: ids } });
  }

  async findCancionesByIds(ids: Types.ObjectId[]): Promise<Record<string, any>[]> {
    return this.cancionesCollection
      .find({ _id: { $in: ids } })
      .toArray();
  }

  /**
   * Busca una canción en 'canciones' primero y luego en 'songs'
   * (paridad con getSongById del legacy).
   */
  async getSongById(id: string): Promise<Record<string, any> | null> {
    try {
      let cancion = await this.cancionesCollection.findOne({
        _id: new Types.ObjectId(id),
      });
      if (!cancion) {
        cancion = await this.songsCollection.findOne({
          _id: new Types.ObjectId(id),
        });
      }
      return cancion;
    } catch (error) {
      console.error('Error al buscar canción:', error);
      return null;
    }
  }

  searchByArtist(artistName: string): Promise<SongDocument[]> {
    return this.songModel
      .find({
        $or: [
          { artist: { $regex: artistName, $options: 'i' } },
          { composers: { $regex: artistName, $options: 'i' } },
        ],
      })
      .sort({ playCount: -1 });
  }

  searchByTitle(songTitle: string): Promise<SongDocument[]> {
    return this.songModel
      .find({ title: { $regex: songTitle, $options: 'i' } })
      .sort({ playCount: -1 });
  }

  searchByCategory(category: string): Promise<SongDocument[]> {
    return this.songModel
      .find({
        $or: [
          { genre: { $regex: category, $options: 'i' } },
          { categorias: { $in: [new RegExp(category, 'i')] } },
          { tags: { $in: [new RegExp(category, 'i')] } },
        ],
      })
      .sort({ playCount: -1 });
  }

  searchGeneral(query: string): Promise<SongDocument[]> {
    return this.songModel
      .find({
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { artist: { $regex: query, $options: 'i' } },
          { composers: { $regex: query, $options: 'i' } },
          { album: { $regex: query, $options: 'i' } },
          { genre: { $regex: query, $options: 'i' } },
        ],
      })
      .sort({ playCount: -1 });
  }

  async incrementField(
    id: string,
    field: 'playCount' | 'likes',
    amount: number,
  ): Promise<void> {
    await this.songModel.findByIdAndUpdate(id, { $inc: { [field]: amount } });
  }

  findByIdAndUpdate(
    id: string,
    update: Record<string, any>,
  ): Promise<SongDocument | null> {
    return this.songModel.findByIdAndUpdate(id, update).exec();
  }

  create(data: Partial<Song>): Promise<SongDocument> {
    return this.songModel.create(data);
  }

  findByFileName(fileName: string): Promise<SongDocument | null> {
    return this.songModel.findOne({ fileName });
  }

  findByArtist(artistId: string): Promise<SongDocument[]> {
    return this.songModel
      .find({ artist_id: artistId })
      .sort({ createdAt: -1 });
  }

  findSinglesByArtist(artistId: string): Promise<SongDocument[]> {
    return this.songModel
      .find({ artist_id: artistId, album_id: null })
      .sort({ createdAt: -1 });
  }

  findSongsToAlbum(albumId: Types.ObjectId): Promise<SongDocument[]> {
    return this.songModel.find({ album_id: albumId }).sort({ createdAt: 1 });
  }

  removeById(id: string): Promise<SongDocument | null> {
    return this.songModel.findByIdAndDelete(id);
  }
}
