import { parseColumnId, type ColumnId } from '../ids.pure.js';
import { err, ok, type Result } from '../result.js';

import type { QueryColumn } from './build-contacts-query.pure.js';
import type { StoredCell } from './cell.js';
import { parseCellValue, serializeCellValue } from './column-types/registry.pure.js';

export interface CellUpsert {
  readonly columnId: ColumnId;
  readonly stored: StoredCell;
}

// Ce qu'une écriture doit faire en base : renseigner des cellules, en vider d'autres (RULES §6 :
// cellule vide = pas de ligne).
export interface CellWritePlan {
  readonly upserts: ReadonlyArray<CellUpsert>;
  readonly clears: ReadonlyArray<ColumnId>;
}

// `field` est la clé telle que le client l'a envoyée : il rattache le message à la bonne cellule.
export interface CellWriteError {
  readonly kind: 'UNKNOWN_COLUMN' | 'INVALID_VALUE';
  readonly field: string;
  readonly message: string;
}

type EntryPlan =
  | { readonly kind: 'upsert'; readonly upsert: CellUpsert }
  | { readonly kind: 'clear'; readonly columnId: ColumnId };

function planEntry(
  key: string,
  raw: unknown,
  types: ReadonlyMap<ColumnId, QueryColumn['type']>,
): Result<EntryPlan, CellWriteError> {
  const columnId = parseColumnId(key);
  if (!columnId.ok) {
    return err({ kind: 'INVALID_VALUE', field: key, message: columnId.error });
  }
  const type = types.get(columnId.value);
  if (type === undefined) {
    return err({ kind: 'UNKNOWN_COLUMN', field: key, message: `Aucune colonne ${key}` });
  }
  // `null` est la seule façon de vider une cellule : une chaîne vide reste une valeur invalide.
  if (raw === null) {
    return ok({ kind: 'clear', columnId: columnId.value });
  }
  const cell = parseCellValue(type, raw);
  return cell.ok
    ? ok({
        kind: 'upsert',
        upsert: { columnId: columnId.value, stored: serializeCellValue(cell.value) },
      })
    : err({ kind: 'INVALID_VALUE', field: key, message: cell.error.message });
}

// Valide toutes les valeurs et rapporte toutes les erreurs d'un coup (une par cellule), pour que le
// client puisse surligner chaque cellule fautive sans multiplier les requêtes.
export function planCellWrites(
  values: Readonly<Record<string, unknown>>,
  columns: ReadonlyArray<QueryColumn>,
): Result<CellWritePlan, ReadonlyArray<CellWriteError>> {
  const types = new Map(columns.map((column) => [column.id, column.type] as const));
  const upserts: CellUpsert[] = [];
  const clears: ColumnId[] = [];
  const errors: CellWriteError[] = [];
  const seen = new Set<ColumnId>();
  for (const [key, raw] of Object.entries(values)) {
    const entry = planEntry(key, raw, types);
    if (!entry.ok) {
      errors.push(entry.error);
      continue;
    }
    const columnId =
      entry.value.kind === 'upsert' ? entry.value.upsert.columnId : entry.value.columnId;
    // Deux clés qui désignent la même colonne (casse de l'UUID) ne peuvent pas être écrites ensemble.
    if (seen.has(columnId)) {
      errors.push({ kind: 'INVALID_VALUE', field: key, message: 'Colonne en double' });
      continue;
    }
    seen.add(columnId);
    if (entry.value.kind === 'upsert') {
      upserts.push(entry.value.upsert);
    } else {
      clears.push(columnId);
    }
  }
  return errors.length === 0 ? ok({ upserts, clears }) : err(errors);
}
