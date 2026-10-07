import { columnId } from '../testing/factories.js';

import { DEFAULT_PAGE_SIZE, parseContactsParams } from './contacts-params.pure.js';

const ID = columnId(1);

describe('parseContactsParams', () => {
  it('[R2] applique la pagination par défaut', () => {
    expect(parseContactsParams({})).toEqual({
      ok: true,
      value: { offset: 0, limit: DEFAULT_PAGE_SIZE, sort: null, filters: [] },
    });
  });

  it('[R2] conserve offset et limit fournis', () => {
    expect(parseContactsParams({ offset: 100, limit: 25 })).toMatchObject({
      ok: true,
      value: { offset: 100, limit: 25 },
    });
  });

  it.each(['asc', 'desc'] as const)('[R7] lit un tri %s', (direction) => {
    expect(parseContactsParams({ sort: `${ID}:${direction}` })).toMatchObject({
      ok: true,
      value: { sort: { columnId: ID, direction } },
    });
  });

  it.each([
    ['un id invalide', 'abc:asc'],
    ['une direction inconnue', `${ID}:up`],
    ['une direction absente', ID],
    ['un séparateur en trop', `${ID}:asc:x`],
    ['une chaîne vide', ''],
  ])('[R7] refuse un tri avec %s', (_label, sort) => {
    expect(parseContactsParams({ sort })).toMatchObject({
      ok: false,
      error: { code: 'INVALID_SORT', field: 'sort' },
    });
  });

  it('[R8] lit plusieurs filtres, avec ou sans valeurs', () => {
    const filters = JSON.stringify([
      { columnId: ID, operator: 'contains', values: ['ada'] },
      { columnId: ID, operator: 'isEmpty' },
    ]);

    expect(parseContactsParams({ filters })).toMatchObject({
      ok: true,
      value: {
        filters: [
          { columnId: ID, operator: 'contains', values: ['ada'] },
          { columnId: ID, operator: 'isEmpty', values: [] },
        ],
      },
    });
  });

  it.each([
    ['un JSON invalide', '{', 'filters'],
    ['autre chose qu’une liste', '{}', 'filters'],
    ['un filtre qui n’est pas un objet', '[1]', 'filters[0]'],
    ['une colonne absente', '[{"operator":"equals","values":["a"]}]', 'filters[0]'],
    ['un opérateur inconnu', `[{"columnId":"${ID}","operator":"drop","values":[]}]`, 'filters[0]'],
    [
      'des valeurs qui ne sont pas une liste',
      `[{"columnId":"${ID}","operator":"equals","values":"a"}]`,
      'filters[0]',
    ],
  ])('[R8] refuse un filtre avec %s', (_label, filters, field) => {
    expect(parseContactsParams({ filters })).toMatchObject({
      ok: false,
      error: { code: 'INVALID_FILTER', field },
    });
  });

  it('désigne le filtre fautif par son rang', () => {
    const filters = JSON.stringify([{ columnId: ID, operator: 'isEmpty' }, 3]);

    expect(parseContactsParams({ filters })).toMatchObject({
      ok: false,
      error: { field: 'filters[1]' },
    });
  });
});
