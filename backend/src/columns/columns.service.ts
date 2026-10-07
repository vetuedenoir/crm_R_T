import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';

import {
  computeColumnOrder,
  findNameConflict,
  nextColumnPosition,
  parseColumnName,
  type Column,
  type ColumnTypeName,
} from '../domain/index.js';
import { parseColumnId, type ColumnId } from '../ids.pure.js';
import { ColumnRepository } from '../persistence/index.js';

import { columnNotFound, duplicateName, invalidField, orderError } from './column-errors.pure.js';

// Toute écriture lit les colonnes et écrit dans la même transaction : la règle (nom libre, ordre complet)
// est vérifiée sur l'état qui sera modifié.
@Injectable()
export class ColumnsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly columns: ColumnRepository,
  ) {}

  list(): Promise<ReadonlyArray<Column>> {
    return this.columns.findAll();
  }

  create(rawName: unknown, type: ColumnTypeName): Promise<Column> {
    return this.dataSource.transaction(async (manager) => {
      const existing = await this.columns.findAll(manager);
      const name = this.validName(rawName, existing);
      return this.columns.insert({ name, type, position: nextColumnPosition(existing) }, manager);
    });
  }

  // Le type est immuable : le changer imposerait de convertir toutes les valeurs (PLAN §10).
  rename(id: ColumnId, rawName: unknown, requestedType: unknown): Promise<Column> {
    if (requestedType !== undefined) {
      throw invalidField('type', "Le type d'une colonne ne peut pas être modifié");
    }
    return this.dataSource.transaction(async (manager) => {
      const existing = await this.columns.findAll(manager);
      const column = existing.find((candidate) => candidate.id === id);
      if (column === undefined) {
        throw columnNotFound(id);
      }
      const name = this.validName(rawName, existing, id);
      await this.columns.updateName(id, name, manager);
      return { ...column, name };
    });
  }

  // Les cellules partent en cascade. Les positions restantes sont recompactées (0 à N-1, sans trou).
  remove(id: ColumnId): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      const existing = await this.columns.findAll(manager);
      if (!existing.some((column) => column.id === id)) {
        throw columnNotFound(id);
      }
      await this.columns.deleteById(id, manager);
      const remaining = existing.filter((column) => column.id !== id).map((column) => column.id);
      await this.applyOrder(remaining, remaining, manager);
    });
  }

  reorder(rawIds: ReadonlyArray<string>): Promise<ReadonlyArray<Column>> {
    const orderedIds = this.parseIds(rawIds);
    return this.dataSource.transaction(async (manager) => {
      const existing = await this.columns.findAll(manager);
      await this.applyOrder(
        orderedIds,
        existing.map((column) => column.id),
        manager,
      );
      return this.columns.findAll(manager);
    });
  }

  private validName(
    rawName: unknown,
    existing: ReadonlyArray<Column>,
    ignoredId?: ColumnId,
  ): string {
    const parsed = parseColumnName(rawName);
    if (!parsed.ok) {
      throw invalidField('name', parsed.error.message);
    }
    if (findNameConflict(parsed.value, existing, ignoredId) !== undefined) {
      throw duplicateName(parsed.value);
    }
    return parsed.value;
  }

  private parseIds(rawIds: ReadonlyArray<string>): ReadonlyArray<ColumnId> {
    return rawIds.map((raw) => {
      const parsed = parseColumnId(raw);
      if (!parsed.ok) {
        throw invalidField('ids', `${parsed.error} : ${raw}`);
      }
      return parsed.value;
    });
  }

  private async applyOrder(
    orderedIds: ReadonlyArray<ColumnId>,
    existingIds: ReadonlyArray<ColumnId>,
    manager: EntityManager,
  ): Promise<void> {
    const order = computeColumnOrder(orderedIds, existingIds);
    if (!order.ok) {
      throw orderError(order.error);
    }
    await this.columns.updatePositions(order.value, manager);
  }
}
