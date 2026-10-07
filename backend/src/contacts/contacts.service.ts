import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';

import {
  assembleContacts,
  buildContactsQuery,
  planCellWrites,
  type Column,
  type Contact,
} from '../domain/index.js';
import type { ContactId } from '../ids.pure.js';
import {
  CellRepository,
  ColumnRepository,
  ContactRepository,
  type NewCell,
} from '../persistence/index.js';

import { toContactBody, type ContactBody } from './contact-body.pure.js';
import { cellWriteError, contactNotFound, queryError } from './contact-errors.pure.js';
import { parseContactsParams, type ContactsParams } from './contacts-params.pure.js';

export interface ContactsPage {
  readonly items: ReadonlyArray<ContactBody>;
  readonly total: number;
  readonly offset: number;
  readonly limit: number;
}

// Le service orchestre : les règles (tri, filtres, validation des valeurs) sont dans le domaine pur.
@Injectable()
export class ContactsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly columns: ColumnRepository,
    private readonly contacts: ContactRepository,
    private readonly cells: CellRepository,
  ) {}

  // Lecture en trois requêtes (PLAN §4.3) : ids de la page triée et filtrée, total, puis cellules.
  async list(params: ContactsParams): Promise<ContactsPage> {
    const parsed = parseContactsParams(params);
    if (!parsed.ok) {
      throw queryError(parsed.error);
    }
    const columns = await this.columns.findAll();
    const sql = buildContactsQuery(parsed.value, columns);
    if (!sql.ok) {
      throw queryError(sql.error);
    }
    const [ids, total] = await Promise.all([
      this.contacts.findIds(sql.value.ids),
      this.contacts.count(sql.value.count),
    ]);
    const items = await this.load(ids, columns);
    return {
      items: items.map(toContactBody),
      total,
      offset: parsed.value.offset,
      limit: parsed.value.limit,
    };
  }

  // Le contact et toutes ses cellules sont écrits dans une transaction : tout réussit ou rien.
  create(values: Readonly<Record<string, unknown>>): Promise<ContactBody> {
    return this.dataSource.transaction(async (manager) => {
      const columns = await this.columns.findAll(manager);
      const plan = planCellWrites(values, columns);
      if (!plan.ok) {
        throw cellWriteError(plan.error);
      }
      const id = await this.contacts.insert(manager);
      await this.cells.upsertMany(toNewCells(id, plan.value.upserts), manager);
      return toContactBody(await this.loadOne(id, columns, manager));
    });
  }

  // Fusion partielle : seules les colonnes présentes sont touchées ; `null` vide la cellule.
  update(id: ContactId, values: Readonly<Record<string, unknown>>): Promise<ContactBody> {
    return this.dataSource.transaction(async (manager) => {
      if (!(await this.contacts.touch(id, new Date(), manager))) {
        throw contactNotFound(id);
      }
      const columns = await this.columns.findAll(manager);
      const plan = planCellWrites(values, columns);
      if (!plan.ok) {
        throw cellWriteError(plan.error);
      }
      await this.cells.upsertMany(toNewCells(id, plan.value.upserts), manager);
      await this.cells.deleteMany(id, plan.value.clears, manager);
      return toContactBody(await this.loadOne(id, columns, manager));
    });
  }

  async remove(id: ContactId): Promise<void> {
    if (!(await this.contacts.deleteById(id))) {
      throw contactNotFound(id);
    }
  }

  private async load(
    ids: ReadonlyArray<ContactId>,
    columns: ReadonlyArray<Column>,
    manager?: EntityManager,
  ): Promise<ReadonlyArray<Contact>> {
    const rows = await this.cells.findByContactIds(ids, manager);
    const assembled = assembleContacts(ids, rows, columns);
    if (!assembled.ok) {
      // Une valeur illisible en base est une anomalie d'intégrité, pas une erreur du client.
      throw new Error(
        `Cellule illisible (contact ${assembled.error.contactId}, colonne ${assembled.error.columnId}) : ${assembled.error.message}`,
      );
    }
    return assembled.value;
  }

  private async loadOne(
    id: ContactId,
    columns: ReadonlyArray<Column>,
    manager: EntityManager,
  ): Promise<Contact> {
    const [contact] = await this.load([id], columns, manager);
    if (contact === undefined) {
      throw new Error(`Contact ${id} introuvable juste après son écriture`);
    }
    return contact;
  }
}

function toNewCells(
  contactId: ContactId,
  upserts: ReadonlyArray<Pick<NewCell, 'columnId' | 'stored'>>,
): ReadonlyArray<NewCell> {
  return upserts.map((upsert) => ({ contactId, ...upsert }));
}
