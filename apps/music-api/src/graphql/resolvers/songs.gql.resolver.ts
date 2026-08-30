import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { SongsService } from '../../songs/songs.service';
import { FavoritesService } from '../../favorites/favorites.service';
import {
  FavoriteGql,
  FavoritePageGql,
  FavoriteToggleGql,
} from '../types/favorite.gql';
import { SearchType } from '../types/playlist.gql';
import { SongGql, toSongGql } from '../types/song.gql';

@Resolver(() => SongGql)
export class SongsGqlResolver {
  constructor(private readonly songsService: SongsService) {}

  @Query(() => [SongGql], { name: 'songs' })
  async songs(
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 200 })
    limit: number,
  ): Promise<SongGql[]> {
    const songs = await this.songsService.findSortedByCreated();
    return songs
      .slice(0, limit)
      .map((s) => toSongGql(s.toObject()))
      .filter((s): s is SongGql => s !== null);
  }

  @Query(() => SongGql, { name: 'song', nullable: true })
  async song(@Args('id') id: string): Promise<SongGql | null> {
    const song = await this.songsService.getSongById(id);
    return song ? toSongGql(song) : null;
  }

  @Query(() => [SongGql], { name: 'search' })
  async search(
    @Args('query') query: string,
    @Args('type', {
      type: () => SearchType,
      nullable: true,
      defaultValue: SearchType.GENERAL,
    })
    type: SearchType,
  ): Promise<SongGql[]> {
    const docs =
      type === SearchType.ARTIST
        ? await this.songsService.searchByArtist(query)
        : type === SearchType.SONG
          ? await this.songsService.searchByTitle(query)
          : type === SearchType.CATEGORY
            ? await this.songsService.searchByCategory(query)
            : await this.songsService.searchGeneral(query);
    return docs
      .map((s) => toSongGql(s.toObject()))
      .filter((s): s is SongGql => s !== null);
  }
}

@Resolver(() => FavoritePageGql)
export class FavoritesGqlResolver {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Query(() => FavoritePageGql, { name: 'favorites' })
  async favorites(
    @Args('userId') userId: string,
    @Args('page', { type: () => Int, nullable: true, defaultValue: 1 })
    page = 1,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 20 })
    limit = 20,
  ): Promise<FavoritePageGql> {
    const res = await this.favoritesService.getFavorites(
      userId,
      page,
      limit,
      'newest',
      { protocol: 'http', host: 'localhost' },
    );
    return {
      favorites: (res.favorites ?? [])
        .map((f: Record<string, any>) => {
          const song = toSongGql(f.song);
          if (!song) return null;
          return {
            fechaLike:
              f.fecha_like instanceof Date
                ? f.fecha_like.toISOString()
                : String(f.fecha_like ?? ''),
            song,
          };
        })
        .filter((f: FavoriteGql | null): f is FavoriteGql => f !== null),
      total: res.total,
      page: res.page,
      limit: res.limit,
      totalPages: res.totalPages,
    };
  }

  @Mutation(() => FavoriteToggleGql, { name: 'toggleFavorite' })
  async toggleFavorite(
    @Args('userId') userId: string,
    @Args('songId') songId: string,
  ): Promise<FavoriteToggleGql> {
    const { isFavorite } = await this.favoritesService.isFavorite(userId, songId);
    if (isFavorite) {
      await this.favoritesService.removeFavorite(userId, songId);
    } else {
      await this.favoritesService.addFavorite(userId, songId);
    }
    return { isFavorite: !isFavorite };
  }
}
