import type { INestApplication, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';

import { APP_CONFIG, ConfigModule, type AppConfig } from '../config/index.js';
import { configureApp } from '../configure-app.js';
import { DatabaseModule } from '../database/database.module.js';
import { PersistenceModule } from '../persistence/index.js';

import { buildTestDatabaseUrl } from './test-database-url.pure.js';

const testConfig: AppConfig = {
  nodeEnv: 'test',
  port: 0,
  databaseUrl: buildTestDatabaseUrl(process.env),
};

// Application complète (même `configureApp` que la production) sur la base `crm_test`, avec les seuls
// modules métier que le test exerce.
export async function startTestApp(
  modules: ReadonlyArray<Type>,
): Promise<{ readonly app: INestApplication; readonly dataSource: DataSource }> {
  const moduleRef = await Test.createTestingModule({
    imports: [ConfigModule, DatabaseModule, PersistenceModule, ...modules],
  })
    .overrideProvider(APP_CONFIG)
    .useValue(testConfig)
    .compile();
  const app = moduleRef.createNestApplication({ logger: false });
  configureApp(app);
  await app.init();
  const dataSource = app.get(DataSource);
  await dataSource.runMigrations();
  return { app, dataSource };
}
