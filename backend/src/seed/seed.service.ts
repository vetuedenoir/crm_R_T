import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';

import type { Column } from '../domain/index.js';
import { CellRepository, ColumnRepository, ContactRepository } from '../persistence/index.js';

import type { SeedContact } from './generate-contacts.pure.js';
import type { SeedOptions } from './seed-args.pure.js';
import { pendingSeedContacts, SEED_COUNT, SEED_RANDOM_SEED } from './seed-plan.pure.js';
import { toSeedCellWrites } from './seed-writes.pure.js';

// 250 contacts x 5 cellules x 5 paramètres = 6 250, loin de la limite de 65 535 de PostgreSQL.
export const SEED_BATCH_SIZE = 250;

export interface SeedReport {
  readonly inserted: number;
  readonly total: number;
}

function chunk<T>(items: ReadonlyArray<T>, size: number): ReadonlyArray<ReadonlyArray<T>> {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  );
}

// Le service orchestre : le contenu des contacts, l'idempotence et la validation des valeurs sont dans du
// code pur. Tout se passe dans une transaction : le seed réussit entièrement ou ne laisse rien.
@Injectable()
export class SeedService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly columns: ColumnRepository,
    private readonly contacts: ContactRepository,
    private readonly cells: CellRepository,
  ) {}

  run(options: SeedOptions, now: Date): Promise<SeedReport> {
    return this.dataSource.transaction(async (manager) => {
      const columns = await this.columns.findAll(manager);
      if (options.reset) {
        await this.contacts.deleteAll(manager);
      }
      const existing = await this.contacts.countAll(manager);
      const pending = pendingSeedContacts(SEED_COUNT, existing, SEED_RANDOM_SEED);
      // Les lots se suivent dans le temps : l'ordre de création reste celui du jeu de données.
      for (const [index, batch] of chunk(pending, SEED_BATCH_SIZE).entries()) {
        const startAt = new Date(now.getTime() + index * SEED_BATCH_SIZE);
        await this.insertBatch(batch, columns, startAt, manager);
      }
      return { inserted: pending.length, total: existing + pending.length };
    });
  }

  private async insertBatch(
    batch: ReadonlyArray<SeedContact>,
    columns: ReadonlyArray<Column>,
    startAt: Date,
    manager: EntityManager,
  ): Promise<void> {
    const ids = await this.contacts.insertMany(batch.length, startAt, manager);
    const newCells = batch.flatMap((contact, index) => {
      const contactId = ids[index];
      const writes = toSeedCellWrites(contact, columns);
      if (contactId === undefined || !writes.ok) {
        throw new Error(writes.ok ? 'Identifiant de contact manquant' : writes.error);
      }
      return writes.value.map((write) => ({ contactId, ...write }));
    });
    await this.cells.upsertMany(newCells, manager);
  }
}
