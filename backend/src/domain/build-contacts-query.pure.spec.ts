import { errorOf } from '../testing/error-of.js';
import { buildColumn, columnId } from '../testing/factories.js';

import { buildContactsQuery } from './build-contacts-query.pure.js';
import type { ContactsQuery, ContactsSql, FilterSpec } from './contacts-query.js';

const TEXT = buildColumn({ id: columnId(1), type: 'text' });
const NUMBER = buildColumn({ id: columnId(2), type: 'number' });
const DATE = buildColumn({ id: columnId(3), type: 'date' });
const PHONE = buildColumn({ id: columnId(4), type: 'phone' });
const COLUMNS = [TEXT, NUMBER, DATE, PHONE];

const BASE: ContactsQuery = { offset: 0, limit: 50, sort: null, filters: [] };

function build(query: Partial<ContactsQuery>): ContactsSql {
  const built = buildContactsQuery({ ...BASE, ...query }, COLUMNS);
  if (!built.ok) {
    throw new Error(built.error.message);
  }
  return built.value;
}

const filter = (spec: FilterSpec): FilterSpec => spec;

describe('buildContactsQuery', () => {
  it('[R2] sans tri ni filtre : ordre de création, page demandée', () => {
    const { ids, count } = build({ offset: 100, limit: 25 });
    expect(ids.sql).toBe(
      [
        'SELECT c.id',
        'FROM contacts c',
        'ORDER BY c.created_at ASC, c.id ASC',
        'LIMIT $1 OFFSET $2',
      ].join('\n'),
    );
    expect(ids.params).toEqual([25, 100]);
    expect(count).toEqual({ sql: 'SELECT count(*) AS total\nFROM contacts c', params: [] });
  });

  it.each([
    ['text', TEXT, 'lower(s.value_text)'],
    ['number', NUMBER, 's.value_number'],
    ['date', DATE, 's.value_date'],
    ['phone', PHONE, 'lower(s.value_text)'],
  ] as const)(
    '[R7] trie une colonne %s sur sa colonne de valeur typée',
    (_type, column, expression) => {
      const { ids } = build({ sort: { columnId: column.id, direction: 'asc' } });
      expect(ids.sql).toBe(
        [
          'SELECT c.id',
          'FROM contacts c',
          'LEFT JOIN cells s ON s.contact_id = c.id AND s.column_id = $1',
          `ORDER BY ${expression} ASC NULLS LAST, c.id ASC`,
          'LIMIT $2 OFFSET $3',
        ].join('\n'),
      );
      expect(ids.params).toEqual([column.id, 50, 0]);
    },
  );

  it('[R16] le tri descendant garde les valeurs vides en dernier et un départage stable', () => {
    const { ids } = build({ sort: { columnId: NUMBER.id, direction: 'desc' } });
    expect(ids.sql).toContain('ORDER BY s.value_number DESC NULLS LAST, c.id ASC');
  });

  it('[R15] le tri précède la pagination dans le SQL : la base trie tout avant de couper la page', () => {
    const { ids } = build({ sort: { columnId: NUMBER.id, direction: 'desc' }, limit: 50 });
    expect(ids.sql).toMatch(/ORDER BY .*\nLIMIT \$2 OFFSET \$3$/);
  });

  it('[R8] un filtre devient une clause EXISTS, appliquée à la page et au total', () => {
    const query = {
      filters: [filter({ columnId: NUMBER.id, operator: 'greaterThan', values: [5] })],
    };
    const { ids, count } = build(query);
    const where =
      'WHERE EXISTS (SELECT 1 FROM cells f0 WHERE f0.contact_id = c.id AND f0.column_id = $1 AND f0.value_number > $2)';
    expect(ids.sql).toBe(
      [
        'SELECT c.id',
        'FROM contacts c',
        where,
        'ORDER BY c.created_at ASC, c.id ASC',
        'LIMIT $3 OFFSET $4',
      ].join('\n'),
    );
    expect(ids.params).toEqual([NUMBER.id, 5, 50, 0]);
    expect(count).toEqual({
      sql: ['SELECT count(*) AS total', 'FROM contacts c', where].join('\n'),
      params: [NUMBER.id, 5],
    });
  });

  it('[R15] le total repose sur les mêmes filtres que la page', () => {
    const { ids, count } = build({
      filters: [filter({ columnId: TEXT.id, operator: 'contains', values: ['ali'] })],
    });
    const clause = (sql: string): string =>
      sql
        .split('\n')
        .filter((line) => line.startsWith('WHERE'))
        .join();
    expect(clause(count.sql)).toBe(clause(ids.sql));
  });

  it('[R8] combine plusieurs filtres en AND et poursuit la numérotation des paramètres', () => {
    const { ids, count } = build({
      sort: { columnId: DATE.id, direction: 'desc' },
      filters: [
        filter({ columnId: TEXT.id, operator: 'contains', values: ['ali'] }),
        filter({ columnId: NUMBER.id, operator: 'between', values: [1, 10] }),
        filter({ columnId: PHONE.id, operator: 'isEmpty', values: [] }),
      ],
      offset: 10,
    });
    expect(ids.sql).toBe(
      [
        'SELECT c.id',
        'FROM contacts c',
        'LEFT JOIN cells s ON s.contact_id = c.id AND s.column_id = $1',
        "WHERE EXISTS (SELECT 1 FROM cells f0 WHERE f0.contact_id = c.id AND f0.column_id = $2 AND lower(f0.value_text) LIKE lower($3) ESCAPE '\\')",
        '  AND EXISTS (SELECT 1 FROM cells f1 WHERE f1.contact_id = c.id AND f1.column_id = $4 AND f1.value_number BETWEEN $5 AND $6)',
        '  AND NOT EXISTS (SELECT 1 FROM cells f2 WHERE f2.contact_id = c.id AND f2.column_id = $7)',
        'ORDER BY s.value_date DESC NULLS LAST, c.id ASC',
        'LIMIT $8 OFFSET $9',
      ].join('\n'),
    );
    expect(ids.params).toEqual([DATE.id, TEXT.id, '%ali%', NUMBER.id, 1, 10, PHONE.id, 50, 10]);
    expect(count.params).toEqual([TEXT.id, '%ali%', NUMBER.id, 1, 10, PHONE.id]);
    expect(count.sql).toContain('f1.value_number BETWEEN $4 AND $5');
    expect(count.sql).toContain('f2.column_id = $6)');
  });

  it('[R8] filtrer et trier la même colonne reste possible', () => {
    const { ids } = build({
      sort: { columnId: NUMBER.id, direction: 'asc' },
      filters: [filter({ columnId: NUMBER.id, operator: 'isNotEmpty', values: [] })],
    });
    expect(ids.params).toEqual([NUMBER.id, NUMBER.id, 50, 0]);
  });

  it('[R11] refuse de trier sur une colonne inconnue (supprimée par exemple)', () => {
    const result = buildContactsQuery(
      { ...BASE, sort: { columnId: columnId(99), direction: 'asc' } },
      COLUMNS,
    );
    const error = errorOf(result);
    expect(error).toMatchObject({ code: 'INVALID_SORT', field: 'sort' });
    expect(error.message).toContain(columnId(99));
  });

  it('[R11] refuse de filtrer sur une colonne inconnue et indique quel filtre', () => {
    const result = buildContactsQuery(
      {
        ...BASE,
        filters: [
          filter({ columnId: TEXT.id, operator: 'isEmpty', values: [] }),
          filter({ columnId: columnId(99), operator: 'isEmpty', values: [] }),
        ],
      },
      COLUMNS,
    );
    const error = errorOf(result);
    expect(error).toMatchObject({ code: 'INVALID_FILTER', field: 'filters[1]' });
    expect(error.message).toContain(columnId(99));
  });

  it('[R16] refuse un opérateur invalide pour le type, avec le rang du filtre', () => {
    const result = buildContactsQuery(
      { ...BASE, filters: [filter({ columnId: NUMBER.id, operator: 'contains', values: ['1'] })] },
      COLUMNS,
    );
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'INVALID_FILTER', field: 'filters[0]' },
    });
  });

  it.each([
    ['limit', { limit: 0 }],
    ['limit', { limit: -5 }],
    ['limit', { limit: 1.5 }],
    ['limit', { limit: NaN }],
    ['offset', { offset: -1 }],
    ['offset', { offset: 2.5 }],
    ['offset', { offset: Infinity }],
  ])('[R2] refuse une pagination incorrecte sur %s (%j)', (field, pagination) => {
    const result = buildContactsQuery({ ...BASE, ...pagination }, COLUMNS);
    expect(result).toMatchObject({ ok: false, error: { code: 'BAD_REQUEST', field } });
  });

  it('[R2] accepte un offset nul et une limite de 1', () => {
    expect(buildContactsQuery({ ...BASE, offset: 0, limit: 1 }, COLUMNS).ok).toBe(true);
  });

  it('[R8] une valeur de filtre hostile ne se retrouve jamais dans le SQL', () => {
    const hostile = "x'); DROP TABLE contacts; --";
    const { ids, count } = build({
      filters: [filter({ columnId: TEXT.id, operator: 'equals', values: [hostile] })],
    });
    expect(ids.sql).not.toMatch(/DROP|x'/);
    expect(count.sql).not.toMatch(/DROP|x'/);
    expect(ids.params).toContain(hostile);
  });

  it('[R7] une direction hostile ne se retrouve jamais dans le SQL', () => {
    const hostile = 'asc; DROP TABLE contacts';
    // @ts-expect-error un client malveillant n'est pas tenu de respecter l'union
    const { ids } = build({ sort: { columnId: NUMBER.id, direction: hostile } });
    expect(ids.sql).not.toContain('DROP');
    expect(ids.sql).toContain('ASC NULLS LAST');
  });

  it('[R8] les identifiants de colonne ne sont jamais interpolés, seulement liés', () => {
    const { ids, count } = build({
      sort: { columnId: NUMBER.id, direction: 'asc' },
      filters: [filter({ columnId: TEXT.id, operator: 'isEmpty', values: [] })],
    });
    for (const column of COLUMNS) {
      expect(ids.sql).not.toContain(column.id);
      expect(count.sql).not.toContain(column.id);
    }
  });
});
