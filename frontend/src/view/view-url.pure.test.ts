import { describe, expect, it } from 'vitest';

import type { ColumnTypeName, ContactsView } from '../api';
import { COLUMN_TYPE_UI } from '../column-types';
import { DEFAULT_COLUMNS } from '../mocks';

import { viewFromSearch, withViewSearch } from './view-url.pure';

const [NAME, , PHONE, DATE, SCORE] = DEFAULT_COLUMNS;
if (NAME === undefined || PHONE === undefined || DATE === undefined || SCORE === undefined) {
  throw new Error('Colonnes de test manquantes');
}

function logicOf(type: ColumnTypeName): (typeof COLUMN_TYPE_UI)[ColumnTypeName] {
  return COLUMN_TYPE_UI[type];
}

function read(search: string): ContactsView {
  return viewFromSearch(search, DEFAULT_COLUMNS, logicOf);
}

function filtersParam(...filters: ReadonlyArray<unknown>): string {
  return `?filters=${encodeURIComponent(JSON.stringify(filters))}`;
}

describe('viewFromSearch', () => {
  it('[R7] donne une vue vide pour une URL sans tri ni filtre', () => {
    expect(read('')).toEqual({ sort: null, filters: [] });
    expect(read('?autre=1')).toEqual({ sort: null, filters: [] });
  });

  it.each([
    ['croissant', `?sort=${SCORE.id}:asc`, 'asc'],
    ['décroissant', `?sort=${SCORE.id}:desc`, 'desc'],
  ])('[R7] relit un tri %s', (_label, search, direction) => {
    expect(read(search).sort).toEqual({ columnId: SCORE.id, direction });
  });

  it.each([
    ['colonne inconnue', '?sort=00000000-0000-4000-8000-999999999999:asc'],
    ['sens inconnu', `?sort=${SCORE.id}:up`],
    ['sens absent', `?sort=${SCORE.id}`],
    ['paramètre en trop', `?sort=${SCORE.id}:asc:x`],
    ['texte quelconque', '?sort=n-importe-quoi'],
  ])('écarte un tri invalide (%s)', (_label, search) => {
    expect(read(search).sort).toBeNull();
  });

  it.each([
    ['nombre', { columnId: SCORE.id, operator: 'greaterThan', values: [10] }],
    ['texte', { columnId: NAME.id, operator: 'contains', values: ['ada'] }],
    ['date', { columnId: DATE.id, operator: 'between', values: ['2024-01-01', '2024-12-31'] }],
    ['téléphone', { columnId: PHONE.id, operator: 'contains', values: ['0612'] }],
    ['sans valeur', { columnId: PHONE.id, operator: 'isEmpty', values: [] }],
  ])('[R8] relit un filtre sur un %s', (_label, filter) => {
    expect(read(filtersParam(filter)).filters).toEqual([filter]);
  });

  it('[R8] relit plusieurs filtres, dans l’ordre', () => {
    const first = { columnId: SCORE.id, operator: 'greaterThan', values: [10] };
    const second = { columnId: NAME.id, operator: 'startsWith', values: ['a'] };

    expect(read(filtersParam(first, second)).filters).toEqual([first, second]);
  });

  it('[R8] omet `values` pour un opérateur sans opérande', () => {
    const search = filtersParam({ columnId: NAME.id, operator: 'isNotEmpty' });

    expect(read(search).filters).toEqual([
      { columnId: NAME.id, operator: 'isNotEmpty', values: [] },
    ]);
  });

  it.each([
    ['JSON invalide', '?filters=%7Bpas-du-json'],
    ['pas une liste', `?filters=${encodeURIComponent('{"a":1}')}`],
    ['colonne inconnue', filtersParam({ columnId: 'x', operator: 'isEmpty' })],
    [
      'opérateur inconnu',
      filtersParam({ columnId: NAME.id, operator: 'ressemble', values: ['a'] }),
    ],
    [
      'opérateur d’un autre type',
      filtersParam({ columnId: NAME.id, operator: 'greaterThan', values: [1] }),
    ],
    [
      'mauvais nombre de valeurs',
      filtersParam({ columnId: SCORE.id, operator: 'between', values: [1] }),
    ],
    [
      'valeur invalide pour le type',
      filtersParam({ columnId: SCORE.id, operator: 'equals', values: ['abc'] }),
    ],
    [
      'date impossible',
      filtersParam({ columnId: DATE.id, operator: 'equals', values: ['2024-02-30'] }),
    ],
    ['élément qui n’est pas un objet', filtersParam('texte', 3)],
  ])('écarte un filtre invalide (%s)', (_label, search) => {
    expect(read(search).filters).toEqual([]);
  });

  it('garde les filtres valides quand un autre est invalide', () => {
    const valid = { columnId: SCORE.id, operator: 'lessThan', values: [5] };
    const search = filtersParam({ columnId: 'inconnue', operator: 'isEmpty' }, valid);

    expect(read(search).filters).toEqual([valid]);
  });
});

describe('withViewSearch', () => {
  const view: ContactsView = {
    sort: { columnId: SCORE.id, direction: 'desc' },
    filters: [{ columnId: NAME.id, operator: 'contains', values: ['ada'] }],
  };

  it('[R15] écrit le tri et les filtres au format de l’API', () => {
    const params = new URLSearchParams(withViewSearch('', view));

    expect(params.get('sort')).toBe(`${SCORE.id}:desc`);
    expect(JSON.parse(params.get('filters') ?? 'null')).toEqual(view.filters);
  });

  it('[R14] survit à un aller-retour : ce qu’on écrit se relit à l’identique', () => {
    expect(read(withViewSearch('', view))).toEqual(view);
  });

  it('retourne une chaîne vide pour une vue vide', () => {
    expect(withViewSearch(`?sort=${SCORE.id}:asc`, { sort: null, filters: [] })).toBe('');
  });

  it('remplace l’ancienne vue et garde les autres paramètres', () => {
    const search = withViewSearch(`?autre=1&sort=${NAME.id}:asc`, view);
    const params = new URLSearchParams(search);

    expect(params.get('autre')).toBe('1');
    expect(params.get('sort')).toBe(`${SCORE.id}:desc`);
  });
});
