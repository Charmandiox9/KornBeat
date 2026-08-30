import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { RecommendationsModule } from '../recommendations/recommendations.module';
import { RecoGqlResolver } from './reco.gql.resolver';

@Module({
  imports: [
    RecommendationsModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      path: 'api/recommendations/graphql',
      playground: true,
    }),
  ],
  providers: [RecoGqlResolver],
})
export class GqlModule {}
