import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

const hasInfra = process.env.E2E === '1';

describe(`Reco API E2E${hasInfra ? '' : ' (omitido, falta infra)'}`, () => {
  let app: INestApplication;

  beforeAll(async () => {
    if (!hasInfra) return;
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  (hasInfra ? describe : describe.skip)('endpoints', () => {
    it('GET /health responde', async () => {
      const res = await request(app.getHttpServer()).get('/health');
      expect([200, 503]).toContain(res.status);
    });

    it('GET /api/recommendations/top-global responde', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/recommendations/top-global')
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
