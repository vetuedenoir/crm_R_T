import type { ColumnId, ContactId } from '../api';

import type { CellAddress } from './cell-address.pure';

export type Direction = 'up' | 'down' | 'left' | 'right';

// Les cellules chargées, dans l'ordre d'affichage. Les lignes squelette ne sont pas navigables.
export interface GridLayout {
  readonly rowIds: ReadonlyArray<ContactId>;
  readonly columnIds: ReadonlyArray<ColumnId>;
}

const DELTAS = {
  up: { row: -1, column: 0 },
  down: { row: 1, column: 0 },
  left: { row: 0, column: -1 },
  right: { row: 0, column: 1 },
} as const satisfies Record<Direction, { row: number; column: number }>;

export function addressAt(layout: GridLayout, row: number, column: number): CellAddress | null {
  const contactId = layout.rowIds[row];
  const columnId = layout.columnIds[column];
  return contactId === undefined || columnId === undefined ? null : { contactId, columnId };
}

// Cellule voisine de `from`, ou `null` au bord de la grille. Sans cellule de départ, ou si elle a disparu
// (contact supprimé, colonne retirée), on repart de la première cellule.
export function neighbor(
  layout: GridLayout,
  from: CellAddress | null,
  direction: Direction,
): CellAddress | null {
  const row = from === null ? -1 : layout.rowIds.indexOf(from.contactId);
  const column = from === null ? -1 : layout.columnIds.indexOf(from.columnId);
  if (row === -1 || column === -1) {
    return addressAt(layout, 0, 0);
  }
  const delta = DELTAS[direction];
  return addressAt(layout, row + delta.row, column + delta.column);
}
