import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';

/**
 * E2E de paridad contra la infraestructura real (MongoDB + Redis).
 * Se ejecuta con: E2E=1 pnpm --filter @kornbeat/auth-api test:e2e
 * Si no hay infraestructura levantada, se omite.
 */
const hasInfra = process.env.E2E === '1';

describe(`Auth API E2E${hasInfra ? '' : ' (omitido, falta infra)'}`, () => {
  let app: INestApplication;
  const email = `e2e_${Date.now()}@kornbeat.com`;

  beforeAll(async () => {
    if (!hasInfra) return;
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  (hasInfra ? describe : describe.skip)('flujo completo', () => {
    let accessToken: string;
    let refreshToken: string;
    let sessionId: string;

    it('GET /health responde OK', async () => {
      const res = await request(app.getHttpServer()).get('/health').expect(200);
      expect(res.body.status).toBe('OK');
    });

    it('POST /auth/register crea usuario y devuelve tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email,
          password: 'secret123',
          name: 'E2E User',
          country: 'ES',
        })
        .expect(201);

      expect(res.body.message).toBe('Usuario registrado exitosamente');
      expect(res.body.user).toHaveProperty('_id');
      expect(res.body.user).toHaveProperty('username');
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body).toHaveProperty('sessionId');

      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
      sessionId = res.body.sessionId;
    });

    it('POST /auth/register con email duplicado falla 400', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email,
          password: 'secret123',
          name: 'E2E User',
          country: 'ES',
        })
        .expect(400);
    });

    it('POST /auth/login con credenciales válidas', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'secret123' })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body).toHaveProperty('sessionId');
      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
      sessionId = res.body.sessionId;
    });

    it('POST /auth/login con contraseña incorrecta devuelve 401', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'incorrecta' })
        .expect(401);
    });

    it('GET /auth/me con token válido', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.user.email).toBe(email);
      expect(res.body.user.password).toBeUndefined();
    });

    it('GET /auth/me sin token devuelve 401', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('GET /auth/session/:sessionId devuelve la sesión', async () => {
      const res = await request(app.getHttpServer())
        .get(`/auth/session/${sessionId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.session).toHaveProperty('user_id');
      expect(res.body.session).toHaveProperty('email');
    });

    it('POST /auth/refresh rota tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.refreshToken).not.toBe(refreshToken);
      refreshToken = res.body.refreshToken;
      accessToken = res.body.accessToken;
    });

    it('POST /auth/logout cierra sesión', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken, sessionId })
        .expect(200);

      expect(res.body.message).toBe('Logout exitoso');
    });
  });
});
