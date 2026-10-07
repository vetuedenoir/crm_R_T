import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';

import type { Column, ColumnPosition, ColumnTypeName } from '../../domain/index.js';
import type { ColumnId } from '../../ids.pure.js';
import { ColumnEntity } from '../entities/index.js';
import { toColumn } from '../row-mapping.pure.js';

export interface NewColumn {
  readonly name: string;
  readonly type: ColumnTypeName;
  readonly position: number;
}

// Accès brut : aucune règle métier (unicité du nom, type immuable...) ici, elles vivent dans le service.
// Chaque méthode accepte un `manager` pour participer à une transaction ouverte par le service.
@Injectable()
export class ColumnRepository {
  constructor(private readonly dataSource: DataSource) {}

  private db(manager: EntityManager | undefined): EntityManager {
    return manager ?? this.dataSource.manager;
  }

  // Départage par id : l'ordre reste déterministe même si deux colonnes partagent une position.
  async findAll(manager?: EntityManager): Promise<ReadonlyArray<Column>> {
    const rows = await this.db(manager).find(ColumnEntity, {
      order: { position: 'ASC', id: 'ASC' },
    });
    return rows.map(toColumn);
  }

  async findById(id: ColumnId, manager?: EntityManager): Promise<Column | null> {
    const row = await this.db(manager).findOneBy(ColumnEntity, { id });
    return row === null ? null : toColumn(row);
  }

  async insert(column: NewColumn, manager?: EntityManager): Promise<Column> {
    const result = await this.db(manager).insert(ColumnEntity, column);
    const created = await this.db(manager).findOneByOrFail(ColumnEntity, {
      id: String(result.identifiers[0]?.['id']),
    });
    return toColumn(created);
  }

  async updateName(id: ColumnId, name: string, manager?: EntityManager): Promise<boolean> {
    const result = await this.db(manager).update(ColumnEntity, { id }, { name });
    return (result.affected ?? 0) > 0;
  }

  async updatePositions(
    positions: ReadonlyArray<ColumnPosition>,
    manager?: EntityManager,
  ): Promise<void> {
    for (const { id, position } of positions) {
      await this.db(manager).update(ColumnEntity, { id }, { position });
    }
  }

  // Les cellules de la colonne partent en cascade (clé étrangère `ON DELETE CASCADE`).
  async deleteById(id: ColumnId, manager?: EntityManager): Promise<boolean> {
    const result = await this.db(manager).delete(ColumnEntity, { id });
    return (result.affected ?? 0) > 0;
  }
}
