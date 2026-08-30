import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';

/**
 * E2E de paridad contra infraestructura real (MongoDB + Redis + MinIO).
 * Ejecutar con: E2E=1 pnpm --filter @kornbeat/music-api test:e2e
 */
const hasInfra = process.env.E2E === '1';

describe(`Music API E2E${hasInfra ? '' : ' (omitido, falta infra)'}`, () => {
  let app: INestApplication;

  beforeAll(async () => {
    if (!hasInfra) return;
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  (hasInfra ? describe : describe.skip)('endpoints principales', () => {
    it('GET /health responde OK', async () => {
      const res = await request(app.getHttpServer()).get('/health').expect(200);
      expect(res.body.status).toBe('OK');
      expect(res.body.services).toHaveProperty('mongodb');
      expect(res.body.services).toHaveProperty('redis');
    });

    it('GET /api/music/songs devuelve lista (vacía o con datos)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/music/songs')
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.count).toBe(res.body.data.length);
    });

    it('GET /api/music/songs/:id con ID inválido devuelve 400', async () => {
      await request(app.getHttpServer())
        .get('/api/music/songs/no-son-un-id')
        .expect(400);
    });

    it('GET /api/music/songs/:id con ID inexistente devuelve 404', async () => {
      await request(app.getHttpServer())
        .get('/api/music/songs/64b000000000000000000000')
        .expect(404);
    });

    it('GET /api/music/search/:query responde', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/music/search/rock')
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.searchType).toBe('general');
      expect(res.body.results).toHaveProperty('byTitle');
      expect(res.body.results).toHaveProperty('byArtist');
    });

    it('POST /api/music/user/:userId/playlists crea playlist', async () => {
      const userId = new (await import('mongoose')).Types.ObjectId().toString();
      const res = await request(app.getHttpServer())
        .post(`/api/music/user/${userId}/playlists`)
        .send({ titulo: 'E2E Playlist' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.playlist).toHaveProperty('_id');
      expect(res.body.playlist.titulo).toBe('E2E Playlist');

      // Limpieza
      await request(app.getHttpServer())
        .delete(`/api/music/playlists/${res.body.playlist._id}`)
        .expect(200);
    });

    it('GET /api/music/user/:userId/reel-position sin datos', async () => {
      const userId = new (await import('mongoose')).Types.ObjectId().toString();
      const res = await request(app.getHttpServer())
        .get(`/api/music/user/${userId}/reel-position`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });
  });
});
