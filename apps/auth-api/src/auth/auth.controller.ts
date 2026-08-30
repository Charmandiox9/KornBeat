import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '@kornbeat/shared';
import { RedisService } from '../redis/redis.service';

@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly redisService: RedisService,
  ) {}

  private ipOf(req: Request): string {
    return req.ip ?? req.socket.remoteAddress ?? 'unknown';
  }

  @Post('auth/register')
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.register(dto, this.ipOf(req));
  }

  @Post('auth/login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, this.ipOf(req));
  }

  @Post('auth/refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('auth/logout')
  logout(@CurrentUser() user: User, @Body() dto: LogoutDto) {
    return this.authService.logout(user._id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('auth/logout-all')
  logoutAll(@CurrentUser() user: User) {
    return this.authService.logoutAll(user._id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('auth/me')
  me(@CurrentUser() user: User) {
    return this.authService.getMe(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('auth/session/:sessionId')
  session(@Param('sessionId') sessionId: string) {
    return this.authService.getSession(sessionId);
  }

  @Get('auth/debug/redis')
  async debugRedis() {
    const info = this.authService.getRedisDebug();
    if (this.redisService.isAvailable) {
      info.keys = await this.redisService.dbSize();
    }
    return info;
  }
}
