import type { DataSource } from 'typeorm';

import { columnId } from '../../testing/factories.js';
import { clearTables, createTestDataSource } from '../../testing/test-database.js';

import { ColumnRepository } from './column.repository.js';

describe('ColumnRepository (PostgreSQL réel)', () => {
  let dataSource: DataSource;
  let repository: ColumnRepository;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    repository = new ColumnRepository(dataSource);
  });

  beforeEach(async () => {
    await clearTables(dataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('[R14] relit une colonne créée, avec un identifiant nominal', async () => {
    const created = await repository.insert({ name: 'Ville', type: 'text', position: 0 });

    expect(created).toMatchObject({ name: 'Ville', type: 'text', position: 0 });
    expect(await repository.findById(created.id)).toEqual(created);
  });

  it('renvoie null pour une colonne inconnue', async () => {
    expect(await repository.findById(columnId(99))).toBeNull();
  });

  it('[R14] liste les colonnes par position, même insérées dans le désordre', async () => {
    await repository.insert({ name: 'C', type: 'date', position: 2 });
    await repository.insert({ name: 'A', type: 'text', position: 0 });
    await repository.insert({ name: 'B', type: 'number', position: 1 });

    const columns = await repository.findAll();

    expect(columns.map((column) => column.name)).toEqual(['A', 'B', 'C']);
  });

  it('[R10] renomme une colonne et signale une colonne absente', async () => {
    const { id } = await repository.insert({ name: 'Ancien', type: 'text', position: 0 });

    expect(await repository.updateName(id, 'Nouveau')).toBe(true);
    expect((await repository.findById(id))?.name).toBe('Nouveau');
    expect(await repository.updateName(columnId(99), 'X')).toBe(false);
  });

  it('[R12] applique de nouvelles positions', async () => {
    const a = await repository.insert({ name: 'A', type: 'text', position: 0 });
    const b = await repository.insert({ name: 'B', type: 'text', position: 1 });

    await repository.updatePositions([
      { id: a.id, position: 1 },
      { id: b.id, position: 0 },
    ]);

    expect((await repository.findAll()).map((column) => column.name)).toEqual(['B', 'A']);
  });

  it('[R11] supprime une colonne et signale une colonne absente', async () => {
    const { id } = await repository.insert({ name: 'A', type: 'text', position: 0 });

    expect(await repository.deleteById(id)).toBe(true);
    expect(await repository.findById(id)).toBeNull();
    expect(await repository.deleteById(id)).toBe(false);
  });

  it('annule les écritures d’une transaction qui échoue', async () => {
    await expect(
      dataSource.transaction(async (manager) => {
        await repository.insert({ name: 'Fantôme', type: 'text', position: 0 }, manager);
        throw new Error('échec simulé');
      }),
    ).rejects.toThrow('échec simulé');

    expect(await repository.findAll()).toEqual([]);
  });
});
