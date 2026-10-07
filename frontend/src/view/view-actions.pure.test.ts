import { describe, expect, it } from 'vitest';

import { EMPTY_CONTACTS_VIEW, type ContactsView, type FilterSpec } from '../api';
import { buildColumn } from '../mocks';

import { withFilter, withSort, withoutFilterAt } from './view-actions.pure';

const SCORE = buildColumn({ position: 4, type: 'number' });
const NAME = buildColumn({ position: 0 });
const AT_LEAST_TEN: FilterSpec = {
  columnId: SCORE.id,
  operator: 'greaterThanOrEqual',
  values: [10],
};
const STARTS_WITH_A: FilterSpec = { columnId: NAME.id, operator: 'startsWith', values: ['a'] };

describe('withSort', () => {
  it('[R7] trie sur la colonne choisie', () => {
    expect(withSort(EMPTY_CONTACTS_VIEW, SCORE.id, 'desc').sort).toEqual({
      columnId: SCORE.id,
      direction: 'desc',
    });
  });

  it('[R7] remplace le tri précédent : un seul tri à la fois', () => {
    const sorted = withSort(EMPTY_CONTACTS_VIEW, NAME.id, 'asc');

    expect(withSort(sorted, SCORE.id, 'asc').sort).toEqual({
      columnId: SCORE.id,
      direction: 'asc',
    });
  });

  it('[R7] retire le tri avec `null`, sans toucher aux filtres', () => {
    const view: ContactsView = {
      sort: { columnId: NAME.id, direction: 'asc' },
      filters: [AT_LEAST_TEN],
    };

    expect(withSort(view, NAME.id, null)).toEqual({ sort: null, filters: [AT_LEAST_TEN] });
  });
});

describe('withFilter / withoutFilterAt', () => {
  it('[R8] ajoute un filtre à la suite des autres', () => {
    const view = withFilter(withFilter(EMPTY_CONTACTS_VIEW, AT_LEAST_TEN), STARTS_WITH_A);

    expect(view.filters).toEqual([AT_LEAST_TEN, STARTS_WITH_A]);
  });

  it('[R8] retire le filtre à la position donnée', () => {
    const view: ContactsView = { sort: null, filters: [AT_LEAST_TEN, STARTS_WITH_A] };

    expect(withoutFilterAt(view, 0).filters).toEqual([STARTS_WITH_A]);
    expect(withoutFilterAt(view, 1).filters).toEqual([AT_LEAST_TEN]);
  });

  it('ne modifie pas la vue d’origine', () => {
    const view: ContactsView = { sort: null, filters: [AT_LEAST_TEN] };

    withFilter(view, STARTS_WITH_A);
    withoutFilterAt(view, 0);

    expect(view.filters).toEqual([AT_LEAST_TEN]);
  });
});
