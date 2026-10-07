import { describe, expect, it } from 'vitest';

import type { CellValue, FilterSpec } from '../api';
import { buildColumn } from '../mocks';

import { describeFilter } from './filter-label.pure';

const COLUMN = buildColumn({ position: 4, type: 'number' });
const identity = (value: CellValue): string => String(value);

function filter(operator: FilterSpec['operator'], values: FilterSpec['values']): FilterSpec {
  return { columnId: COLUMN.id, operator, values };
}

describe('describeFilter', () => {
  it.each([
    ['un opérande', filter('greaterThan', [10]), 'Score est supérieur à 10'],
    ['deux opérandes', filter('between', [1, 9]), 'Score est entre 1 et 9'],
    ['aucun opérande', filter('isEmpty', []), 'Score est vide'],
    ['une recherche, entre guillemets', filter('contains', ['ada']), 'Score contient « ada »'],
  ])('%s', (_label, spec, expected) => {
    expect(describeFilter('Score', spec, identity)).toBe(expected);
  });

  it('affiche les opérandes avec le format du type de la colonne', () => {
    const asDate = (value: CellValue): string => `le ${String(value)}`;

    expect(describeFilter('Date', filter('before', ['2024-03-01']), asDate)).toBe(
      'Date est avant le 2024-03-01',
    );
  });
});
