import type { DataSource } from 'typeorm';

import { createTestDataSource, resetSchema } from '../testing/test-database.js';

import { MIGRATIONS } from './migrations/index.js';

const TABLES = ['cells', 'columns', 'contacts'];

async function existingTables(dataSource: DataSource): Promise<ReadonlyArray<string>> {
  const rows: ReadonlyArray<{ readonly table_name: string }> = await dataSource.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = ANY($1) ORDER BY table_name`,
    [TABLES],
  );
  return rows.map((row) => row.table_name);
}

async function existingIndexes(dataSource: DataSource): Promise<ReadonlyArray<string>> {
  const rows: ReadonlyArray<{ readonly indexname: string }> = await dataSource.query(
    `SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'cells_%_idx'
     ORDER BY indexname`,
  );
  return rows.map((row) => row.indexname);
}

describe('migrations (PostgreSQL réel)', () => {
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

  it('[R14] s’appliquent sur une base vide et créent tables et index', async () => {
    await dataSource.runMigrations();

    expect(await existingTables(dataSource)).toEqual(TABLES);
    expect(await existingIndexes(dataSource)).toEqual([
      'cells_date_idx',
      'cells_number_idx',
      'cells_text_idx',
    ]);
  });

  it('[R14] créent les colonnes par défaut, dans l’ordre et avec leur type', async () => {
    await dataSource.runMigrations();

    const rows: ReadonlyArray<{ readonly name: string; readonly type: string }> =
      await dataSource.query('SELECT name, type FROM columns ORDER BY position');
    expect(rows).toEqual([
      { name: 'Nom', type: 'text' },
      { name: 'Entreprise', type: 'text' },
      { name: 'Téléphone', type: 'phone' },
      { name: 'Date', type: 'date' },
      { name: 'Score', type: 'number' },
    ]);
  });

  it('sont réversibles : tout revenir en arrière ne laisse ni table ni type, puis se rejoue', async () => {
    await dataSource.runMigrations();

    for (let remaining = MIGRATIONS.length; remaining > 0; remaining--) {
      await dataSource.undoLastMigration();
    }
    const types: ReadonlyArray<unknown> = await dataSource.query(
      `SELECT 1 FROM pg_type WHERE typname = 'column_type'`,
    );
    expect(await existingTables(dataSource)).toEqual([]);
    expect(await existingIndexes(dataSource)).toEqual([]);
    expect(types).toHaveLength(0);

    await dataSource.runMigrations();
    expect(await existingTables(dataSource)).toEqual(TABLES);
  });

  it('[R14] la base refuse une cellule portant deux valeurs', async () => {
    await dataSource.runMigrations();
    const [contact]: ReadonlyArray<{ readonly id: string }> = await dataSource.query(
      'INSERT INTO contacts DEFAULT VALUES RETURNING id',
    );
    const [column]: ReadonlyArray<{ readonly id: string }> = await dataSource.query(
      'SELECT id FROM columns LIMIT 1',
    );

    await expect(
      dataSource.query(
        `INSERT INTO cells (contact_id, column_id, value_text, value_number) VALUES ($1, $2, 'a', 1)`,
        [contact?.id, column?.id],
      ),
    ).rejects.toThrow(/cells_single_value/);
  });
});
