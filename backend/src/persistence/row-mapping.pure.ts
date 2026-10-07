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

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}

// Résultat brut de `dataSource.query` : `unknown` jusqu'à vérification. Une forme inattendue signale une
// requête ou une base incohérente, donc une exception.
function rowsOf(raw: unknown): ReadonlyArray<Readonly<Record<string, unknown>>> {
  if (!Array.isArray(raw) || !raw.every(isRecord)) {
    throw new Error('Résultat de requête inattendu : une liste de lignes était attendue');
  }
  return raw;
}

// Première requête de la lecture d'une page : `SELECT c.id ...`, dans l'ordre du tri.
export function readContactIds(raw: unknown): ReadonlyArray<ContactId> {
  return rowsOf(raw).map((row) => {
    const id = row['id'];
    if (typeof id !== 'string') {
      throw new Error('Résultat de requête inattendu : la colonne id est absente');
    }
    return contactIdOf(id);
  });
}

// `count(*)` est un `bigint` : le pilote le rend en chaîne.
export function readCount(raw: unknown): number {
  const [row] = rowsOf(raw);
  const total = Number(row?.['total']);
  if (!Number.isSafeInteger(total) || total < 0) {
    throw new Error('Résultat de requête inattendu : le total est absent ou invalide');
  }
  return total;
}
