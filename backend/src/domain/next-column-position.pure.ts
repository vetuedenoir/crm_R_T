import type { Column } from './column.js';

// Une nouvelle colonne vient en dernier ; partir du maximum (et non de la longueur) reste correct
// si des positions comportent un trou.
export function nextColumnPosition(columns: ReadonlyArray<Column>): number {
  return columns.reduce((next, column) => Math.max(next, column.position + 1), 0);
}
