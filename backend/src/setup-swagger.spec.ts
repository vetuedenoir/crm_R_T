import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { APP_CONFIG, ConfigModule, type AppConfig } from './config/index.js';
import { configureApp } from './configure-app.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/index.js';
import { httpServer } from './testing/http-server.js';
import { bodyOf } from './testing/response-body.js';
import { buildTestDatabaseUrl } from './testing/test-database-url.pure.js';

const testConfig: AppConfig = {
  nodeEnv: 'test',
  port: 0,
  databaseUrl: buildTestDatabaseUrl(process.env),
};

describe('Swagger', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule, DatabaseModule, HealthModule],
    })
      .overrideProvider(APP_CONFIG)
      .useValue(testConfig)
      .compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('sert la page de documentation sur /api/docs', async () => {
    const response = await request(httpServer(app)).get('/api/docs').expect(200);

    expect(response.headers['content-type']).toContain('text/html');
  });

  it("décrit les routes réelles sous le préfixe /api, avec l'enveloppe d'erreur", async () => {
    const response = await request(httpServer(app)).get('/api/docs-json').expect(200);

    expect(bodyOf(response)).toMatchObject({
      info: { title: 'CRM en grille' },
      paths: {
        '/api/health': {
          get: { responses: { '200': {}, '503': {} } },
        },
      },
      components: { schemas: { ErrorResponseDto: {}, HealthReport: {} } },
    });
  });
});
