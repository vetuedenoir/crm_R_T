import { Controller, Get, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { configureApp } from './configure-app.js';
import { httpServer } from './testing/http-server.js';

@Controller('ping')
class PingController {
  @Get()
  ping(): { readonly ok: true } {
    return { ok: true };
  }
}

describe('configureApp', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ controllers: [PingController] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('expose les routes sous le préfixe /api', async () => {
    await request(httpServer(app)).get('/api/ping').expect(200, { ok: true });
  });

  it("n'expose pas les routes hors du préfixe /api", async () => {
    await request(httpServer(app)).get('/ping').expect(404);
  });
});
