import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PlaylistsService } from '../../playlists/playlists.service';
import {
  CreatePlaylistInput,
  PlaylistGql,
  toPlaylistGql,
} from '../types/playlist.gql';

@Resolver(() => PlaylistGql)
export class PlaylistsGqlResolver {
  constructor(private readonly playlistsService: PlaylistsService) {}

  @Query(() => [PlaylistGql], { name: 'playlists' })
  async playlists(@Args('userId') userId: string): Promise<PlaylistGql[]> {
    const playlists = await this.playlistsService.findByUser(userId);
    return playlists.map((p: Record<string, any>) => toPlaylistGql(p));
  }

  @Query(() => PlaylistGql, { name: 'playlist', nullable: true })
  async playlist(@Args('id') id: string): Promise<PlaylistGql | null> {
    const playlist = await this.playlistsService.findByIdWithSongs(id);
    return playlist ? toPlaylistGql(playlist as unknown as Record<string, any>) : null;
  }

  @Mutation(() => PlaylistGql, { name: 'createPlaylist' })
  async createPlaylist(
    @Args('userId') userId: string,
    @Args('input') input: CreatePlaylistInput,
  ): Promise<PlaylistGql> {
    const created = await this.playlistsService.create(userId, {
      titulo: input.titulo,
      descripcion: input.descripcion,
      es_privada: input.esPrivada,
      es_colaborativa: input.esColaborativa,
    });
    return toPlaylistGql(created as unknown as Record<string, any>);
  }

  @Mutation(() => Boolean, { name: 'deletePlaylist' })
  async deletePlaylist(@Args('id') id: string): Promise<boolean> {
    await this.playlistsService.remove(id);
    return true;
  }

  @Mutation(() => PlaylistGql, { name: 'addSongToPlaylist' })
  async addSongToPlaylist(
    @Args('playlistId') playlistId: string,
    @Args('songId') songId: string,
    @Args('userId') userId: string,
  ): Promise<PlaylistGql> {
    await this.playlistsService.addSong(playlistId, songId, userId);
    const playlist = await this.playlistsService.findById(playlistId);
    return toPlaylistGql(playlist as unknown as Record<string, any>);
  }

  @Mutation(() => Boolean, { name: 'removeSongFromPlaylist' })
  async removeSongFromPlaylist(
    @Args('playlistId') playlistId: string,
    @Args('songId') songId: string,
  ): Promise<boolean> {
    await this.playlistsService.removeSong(playlistId, songId);
    return true;
  }
}
