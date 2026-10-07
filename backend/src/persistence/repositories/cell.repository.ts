import { Injectable } from '@nestjs/common';
import { DataSource, In, type EntityManager } from 'typeorm';

import type { CellRow } from '../../domain/index.js';
import type { ColumnId, ContactId } from '../../ids.pure.js';
import { buildCellsUpsert, type NewCell } from '../cells-upsert.pure.js';
import { CellEntity } from '../entities/index.js';
import { toCellRow } from '../row-mapping.pure.js';

// Accès brut, sans règle métier : la validité des valeurs est garantie par le registre de types, en amont.
@Injectable()
export class CellRepository {
  constructor(private readonly dataSource: DataSource) {}

  private db(manager: EntityManager | undefined): EntityManager {
    return manager ?? this.dataSource.manager;
  }

  // Deuxième requête de la lecture d'une page (§4.3) : toutes les cellules des contacts déjà choisis.
  async findByContactIds(
    contactIds: ReadonlyArray<ContactId>,
    manager?: EntityManager,
  ): Promise<ReadonlyArray<CellRow>> {
    if (contactIds.length === 0) {
      return [];
    }
    const rows = await this.db(manager).find(CellEntity, {
      where: { contactId: In([...contactIds]) },
    });
    return rows.map(toCellRow);
  }

  // Insère ou remplace : une cellule renseignée existe, qu'elle soit nouvelle ou modifiée.
  async upsertMany(cells: ReadonlyArray<NewCell>, manager?: EntityManager): Promise<void> {
    const statement = buildCellsUpsert(cells);
    if (statement !== null) {
      await this.db(manager).query(statement.sql, [...statement.params]);
    }
  }

  // Cellule vide = pas de ligne : vider une cellule la supprime.
  async deleteMany(
    contactId: ContactId,
    columnIds: ReadonlyArray<ColumnId>,
    manager?: EntityManager,
  ): Promise<void> {
    if (columnIds.length === 0) {
      return;
    }
    await this.db(manager).delete(CellEntity, { contactId, columnId: In([...columnIds]) });
  }
}
