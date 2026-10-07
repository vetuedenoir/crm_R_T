import type { DataSource } from 'typeorm';

import { contactId } from '../../testing/factories.js';
import { clearTables, createTestDataSource } from '../../testing/test-database.js';

import { ContactRepository } from './contact.repository.js';

interface TimestampRow {
  readonly created_at: Date;
  readonly updated_at: Date;
}

describe('ContactRepository (PostgreSQL réel)', () => {
  let dataSource: DataSource;
  let repository: ContactRepository;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    repository = new ContactRepository(dataSource);
  });

  beforeEach(async () => {
    await clearTables(dataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('[R3] crée des contacts avec des identifiants distincts', async () => {
    const first = await repository.insert();
    const second = await repository.insert();

    expect(first).not.toBe(second);
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('[R4] met à jour `updated_at` avec l’horloge reçue en paramètre', async () => {
    const id = await repository.insert();
    const now = new Date('2030-01-02T03:04:05.000Z');

    expect(await repository.touch(id, now)).toBe(true);

    const [row]: ReadonlyArray<TimestampRow> = await dataSource.query(
      'SELECT created_at, updated_at FROM contacts WHERE id = $1',
      [id],
    );
    expect(row?.updated_at).toEqual(now);
    expect(row?.created_at).not.toEqual(now);
  });

  it('signale un contact absent', async () => {
    expect(await repository.touch(contactId(99), new Date())).toBe(false);
    expect(await repository.deleteById(contactId(99))).toBe(false);
  });

  it('[R5] supprime un contact', async () => {
    const id = await repository.insert();

    expect(await repository.deleteById(id)).toBe(true);
    expect(await dataSource.query('SELECT 1 FROM contacts WHERE id = $1', [id])).toHaveLength(0);
  });
});
