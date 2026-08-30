import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { SongsModule } from '../songs/songs.module';
import { FavoritesModule } from '../favorites/favorites.module';
import { PlaylistsModule } from '../playlists/playlists.module';
import { SongsGqlResolver, FavoritesGqlResolver } from './resolvers/songs.gql.resolver';
import { PlaylistsGqlResolver } from './resolvers/playlists.gql.resolver';

@Module({
  imports: [
    SongsModule,
    FavoritesModule,
    PlaylistsModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      path: 'api/music/graphql',
      playground: true,
    }),
  ],
  providers: [SongsGqlResolver, FavoritesGqlResolver, PlaylistsGqlResolver],
})
export class GqlModule {}
