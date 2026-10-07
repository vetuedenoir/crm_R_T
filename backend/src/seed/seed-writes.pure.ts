import {
  planCellWrites,
  type CellUpsert,
  type Column,
  type ColumnTypeName,
} from '../domain/index.js';
import { err, ok, type Result } from '../result.js';

import type { SeedContact } from './generate-contacts.pure.js';

interface SeedField {
  readonly key: keyof SeedContact;
  readonly columnName: string;
  readonly columnType: ColumnTypeName;
}

// Les colonnes par défaut sont retrouvées par nom et type : ce sont de vraies lignes de `columns`.
const SEED_FIELDS: ReadonlyArray<SeedField> = [
  { key: 'name', columnName: 'Nom', columnType: 'text' },
  { key: 'company', columnName: 'Entreprise', columnType: 'text' },
  { key: 'phone', columnName: 'Téléphone', columnType: 'phone' },
  { key: 'date', columnName: 'Date', columnType: 'date' },
  { key: 'score', columnName: 'Score', columnType: 'number' },
];

// Traduit un contact fictif en cellules à écrire. Les valeurs passent par le même registre de types que
// l'API (`planCellWrites`) : le seed ne peut pas écrire une valeur que l'API refuserait.
export function toSeedCellWrites(
  contact: SeedContact,
  columns: ReadonlyArray<Column>,
): Result<ReadonlyArray<CellUpsert>, string> {
  const values: Record<string, unknown> = {};
  const missing: string[] = [];
  for (const field of SEED_FIELDS) {
    const column = columns.find(
      (candidate) => candidate.name === field.columnName && candidate.type === field.columnType,
    );
    if (column === undefined) {
      missing.push(`« ${field.columnName} » (${field.columnType})`);
    } else {
      values[column.id] = contact[field.key];
    }
  }
  if (missing.length > 0) {
    return err(`Colonnes par défaut introuvables : ${missing.join(', ')}`);
  }
  const plan = planCellWrites(values, columns);
  return plan.ok
    ? ok(plan.value.upserts)
    : err(plan.error.map((issue) => `${issue.field} : ${issue.message}`).join(' ; '));
}
