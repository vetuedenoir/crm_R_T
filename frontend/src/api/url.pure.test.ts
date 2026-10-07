import { describe, expect, it } from 'vitest';

import { buildColumn } from '../mocks';

import { EMPTY_CONTACTS_VIEW, type ContactsView } from './contacts-view';
import { buildApiUrl, contactsSearchParams } from './url.pure';

describe('buildApiUrl', () => {
  it.each([
    ['sans paramètres', '/columns', undefined, 'http://h/api/columns'],
    ['avec paramètres vides', '/columns', new URLSearchParams(), 'http://h/api/columns'],
    [
      'avec paramètres',
      '/contacts',
      new URLSearchParams({ offset: '50' }),
      'http://h/api/contacts?offset=50',
    ],
  ])('%s', (_label, path, search, expected) => {
    expect(buildApiUrl('http://h', path, search)).toBe(expected);
  });
});

describe('contactsSearchParams', () => {
  const column = buildColumn({ position: 4, type: 'number' });

  it('ne met que la pagination quand il n’y a ni tri ni filtre', () => {
    const params = contactsSearchParams(EMPTY_CONTACTS_VIEW, 100, 50);

    expect(params.toString()).toBe('offset=100&limit=50');
  });

  it('[R15] transmet le tri et les filtres au serveur, qui les applique à tout le jeu', () => {
    const view: ContactsView = {
      sort: { columnId: column.id, direction: 'desc' },
      filters: [{ columnId: column.id, operator: 'greaterThan', values: [10] }],
    };

    const params = contactsSearchParams(view, 0, 50);

    expect(params.get('sort')).toBe(`${column.id}:desc`);
    expect(JSON.parse(params.get('filters') ?? 'null')).toEqual([
      { columnId: column.id, operator: 'greaterThan', values: [10] },
    ]);
  });

  it('omet les filtres vides même avec un tri', () => {
    const params = contactsSearchParams(
      { sort: { columnId: column.id, direction: 'asc' }, filters: [] },
      0,
      50,
    );

    expect(params.has('filters')).toBe(false);
  });
});
