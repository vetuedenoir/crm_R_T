import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';

import type { SqlStatement } from '../../domain/index.js';
import type { ContactId } from '../../ids.pure.js';
import { ContactEntity } from '../entities/index.js';
import { contactIdOf, readContactIds, readCount } from '../row-mapping.pure.js';

// Accès brut, sans règle métier. L'horloge est passée en paramètre (`now`), jamais lue ici.
@Injectable()
export class ContactRepository {
  constructor(private readonly dataSource: DataSource) {}

  private db(manager: EntityManager | undefined): EntityManager {
    return manager ?? this.dataSource.manager;
  }

  // L'identifiant est généré par la base (`gen_random_uuid()`).
  async insert(manager?: EntityManager): Promise<ContactId> {
    const result = await this.db(manager).insert(ContactEntity, {});
    return contactIdOf(String(result.identifiers[0]?.['id']));
  }

  // Les deux requêtes de liste viennent de `buildContactsQuery` : le SQL n'est jamais écrit ici.
  async findIds(
    statement: SqlStatement,
    manager?: EntityManager,
  ): Promise<ReadonlyArray<ContactId>> {
    return readContactIds(await this.db(manager).query(statement.sql, [...statement.params]));
  }

  async count(statement: SqlStatement, manager?: EntityManager): Promise<number> {
    return readCount(await this.db(manager).query(statement.sql, [...statement.params]));
  }

  async touch(id: ContactId, now: Date, manager?: EntityManager): Promise<boolean> {
    const result = await this.db(manager).update(ContactEntity, { id }, { updatedAt: now });
    return (result.affected ?? 0) > 0;
  }

  // Les cellules du contact partent en cascade.
  async deleteById(id: ContactId, manager?: EntityManager): Promise<boolean> {
    const result = await this.db(manager).delete(ContactEntity, { id });
    return (result.affected ?? 0) > 0;
  }
}
