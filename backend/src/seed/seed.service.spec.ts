import type { INestApplication } from '@nestjs/common';
import type { DataSource } from 'typeorm';

import { startTestApp } from '../testing/test-app.js';
import { clearTables } from '../testing/test-database.js';

import { SEED_COUNT } from './seed-plan.pure.js';
import { SeedModule } from './seed.module.js';
import { SeedService } from './seed.service.js';

interface NameRow {
  readonly value_text: string;
}

describe('SeedService (PostgreSQL réel)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let service: SeedService;
  const now = new Date('2030-01-01T00:00:00.000Z');

  beforeAll(async () => {
    ({ app, dataSource } = await startTestApp([SeedModule]));
    service = app.get(SeedService);
  });

  beforeEach(async () => {
    await clearTables(dataSource);
    // `clearTables` supprime aussi les colonnes par défaut : on les recrée comme la migration.
    await dataSource.query(`
      INSERT INTO columns (name, type, position) VALUES
        ('Nom', 'text', 0), ('Entreprise', 'text', 1), ('Téléphone', 'phone', 2),
        ('Date', 'date', 3), ('Score', 'number', 4)`);
  });

  afterAll(async () => {
    await clearTables(dataSource);
    await app.close();
  });

  async function countContacts(): Promise<number> {
    const rows: ReadonlyArray<{ readonly total: string }> = await dataSource.query(
      'SELECT count(*) AS total FROM contacts',
    );
    return Number(rows[0]?.total);
  }

  it('[R17] insère 1000 contacts sur une base neuve', async () => {
    const report = await service.run({ reset: false }, now);

    expect(report).toEqual({ inserted: SEED_COUNT, total: SEED_COUNT });
    expect(await countContacts()).toBe(SEED_COUNT);
  });

  it('[R17] est idempotent : relancer le seed n’ajoute rien', async () => {
    await service.run({ reset: false }, now);

    const report = await service.run({ reset: false }, now);

    expect(report).toEqual({ inserted: 0, total: SEED_COUNT });
    expect(await countContacts()).toBe(SEED_COUNT);
  });

  it('[R17] complète une base partielle sans doublon', async () => {
    await dataSource.query(
      'INSERT INTO contacts (id) SELECT gen_random_uuid() FROM generate_series(1, 10)',
    );

    const report = await service.run({ reset: false }, now);

    expect(report).toEqual({ inserted: SEED_COUNT - 10, total: SEED_COUNT });
  });

  it('[R17] --reset vide les contacts avant de réinsérer le jeu', async () => {
    await service.run({ reset: false }, now);
    await dataSource.query('INSERT INTO contacts (id) VALUES (gen_random_uuid())');

    const report = await service.run({ reset: true }, now);

    expect(report).toEqual({ inserted: SEED_COUNT, total: SEED_COUNT });
    expect(await countContacts()).toBe(SEED_COUNT);
  });

  it('[R17] est reproductible : deux seeds donnent les mêmes noms', async () => {
    const names = async (): Promise<ReadonlyArray<string>> => {
      const rows: ReadonlyArray<NameRow> = await dataSource.query(
        `SELECT c.created_at, s.value_text FROM contacts c
         JOIN cells s ON s.contact_id = c.id
         JOIN columns k ON k.id = s.column_id AND k.name = 'Nom'
         ORDER BY c.created_at, c.id`,
      );
      return rows.map((row) => row.value_text);
    };
    await service.run({ reset: false }, now);
    const first = await names();

    await service.run({ reset: true }, now);

    expect(await names()).toEqual(first);
  });

  it('[R17] écrit les cellules par type : valeurs vides sans ligne, une seule valeur par cellule', async () => {
    await service.run({ reset: false }, now);

    const rows: ReadonlyArray<{ readonly name: string; readonly total: string }> =
      await dataSource.query(
        `SELECT k.name, count(*) AS total FROM cells s
         JOIN columns k ON k.id = s.column_id GROUP BY k.name`,
      );
    const totals = Object.fromEntries(rows.map((row) => [row.name, Number(row.total)]));

    expect(totals['Nom']).toBe(SEED_COUNT);
    expect(totals['Date']).toBe(SEED_COUNT);
    expect(totals['Score']).toBe(SEED_COUNT);
    expect(totals['Téléphone']).toBeLessThan(SEED_COUNT);
    expect(totals['Entreprise']).toBeLessThan(SEED_COUNT);
  });

  it('[R17] échoue sans rien écrire quand une colonne par défaut manque', async () => {
    await dataSource.query(`DELETE FROM columns WHERE name = 'Score'`);

    await expect(service.run({ reset: false }, now)).rejects.toThrow('« Score » (number)');

    expect(await countContacts()).toBe(0);
  });
});
