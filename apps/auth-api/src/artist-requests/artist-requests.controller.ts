import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { User } from '@kornbeat/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ArtistRequestsService } from './artist-requests.service';
import { CreateArtistRequestDto } from './dto/create-artist-request.dto';
import { ReviewArtistRequestDto } from './dto/review-artist-request.dto';

@ApiTags('artist-requests')
@Controller()
export class ArtistRequestsController {
  constructor(private readonly artistRequestsService: ArtistRequestsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('auth/artist-requests')
  create(@CurrentUser() user: User, @Body() dto: CreateArtistRequestDto) {
    return this.artistRequestsService.createRequest(user, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('auth/artist-requests/me')
  me(@CurrentUser() user: User) {
    return this.artistRequestsService.getMine(user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('auth/admin/artist-requests')
  list(@Query('status') status?: string) {
    return this.artistRequestsService.listAll(status);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch('auth/admin/artist-requests/:id')
  review(
    @Param('id') id: string,
    @Body() dto: ReviewArtistRequestDto,
    @CurrentUser() admin: User,
  ) {
    return this.artistRequestsService.review(
      id,
      dto.action,
      dto.reason,
      admin.email,
    );
  }
}
