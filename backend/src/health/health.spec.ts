import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { APP_CONFIG, ConfigModule, type AppConfig } from '../config/index.js';
import { configureApp } from '../configure-app.js';
import { DatabaseModule } from '../database/database.module.js';
import { httpServer } from '../testing/http-server.js';
import { bodyOf } from '../testing/response-body.js';
import { buildTestDatabaseUrl } from '../testing/test-database-url.pure.js';

import { HealthModule } from './health.module.js';

const testConfig: AppConfig = {
  nodeEnv: 'test',
  port: 0,
  databaseUrl: buildTestDatabaseUrl(process.env),
};

describe('GET /api/health (PostgreSQL réel)', () => {
  let app: INestApplication;

  beforeEach(async () => {
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

  afterEach(async () => {
    await app.close();
  });

  it('répond 200 quand la base est joignable', async () => {
    await request(httpServer(app)).get('/api/health').expect(200, { status: 'ok', database: 'up' });
  });

  it('répond 503 UNAVAILABLE, sans détail interne, quand la base est coupée', async () => {
    await app.get(DataSource).destroy();

    const response = await request(httpServer(app)).get('/api/health').expect(503);

    expect(bodyOf(response)).toMatchObject({
      error: { code: 'UNAVAILABLE', message: 'Base de données indisponible' },
    });
    expect(JSON.stringify(bodyOf(response))).not.toMatch(/127\.0\.0\.1|crm_test|password/i);
  });
});
