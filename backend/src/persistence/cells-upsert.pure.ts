import type { SqlStatement, StoredCell } from '../domain/index.js';
import type { ColumnId, ContactId } from '../ids.pure.js';

export interface NewCell {
  readonly contactId: ContactId;
  readonly columnId: ColumnId;
  readonly stored: StoredCell;
}

const PARAMS_PER_CELL = 5;

// Une seule colonne de valeur est renseignée, les deux autres valent NULL (contrainte `cells_single_value`).
function valueParams(stored: StoredCell): ReadonlyArray<string | number | null> {
  switch (stored.column) {
    case 'value_text':
      return [stored.value, null, null];
    case 'value_number':
      return [null, stored.value, null];
    case 'value_date':
      return [null, null, stored.value];
  }
}

function rowPlaceholders(index: number): string {
  const first = index * PARAMS_PER_CELL;
  const marks = Array.from(
    { length: PARAMS_PER_CELL },
    (_, offset) => `$${String(first + offset + 1)}`,
  );
  return `(${marks.join(', ')})`;
}

// Insertion groupée : un seul INSERT pour toutes les cellules (RULES §6). Le `ON CONFLICT` réécrit les
// trois colonnes de valeur, ce qui rend l'écriture idempotente. PostgreSQL accepte 65 535 paramètres
// par requête : l'appelant découpe les très gros lots (le seed insère par paquets).
export function buildCellsUpsert(cells: ReadonlyArray<NewCell>): SqlStatement | null {
  if (cells.length === 0) {
    return null;
  }
  const rows = cells.map((_, index) => rowPlaceholders(index)).join(', ');
  return {
    sql: `INSERT INTO cells (contact_id, column_id, value_text, value_number, value_date)
VALUES ${rows}
ON CONFLICT (contact_id, column_id) DO UPDATE SET
  value_text = EXCLUDED.value_text,
  value_number = EXCLUDED.value_number,
  value_date = EXCLUDED.value_date`,
    params: cells.flatMap((cell) => [cell.contactId, cell.columnId, ...valueParams(cell.stored)]),
  };
}
