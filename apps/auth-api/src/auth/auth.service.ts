import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthResponse, RegisterResponse, User } from '@kornbeat/shared';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/user.schema';
import { SessionsService } from '../sessions/sessions.service';
import { RedisService } from '../redis/redis.service';
import { REDIS_CLIENT } from '../redis/redis.constants';
import Redis from 'ioredis';
import { REDIS_KEYS, REDIS_TTL } from '@kornbeat/shared';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';

interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
  sessionId: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
    private readonly redisService: RedisService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  // ============= RATE LIMITING POR IP (misma semántica legacy) =============

  private async checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<boolean> {
    if (!this.redisService.isAvailable) return true;
    try {
      const redisKey = `rate_limit:${key}`;
      const current = await this.redis.incr(redisKey);
      if (current === 1) {
        await this.redis.expire(redisKey, windowSeconds);
      }
      return current <= limit;
    } catch (error) {
      console.error('Error en rate limit:', error);
      return true;
    }
  }

  private async assertRateLimit(
    ip: string,
    scope: string,
    limit: number,
    windowSeconds: number,
    message: string,
  ): Promise<void> {
    const allowed = await this.checkRateLimit(`${scope}:${ip}`, limit, windowSeconds);
    if (!allowed) {
      throw new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  // ============= HELPERS =============

  private generateAccessToken(user: { _id: string; email: string }): string {
    const expires = this.configService.get<string>('auth.jwtExpiresIn');
    return this.jwtService.sign({ id: user._id, email: user.email }, {
      secret: this.configService.get<string>('auth.jwtSecret'),
      expiresIn: (expires ?? '15m') as JwtSignOptions['expiresIn'],
    });
  }

  private generateRefreshToken(user: { _id: string; email: string }): string {
    const expires = this.configService.get<string>('auth.refreshTokenExpiresIn');
    return this.jwtService.sign({ id: user._id, email: user.email }, {
      secret: this.configService.get<string>('auth.jwtSecret'),
      expiresIn: (expires ?? '7d') as JwtSignOptions['expiresIn'],
    });
  }

  private toPublicUser(doc: UserDocument): User {
    return {
      _id: doc._id.toString(),
      username: doc.username,
      name: doc.name,
      email: doc.email,
      country: doc.country ?? null,
      date_of_birth: doc.date_of_birth ? doc.date_of_birth.toISOString() : null,
      is_premium: doc.is_premium,
      es_artist: doc.es_artist,
      artist_name: doc.artist_name ?? null,
      isAdmin: doc.isAdmin ?? false,
      date_of_register: doc.date_of_register.toISOString(),
      active: doc.active,
    };
  }

  private async issueTokensAndSession(
    doc: UserDocument,
  ): Promise<AuthResult> {
    const tokenUser = { _id: doc._id.toString(), email: doc.email };
    const accessToken = this.generateAccessToken(tokenUser);
    const refreshToken = this.generateRefreshToken(tokenUser);

    doc.refreshTokens.push(refreshToken);
    await doc.save();
    await this.sessionsService.storeRefreshToken(doc._id.toString(), refreshToken);

    const user = this.toPublicUser(doc);
    const sessionId = `${doc._id.toString()}_${Date.now()}`;
    await this.sessionsService.createSession(sessionId, doc._id.toString(), user);
    await this.sessionsService.cacheUser(doc._id.toString(), user);

    return { user, accessToken, refreshToken, sessionId };
  }

  // ============= REGISTRO =============

  async register(
    dto: RegisterDto,
    ip: string,
  ): Promise<RegisterResponse & { message: string }> {
    await this.assertRateLimit(
      ip,
      'register',
      3,
      3600,
      'Has excedido el límite de registros. Intenta más tarde.',
    );

    const existingUserByEmail = await this.usersService.findByEmail(dto.email);
    if (existingUserByEmail) {
      throw new BadRequestException('El email ya está registrado');
    }

    const baseUsername =
      dto.username || dto.email.split('@')[0].toLowerCase();
    const finalUsername = await this.usersService.generateUniqueUsername(baseUsername);

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const doc = await this.usersService.create({
      username: finalUsername,
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      country: dto.country,
      ...(dto.date_of_birth ? { date_of_birth: new Date(dto.date_of_birth) } : {}),
      is_premium: false,
      es_artist: false,
      date_of_register: new Date(),
      last_acces: new Date(),
      active: true,
      refreshTokens: [],
    });

    const result = await this.issueTokensAndSession(doc);

    return {
      message: 'Usuario registrado exitosamente',
      ...result,
    };
  }

  // ============= LOGIN =============

  async login(dto: LoginDto, ip: string): Promise<AuthResponse> {
    await this.assertRateLimit(
      ip,
      'login',
      10,
      300,
      'Demasiados intentos de login. Intenta más tarde.',
    );

    let user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      user = await this.usersService.findCaseInsensitiveByEmail(dto.email);
    }

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    user.last_acces = new Date();
    user.lastLogin = new Date();
    await user.save();

    const result = await this.issueTokensAndSession(user);
    return result;
  }

  // ============= REFRESH =============

  async refresh(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    // Verificación en Redis primero (paridad con el legacy)
    const storedUserId = await this.sessionsService.validateRefreshToken(
      refreshToken,
    );
    if (!storedUserId) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    let decoded: { id: string; email: string };
    try {
      decoded = await this.jwtService.verifyAsync<{ id: string; email: string }>(
        refreshToken,
        { secret: this.configService.get<string>('auth.jwtSecret') },
      );
    } catch {
      throw new ForbiddenException('Token inválido');
    }

    const user = await this.usersService.findById(decoded.id);

    if (!user || !user.refreshTokens.includes(refreshToken)) {
      throw new ForbiddenException('Refresh token inválido');
    }

    const tokenUser = { _id: user._id.toString(), email: user.email };
    const newAccessToken = this.generateAccessToken(tokenUser);
    const newRefreshToken = this.generateRefreshToken(tokenUser);

    user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken);
    user.refreshTokens.push(newRefreshToken);
    await user.save();

    await this.sessionsService.deleteRefreshToken(refreshToken);
    await this.sessionsService.storeRefreshToken(user._id.toString(), newRefreshToken);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  // ============= LOGOUT =============

  async logout(userId: string, dto: LogoutDto): Promise<{ message: string }> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new ForbiddenException('Usuario no encontrado');
    }

    if (dto.refreshToken) {
      user.refreshTokens = user.refreshTokens.filter((t) => t !== dto.refreshToken);
      await user.save();
      await this.sessionsService.deleteRefreshToken(dto.refreshToken);
    }

    if (dto.sessionId) {
      await this.sessionsService.deleteSession(dto.sessionId, userId);
    }

    await this.sessionsService.invalidateUserCache(userId);
    return { message: 'Logout exitoso' };
  }

  // ============= LOGOUT TODAS LAS SESIONES =============

  async logoutAll(userId: string): Promise<{ message: string }> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new ForbiddenException('Usuario no encontrado');
    }

    const oldTokens = [...user.refreshTokens];
    user.refreshTokens = [];
    await user.save();

    for (const token of oldTokens) {
      await this.sessionsService.deleteRefreshToken(token);
    }

    await this.sessionsService.deleteAllUserSessions(userId);
    await this.sessionsService.invalidateUserCache(userId);

    return { message: 'Todas las sesiones cerradas exitosamente' };
  }

  // ============= PERFIL / SESIÓN =============

  getMe(user: User): { user: User } {
    return { user };
  }

  async getSession(
    sessionId: string,
  ): Promise<{ session: Record<string, string> }> {
    const session = await this.sessionsService.getSession(sessionId);
    if (!session) {
      throw new NotFoundException('Sesión no encontrada o expirada');
    }
    return { session };
  }

  // ============= DEBUG =============

  getRedisDebug(): Record<string, unknown> {
    const info: Record<string, unknown> = {
      connected: this.redisService.isAvailable,
      status: this.redisService.isAvailable ? 'Conectado' : 'Desconectado',
    };
    return info;
  }
}
