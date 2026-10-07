import type { DataSource } from 'typeorm';

import { MIGRATIONS } from '../persistence/index.js';
import { createTestDataSource, resetSchema } from '../testing/test-database.js';

import { runMigrateAction } from './migrate-command.js';

describe('runMigrateAction (PostgreSQL réel)', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
  });

  beforeEach(async () => {
    await resetSchema(dataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('applique toutes les migrations sur une base vide, dans l’ordre', async () => {
    const names = await runMigrateAction(dataSource, 'up');

    expect(names).toEqual(MIGRATIONS.map((migration) => migration.name));
  });

  it('ne fait rien quand tout est déjà appliqué (idempotent)', async () => {
    await runMigrateAction(dataSource, 'up');

    expect(await runMigrateAction(dataSource, 'up')).toEqual([]);
  });

  it('défait la dernière migration seulement, puis la rejoue', async () => {
    await runMigrateAction(dataSource, 'up');
    const last = MIGRATIONS.at(-1)?.name;

    expect(await runMigrateAction(dataSource, 'revert')).toEqual([last]);
    expect(await runMigrateAction(dataSource, 'up')).toEqual([last]);
  });

  it('ne défait rien sur une base sans migration appliquée', async () => {
    expect(await runMigrateAction(dataSource, 'revert')).toEqual([]);
  });
});
