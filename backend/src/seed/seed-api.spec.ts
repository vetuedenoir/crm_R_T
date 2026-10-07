import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { DataSource } from 'typeorm';

import { ColumnsModule } from '../columns/index.js';
import { ContactsModule } from '../contacts/index.js';
import { pageOf } from '../testing/contacts-api.js';
import { httpServer } from '../testing/http-server.js';
import { startTestApp } from '../testing/test-app.js';
import { clearTables } from '../testing/test-database.js';

import { SEED_COUNT } from './seed-plan.pure.js';
import { SeedModule } from './seed.module.js';
import { SeedService } from './seed.service.js';

const PAGE_SIZE = 50;

describe('Données du seed lues par l’API (PostgreSQL réel)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let scoreColumn: string;

  beforeAll(async () => {
    ({ app, dataSource } = await startTestApp([ColumnsModule, ContactsModule, SeedModule]));
    await clearTables(dataSource);
    await dataSource.query(`
      INSERT INTO columns (name, type, position) VALUES
        ('Nom', 'text', 0), ('Entreprise', 'text', 1), ('Téléphone', 'phone', 2),
        ('Date', 'date', 3), ('Score', 'number', 4)`);
    await app.get(SeedService).run({ reset: false }, new Date());
    const rows: ReadonlyArray<{ readonly id: string }> = await dataSource.query(
      `SELECT id FROM columns WHERE name = 'Score'`,
    );
    scoreColumn = rows[0]?.id ?? '';
  });

  afterAll(async () => {
    await clearTables(dataSource);
    await app.close();
  });

  it('[R17][R2] les 1000 contacts sont consultables page par page', async () => {
    const page = pageOf(
      await request(httpServer(app)).get('/api/contacts').query({ limit: PAGE_SIZE }).expect(200),
    );

    expect(page.total).toBe(SEED_COUNT);
    expect(page.items).toHaveLength(PAGE_SIZE);
  });

  it('[R15][R17] trier par score décroissant donne le maximum global dès la première page', async () => {
    const page = pageOf(
      await request(httpServer(app))
        .get('/api/contacts')
        .query({ limit: PAGE_SIZE, sort: `${scoreColumn}:desc` })
        .expect(200),
    );
    const max: ReadonlyArray<{ readonly max: string }> = await dataSource.query(
      'SELECT max(value_number) AS max FROM cells WHERE column_id = $1',
      [scoreColumn],
    );

    expect(page.items[0]?.cells[scoreColumn]).toBe(Number(max[0]?.max));
  });
});
