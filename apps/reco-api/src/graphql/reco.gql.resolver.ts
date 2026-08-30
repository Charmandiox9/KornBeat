import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { RecommendationsService } from '../recommendations/recommendations.service';
import { RecommendationGql, toRecommendationGql } from './recommendation.gql';

@Resolver(() => RecommendationGql)
export class RecoGqlResolver {
  constructor(private readonly recoService: RecommendationsService) {}

  @Query(() => [RecommendationGql], { name: 'topGlobal' })
  async topGlobal(
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 100 })
    limit = 100,
    @Args('offset', { type: () => Int, nullable: true, defaultValue: 0 })
    offset = 0,
  ): Promise<RecommendationGql[]> {
    const res = await this.recoService.topGlobal(limit, offset);
    return res.data.map(toRecommendationGql);
  }

  @Query(() => [RecommendationGql], { name: 'topCountry' })
  async topCountry(
    @Args('country') country: string,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 100 })
    limit = 100,
  ): Promise<RecommendationGql[]> {
    const res = await this.recoService.topCountry(country, limit);
    return res.data.map(toRecommendationGql);
  }

  @Query(() => [RecommendationGql], { name: 'forUser' })
  async forUser(
    @Args('userId') userId: string,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 50 })
    limit = 50,
  ): Promise<RecommendationGql[]> {
    const res = await this.recoService.forUser(userId, limit);
    return res.data.map(toRecommendationGql);
  }

  @Query(() => [RecommendationGql], { name: 'recentHistory' })
  async recentHistory(
    @Args('userId') userId: string,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 20 })
    limit = 20,
  ): Promise<RecommendationGql[]> {
    const res = await this.recoService.recentHistory(userId, limit);
    return res.data.map(toRecommendationGql);
  }

  @Query(() => [RecommendationGql], { name: 'discoverEmerging' })
  async discoverEmerging(
    @Args('userId') userId: string,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 25 })
    limit = 25,
  ): Promise<RecommendationGql[]> {
    const res = await this.recoService.discoverEmerging(userId, limit);
    return res.data.map(toRecommendationGql);
  }
}
