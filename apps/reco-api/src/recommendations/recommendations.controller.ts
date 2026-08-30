import { Controller, Get, Param, Query } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';

@Controller('api/recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get('top-global')
  topGlobal(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.recommendationsService.topGlobal(
      parseInt(limit ?? '100', 10),
      parseInt(offset ?? '0', 10),
    );
  }

  @Get('top-country/:country')
  topCountry(
    @Param('country') country: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.recommendationsService.topCountry(
      country,
      parseInt(limit ?? '100', 10),
      parseInt(offset ?? '0', 10),
    );
  }

  @Get('for-user/:userId')
  forUser(@Param('userId') userId: string, @Query('limit') limit?: string) {
    return this.recommendationsService.forUser(
      userId,
      parseInt(limit ?? '50', 10),
    );
  }

  @Get('discover-emerging/:userId')
  discoverEmerging(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    return this.recommendationsService.discoverEmerging(
      userId,
      parseInt(limit ?? '25', 10),
    );
  }

  @Get('recent-history/:userId')
  recentHistory(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    return this.recommendationsService.recentHistory(
      userId,
      parseInt(limit ?? '20', 10),
    );
  }
}
