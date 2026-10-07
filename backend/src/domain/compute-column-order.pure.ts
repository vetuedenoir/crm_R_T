import type { ColumnId } from '../ids.pure.js';
import { err, ok, type Result } from '../result.js';

export interface ColumnPosition {
  readonly id: ColumnId;
  readonly position: number;
}

export interface ColumnOrderError {
  readonly kind: 'UNKNOWN_COLUMN' | 'DUPLICATE_COLUMN' | 'MISSING_COLUMN';
  readonly columnId: ColumnId;
  readonly message: string;
}

function orderError(
  kind: ColumnOrderError['kind'],
  columnId: ColumnId,
  message: string,
): ColumnOrderError {
  return { kind, columnId, message };
}

function findInvalidId(
  orderedIds: ReadonlyArray<ColumnId>,
  existingIds: ReadonlySet<ColumnId>,
): ColumnOrderError | undefined {
  const seen = new Set<ColumnId>();
  for (const id of orderedIds) {
    if (!existingIds.has(id)) {
      return orderError('UNKNOWN_COLUMN', id, `Colonne inconnue : ${id}`);
    }
    if (seen.has(id)) {
      return orderError('DUPLICATE_COLUMN', id, `Colonne en double : ${id}`);
    }
    seen.add(id);
  }
  return undefined;
}

// La liste doit être une permutation complète : un ordre partiel laisserait des positions ambiguës.
// Positions de 0 à N-1, sans trou.
export function computeColumnOrder(
  orderedIds: ReadonlyArray<ColumnId>,
  existingIds: ReadonlyArray<ColumnId>,
): Result<ReadonlyArray<ColumnPosition>, ColumnOrderError> {
  const invalid = findInvalidId(orderedIds, new Set(existingIds));
  if (invalid !== undefined) {
    return err(invalid);
  }
  const ordered = new Set(orderedIds);
  const missing = existingIds.find((id) => !ordered.has(id));
  return missing === undefined
    ? ok(orderedIds.map((id, position) => ({ id, position })))
    : err(orderError('MISSING_COLUMN', missing, `Colonne absente de l'ordre : ${missing}`));
}
