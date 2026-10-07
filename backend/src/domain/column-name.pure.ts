import type { ColumnId } from '../ids.pure.js';
import { err, ok, type Result } from '../result.js';

import type { ValidationError } from './cell.js';
import type { Column } from './column.js';

export const MAX_COLUMN_NAME_LENGTH = 100;

export function parseColumnName(raw: unknown): Result<string, ValidationError> {
  if (typeof raw !== 'string') {
    return err({ message: 'Le nom doit être une chaîne de caractères' });
  }
  const name = raw.trim();
  if (name === '') {
    return err({ message: 'Le nom ne peut pas être vide' });
  }
  return name.length > MAX_COLUMN_NAME_LENGTH
    ? err({ message: `Le nom ne peut pas dépasser ${String(MAX_COLUMN_NAME_LENGTH)} caractères` })
    : ok(name);
}

// Insensible à la casse, comme l'index unique `lower(name)` qui sert de filet face aux requêtes concurrentes.
// `ignoredId` : renommer une colonne en changeant seulement la casse (« ville » → « Ville ») n'est pas un doublon.
export function findNameConflict(
  name: string,
  columns: ReadonlyArray<Column>,
  ignoredId?: ColumnId,
): Column | undefined {
  const wanted = name.toLowerCase();
  return columns.find((column) => column.id !== ignoredId && column.name.toLowerCase() === wanted);
}
