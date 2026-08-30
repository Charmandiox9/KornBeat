import { Field, Int, ObjectType } from '@nestjs/graphql';
import { SongGql } from './song.gql';

@ObjectType()
export class FavoriteGql {
  @Field() fechaLike: string;
  @Field(() => SongGql) song: SongGql;
}

@ObjectType()
export class FavoritePageGql {
  @Field(() => [FavoriteGql]) favorites: FavoriteGql[];
  @Field(() => Int) total: number;
  @Field(() => Int) page: number;
  @Field(() => Int) limit: number;
  @Field(() => Int) totalPages: number;
}

@ObjectType()
export class FavoriteToggleGql {
  @Field(() => Boolean) isFavorite: boolean;
}
