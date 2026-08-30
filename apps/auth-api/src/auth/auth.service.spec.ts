import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { SessionsService } from '../sessions/sessions.service';
import { RedisService } from '../redis/redis.service';
import { REDIS_CLIENT } from '../redis/redis.constants';
import { UserDocument } from '../users/user.schema';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let sessionsService: jest.Mocked<SessionsService>;
  let jwtService: jest.Mocked<JwtService>;
  let redis: jest.Mocked<object>;

  const configService = {
    get: jest.fn((key: string) => {
      const map: Record<string, string> = {
        'auth.jwtSecret': 'test-secret',
        'auth.jwtExpiresIn': '15m',
        'auth.refreshTokenExpiresIn': '7d',
      };
      return map[key];
    }),
  } as unknown as ConfigService;

  const makeUserDoc = (overrides: Partial<UserDocument> = {}): jest.Mocked<UserDocument> => {
    const id = new Types.ObjectId();
    return {
      _id: id,
      email: 'test@kornbeat.com',
      name: 'Test User',
      username: 'testuser',
      country: 'ES',
      date_of_birth: null,
      is_premium: false,
      es_artist: false,
      date_of_register: new Date(),
      last_acces: undefined,
      active: true,
      refreshTokens: [],
      lastLogin: undefined,
      save: jest.fn().mockResolvedValue(undefined),
      select: jest.fn().mockReturnThis(),
      ...overrides,
    } as unknown as jest.Mocked<UserDocument>;
  };

  beforeEach(async () => {
    jwtService = {
      sign: jest.fn().mockReturnValue('signed-token'),
      verifyAsync: jest.fn().mockResolvedValue({
        id: 'u1',
        email: 'test@kornbeat.com',
      }),
    } as unknown as jest.Mocked<JwtService>;

    usersService = {
      findByEmail: jest.fn(),
      findCaseInsensitiveByEmail: jest.fn(),
      findById: jest.fn(),
      findByUsername: jest.fn(),
      create: jest.fn(),
      assertUsernameAvailable: jest.fn(),
      generateUniqueUsername: jest.fn().mockResolvedValue('testuser'),
    } as unknown as jest.Mocked<UsersService>;

    sessionsService = {
      cacheUser: jest.fn().mockResolvedValue(undefined),
      getCachedUser: jest.fn().mockResolvedValue(null),
      invalidateUserCache: jest.fn().mockResolvedValue(undefined),
      createSession: jest.fn().mockResolvedValue(undefined),
      getSession: jest.fn().mockResolvedValue(null),
      deleteSession: jest.fn().mockResolvedValue(undefined),
      deleteAllUserSessions: jest.fn().mockResolvedValue(undefined),
      storeRefreshToken: jest.fn().mockResolvedValue(undefined),
      validateRefreshToken: jest.fn().mockResolvedValue('u1'),
      deleteRefreshToken: jest.fn().mockResolvedValue(undefined),
      isAvailable: true,
    } as unknown as jest.Mocked<SessionsService>;

    redis = {
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
    } as unknown as jest.Mocked<object>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: UsersService, useValue: usersService },
        { provide: SessionsService, useValue: sessionsService },
        { provide: RedisService, useValue: sessionsService },
        { provide: REDIS_CLIENT, useValue: redis },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('register', () => {
    const dto = {
      email: 'test@kornbeat.com',
      password: 'secret123',
      name: 'Test User',
      country: 'ES',
    };

    it('registra un usuario y devuelve tokens y sesión', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      const doc = makeUserDoc();
      usersService.create.mockResolvedValue(doc);

      const result = await service.register(dto, '127.0.0.1');

      expect(result.message).toBe('Usuario registrado exitosamente');
      expect(result.accessToken).toBe('signed-token');
      expect(result.refreshToken).toBe('signed-token');
      expect(typeof result.sessionId).toBe('string');
      expect((result.user as { email: string }).email).toBe('test@kornbeat.com');
      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@kornbeat.com',
          username: 'testuser',
        }),
      );
      expect(sessionsService.storeRefreshToken).toHaveBeenCalled();
      expect(sessionsService.createSession).toHaveBeenCalled();
    });

    it('rechaza un email ya registrado', async () => {
      usersService.findByEmail.mockResolvedValue(makeUserDoc());

      await expect(service.register(dto, '127.0.0.1')).rejects.toThrow(
        'El email ya está registrado',
      );
    });
  });

  describe('login', () => {
    const dto = { email: 'test@kornbeat.com', password: 'secret123' };

    it('devuelve tokens cuando las credenciales son válidas', async () => {
      const doc = makeUserDoc({ password: await bcrypt.hash('secret123', 4) });
      usersService.findByEmail.mockResolvedValue(doc);

      const result = await service.login(dto, '127.0.0.1');

      expect(result.accessToken).toBe('signed-token');
      expect(result.refreshToken).toBe('signed-token');
      expect(result.sessionId).toBeDefined();
      expect((result.user as { email: string }).email).toBe('test@kornbeat.com');
    });

    it('rechaza credenciales inválidas', async () => {
      const doc = makeUserDoc({ password: await bcrypt.hash('otra', 4) });
      usersService.findByEmail.mockResolvedValue(doc);

      await expect(service.login(dto, '127.0.0.1')).rejects.toThrow(
        'Credenciales inválidas',
      );
    });

    it('rechaza cuando el usuario no existe', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findCaseInsensitiveByEmail.mockResolvedValue(null);

      await expect(service.login(dto, '127.0.0.1')).rejects.toThrow(
        'Credenciales inválidas',
      );
    });
  });

  describe('refresh', () => {
    it(' rota el refresh token', async () => {
      const doc = makeUserDoc({
        _id: new Types.ObjectId(),
        refreshTokens: ['old-token'],
      });
      usersService.findById.mockResolvedValue(doc);
      sessionsService.validateRefreshToken.mockResolvedValue(doc._id.toString());

      const result = await service.refresh('old-token');

      expect(result.accessToken).toBe('signed-token');
      expect(result.refreshToken).toBe('signed-token');
      expect(doc.refreshTokens).toEqual(['signed-token']);
      expect(sessionsService.deleteRefreshToken).toHaveBeenCalledWith('old-token');
    });

    it('rechaza un refresh token no registrado', async () => {
      const doc = makeUserDoc({ refreshTokens: ['otro'] });
      usersService.findById.mockResolvedValue(doc);

      await expect(service.refresh('old-token')).rejects.toThrow(
        'Refresh token inválido',
      );
    });

    it('rechaza con 401 si el token no está en Redis', async () => {
      sessionsService.validateRefreshToken.mockResolvedValue(null);

      await expect(service.refresh('old-token')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(usersService.findById).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('elimina el refresh token y la sesión', async () => {
      const doc = makeUserDoc({ refreshTokens: ['tok'] });
      usersService.findById.mockResolvedValue(doc);

      const result = await service.logout(doc._id.toString(), {
        refreshToken: 'tok',
        sessionId: 's1',
      });

      expect(result.message).toBe('Logout exitoso');
      expect(doc.refreshTokens).toEqual([]);
      expect(sessionsService.deleteRefreshToken).toHaveBeenCalledWith('tok');
      expect(sessionsService.deleteSession).toHaveBeenCalledWith('s1', doc._id.toString());
      expect(sessionsService.invalidateUserCache).toHaveBeenCalled();
    });
  });
});
