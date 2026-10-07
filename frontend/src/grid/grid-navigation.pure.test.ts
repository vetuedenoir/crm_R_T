import { describe, expect, it } from 'vitest';

import { buildColumn, buildContact } from '../mocks';

import type { CellAddress } from './cell-address.pure';
import { neighbor, type Direction, type GridLayout } from './grid-navigation.pure';

const COLUMNS = [0, 1, 2].map((position) => buildColumn({ position }).id);
const ROWS = [1, 2, 3].map((index) => buildContact(index).id);
const LAYOUT: GridLayout = { rowIds: ROWS, columnIds: COLUMNS };

function at(row: number, column: number): CellAddress {
  const contactId = ROWS[row];
  const columnId = COLUMNS[column];
  if (contactId === undefined || columnId === undefined) {
    throw new Error('Cellule hors de la grille de test');
  }
  return { contactId, columnId };
}

describe('neighbor', () => {
  it.each<
    readonly [string, readonly [number, number], Direction, readonly [number, number] | null]
  >([
    ['vers le bas', [0, 0], 'down', [1, 0]],
    ['vers le haut', [2, 1], 'up', [1, 1]],
    ['vers la droite', [1, 0], 'right', [1, 1]],
    ['vers la gauche', [1, 2], 'left', [1, 1]],
    ['bord haut', [0, 1], 'up', null],
    ['bord bas', [2, 1], 'down', null],
    ['bord gauche', [1, 0], 'left', null],
    ['bord droit', [1, 2], 'right', null],
  ])('[R6] %s', (_label, from, direction, expected) => {
    const result = neighbor(LAYOUT, at(...from), direction);
    expect(result).toEqual(expected === null ? null : at(...expected));
  });

  it('[R6] repart de la première cellule quand rien n’est actif', () => {
    expect(neighbor(LAYOUT, null, 'down')).toEqual(at(0, 0));
  });

  it('[R6] repart de la première cellule quand la cellule active a disparu', () => {
    const vanished: CellAddress = {
      contactId: buildContact(99).id,
      columnId: COLUMNS[0] ?? at(0, 0).columnId,
    };
    expect(neighbor(LAYOUT, vanished, 'right')).toEqual(at(0, 0));
  });

  it('[R6] ne trouve aucune cellule dans une grille vide', () => {
    expect(neighbor({ rowIds: [], columnIds: COLUMNS }, null, 'down')).toBeNull();
    expect(neighbor({ rowIds: ROWS, columnIds: [] }, null, 'down')).toBeNull();
  });
});
