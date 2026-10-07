import {
  COLUMN_TYPE_NAMES,
  type CellRow,
  type Column,
  type ColumnTypeName,
} from '../domain/index.js';
import { parseColumnId, parseContactId, type ColumnId, type ContactId } from '../ids.pure.js';

// Formes brutes lues en base (pas d'import d'entité : ce fichier reste pur).
export interface RawColumnRow {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly position: number;
}

export interface RawCellRow {
  readonly contactId: string;
  readonly columnId: string;
  readonly valueText: string | null;
  readonly valueNumber: string | null;
  readonly valueDate: string | null;
}

function isColumnTypeName(raw: string): raw is ColumnTypeName {
  return COLUMN_TYPE_NAMES.some((name) => name === raw);
}

// Ces conversions ne valident rien de métier : PostgreSQL garantit déjà UUID et enum. Un échec ici
// signale une base incohérente, donc une exception (erreur inattendue) et non un `Result`.
export function columnIdOf(raw: string): ColumnId {
  const parsed = parseColumnId(raw);
  if (!parsed.ok) {
    throw new Error(`Identifiant de colonne invalide en base: ${raw}`);
  }
  return parsed.value;
}

export function contactIdOf(raw: string): ContactId {
  const parsed = parseContactId(raw);
  if (!parsed.ok) {
    throw new Error(`Identifiant de contact invalide en base: ${raw}`);
  }
  return parsed.value;
}

export function toColumn(row: RawColumnRow): Column {
  if (!isColumnTypeName(row.type)) {
    throw new Error(`Type de colonne inconnu en base: ${row.type}`);
  }
  return { id: columnIdOf(row.id), name: row.name, type: row.type, position: row.position };
}

export function toCellRow(row: RawCellRow): CellRow {
  return {
    contactId: contactIdOf(row.contactId),
    columnId: columnIdOf(row.columnId),
    valueText: row.valueText,
    valueNumber: row.valueNumber,
    valueDate: row.valueDate,
  };
}
