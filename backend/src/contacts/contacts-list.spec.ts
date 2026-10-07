import { BULK_COUNT, bulkDate, insertBulkContacts } from '../testing/bulk-contacts.js';
import { startContactsApi, pageOf, type ContactsApi } from '../testing/contacts-api.js';
import { bodyOf, errorFieldsOf } from '../testing/response-body.js';
import { clearTables } from '../testing/test-database.js';

describe('GET /api/contacts avec 500 contacts (PostgreSQL réel)', () => {
  let api: ContactsApi;
  let name: string;
  let score: string;
  let date: string;
  let phone: string;

  beforeAll(async () => {
    api = await startContactsApi();
    await clearTables(api.dataSource);
    name = (await api.createColumn('Nom', 'text')).id;
    score = (await api.createColumn('Score', 'number')).id;
    date = (await api.createColumn('Date', 'date')).id;
    phone = (await api.createColumn('Téléphone', 'phone')).id;
    await insertBulkContacts(api.dataSource, { name, score, date, phone });
  });

  afterAll(async () => {
    await clearTables(api.dataSource);
    await api.app.close();
  });

  async function scores(
    options: Parameters<ContactsApi['list']>[0],
  ): Promise<ReadonlyArray<unknown>> {
    const page = pageOf(await api.list(options).expect(200));
    return page.items.map((item) => item.cells[score]);
  }

  describe('pagination [R2]', () => {
    it('[R2] renvoie 50 contacts et le total de 500 par défaut', async () => {
      const page = pageOf(await api.list().expect(200));

      expect(page).toMatchObject({ total: BULK_COUNT, offset: 0, limit: 50 });
      expect(page.items).toHaveLength(50);
    });

    it('[R2] l’ordre par défaut est celui de création', async () => {
      expect(await scores({ limit: 3 })).toEqual([1, 2, 3]);
    });

    it('[R2] parcourir toutes les pages ne donne ni doublon ni trou', async () => {
      const ids: string[] = [];
      for (let offset = 0; offset < BULK_COUNT; offset += 50) {
        const page = pageOf(await api.list({ offset, sort: `${score}:desc` }).expect(200));
        ids.push(...page.items.map((item) => item.id));
      }

      expect(ids).toHaveLength(BULK_COUNT);
      expect(new Set(ids).size).toBe(BULK_COUNT);
    });

    it('[R2] une page au-delà du total est vide, le total reste exact', async () => {
      const page = pageOf(await api.list({ offset: 1000 }).expect(200));

      expect(page.items).toEqual([]);
      expect(page.total).toBe(BULK_COUNT);
    });

    it.each([
      ['limit à 0', { limit: 0 }, 'limit'],
      ['limit au-dessus du maximum', { limit: 201 }, 'limit'],
      ['offset négatif', { offset: -1 }, 'offset'],
      ['limit décimal', { limit: 1.5 }, 'limit'],
      ['paramètre inconnu', { page: 2 }, 'page'],
    ])('[R2] refuse %s avec un 422 désignant le champ', async (_label, query, field) => {
      const response = await api.rawList(query).expect(422);

      expect(errorFieldsOf(response)).toEqual([field]);
    });
  });

  describe('tri sur tout le jeu de données [R7][R15][R16]', () => {
    it('[R15] trie sur l’ensemble des données, pas sur la page : le maximum global est en tête', async () => {
      const page = pageOf(await api.list({ sort: `${score}:desc`, limit: 3 }).expect(200));

      expect(page.items.map((item) => item.cells[score])).toEqual([500, 499, 498]);
      expect(page.total).toBe(BULK_COUNT);
    });

    it('[R16] trie les nombres numériquement : 9 avant 10', async () => {
      expect(await scores({ sort: `${score}:asc`, limit: 12 })).toEqual([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
      ]);
    });

    it('[R16] trie le texte sans tenir compte de la casse', async () => {
      const page = pageOf(await api.list({ sort: `${name}:asc`, limit: 4 }).expect(200));

      expect(page.items.map((item) => item.cells[name])).toEqual(['X001', 'x002', 'X003', 'x004']);
    });

    it('[R16] trie les dates chronologiquement', async () => {
      const page = pageOf(await api.list({ sort: `${date}:desc`, limit: 2 }).expect(200));

      expect(page.items.map((item) => item.cells[date])).toEqual([bulkDate(500), bulkDate(499)]);
    });

    it.each(['asc', 'desc'])('[R16] place les valeurs vides en dernier (%s)', async (direction) => {
      const empties = pageOf(
        await api.list({ sort: `${phone}:${direction}`, offset: 450, limit: 50 }).expect(200),
      );

      expect(empties.items.every((item) => item.cells[phone] === undefined)).toBe(true);
    });

    it('[R7] le tri est stable : deux lignes ex æquo gardent un ordre déterministe', async () => {
      const first = pageOf(await api.list({ sort: `${phone}:asc`, offset: 450 }).expect(200));
      const second = pageOf(await api.list({ sort: `${phone}:asc`, offset: 450 }).expect(200));

      expect(first.items.map((item) => item.id)).toEqual(second.items.map((item) => item.id));
    });
  });

  describe('filtres sur tout le jeu de données [R8][R15][R16]', () => {
    // Un cas par type de colonne et par opérateur. Le total est celui du jeu entier, pas de la page.
    it.each([
      ['texte', 'contains', 'name', ['49'], 15],
      ['texte', 'startsWith', 'name', ['x00'], 9],
      ['texte', 'equals', 'name', ['x007'], 1],
      ['texte', 'isEmpty', 'name', [], 0],
      ['texte', 'isNotEmpty', 'name', [], BULK_COUNT],
      ['nombre', 'equals', 'score', [7], 1],
      ['nombre', 'notEquals', 'score', [7], 499],
      ['nombre', 'greaterThan', 'score', [450], 50],
      ['nombre', 'greaterThanOrEqual', 'score', [450], 51],
      ['nombre', 'lessThan', 'score', [10], 9],
      ['nombre', 'lessThanOrEqual', 'score', [10], 10],
      ['nombre', 'between', 'score', [100, 200], 101],
      ['date', 'equals', 'date', [bulkDate(1)], 1],
      ['date', 'before', 'date', [bulkDate(11)], 10],
      ['date', 'after', 'date', [bulkDate(491)], 9],
      ['date', 'between', 'date', [bulkDate(1), bulkDate(10)], 10],
      ['téléphone', 'contains', 'phone', ['051'], 1],
      ['téléphone', 'equals', 'phone', ['+33000000007'], 1],
      ['téléphone', 'isEmpty', 'phone', [], 50],
      ['téléphone', 'isNotEmpty', 'phone', [], 450],
    ] as const)('[R8] %s, opérateur %s', async (_type, operator, column, values, expected) => {
      const columnId = { name, score, date, phone }[column];

      const page = pageOf(
        await api.list({ filters: [{ columnId, operator, values }], limit: 200 }).expect(200),
      );

      expect(page.total).toBe(expected);
      expect(page.items).toHaveLength(Math.min(expected, 200));
    });

    it('[R15] le total d’un filtre porte sur l’ensemble des données, pas sur la première page', async () => {
      const page = pageOf(
        await api
          .list({
            filters: [{ columnId: score, operator: 'greaterThan', values: [100] }],
            limit: 5,
          })
          .expect(200),
      );

      expect(page.total).toBe(400);
      expect(page.items).toHaveLength(5);
    });

    it('[R8] combine plusieurs filtres par ET', async () => {
      const page = pageOf(
        await api
          .list({
            filters: [
              { columnId: score, operator: 'between', values: [1, 100] },
              { columnId: phone, operator: 'isEmpty', values: [] },
            ],
            limit: 200,
          })
          .expect(200),
      );

      expect(page.total).toBe(10);
    });

    it('[R7][R8] un tri et un filtre se combinent', async () => {
      expect(
        await scores({
          sort: `${score}:desc`,
          filters: [{ columnId: score, operator: 'lessThan', values: [100] }],
          limit: 2,
        }),
      ).toEqual([99, 98]);
    });
  });

  describe('requêtes refusées [R16]', () => {
    const unknownColumn = '00000000-0000-4000-8000-000000000099';

    it.each([
      ['un tri sur une colonne inconnue', { sort: `${unknownColumn}:asc` }, 'INVALID_SORT'],
      ['un tri mal formé', { sort: 'score' }, 'INVALID_SORT'],
      [
        'un filtre sur une colonne inconnue',
        { filters: [{ columnId: unknownColumn, operator: 'equals', values: [1] }] },
        'INVALID_FILTER',
      ],
      [
        'un opérateur absent pour le type',
        { filters: [{ columnId: score, operator: 'contains', values: ['1'] }] },
        'INVALID_FILTER',
      ],
      [
        'un opérateur inconnu',
        { filters: [{ columnId: score, operator: 'drop', values: [] }] },
        'INVALID_FILTER',
      ],
      [
        'une valeur invalide pour le type',
        { filters: [{ columnId: score, operator: 'equals', values: ['abc'] }] },
        'INVALID_FILTER',
      ],
      [
        'un nombre de valeurs incorrect',
        { filters: [{ columnId: score, operator: 'between', values: [1] }] },
        'INVALID_FILTER',
      ],
    ])('refuse %s avec un 400 %s', async (_label, options, code) => {
      const response = await api.list(options).expect(400);

      expect(bodyOf(response)).toMatchObject({ error: { code } });
    });

    it('refuse un filtre qui n’est pas du JSON', async () => {
      const response = await api.rawList({ filters: '{' }).expect(400);

      expect(bodyOf(response)).toMatchObject({ error: { code: 'INVALID_FILTER' } });
    });
  });

  describe('injection SQL', () => {
    const hostile = "'; DROP TABLE cells; --";

    it('une valeur de filtre hostile est un simple paramètre : aucun résultat, tables intactes', async () => {
      const page = pageOf(
        await api
          .list({ filters: [{ columnId: name, operator: 'contains', values: [hostile] }] })
          .expect(200),
      );

      expect(page.total).toBe(0);
      expect(await api.dataSource.query('SELECT count(*)::int AS n FROM cells')).toEqual([
        { n: BULK_COUNT * 4 - 50 },
      ]);
    });

    it.each([
      ['l’id de colonne du tri', { sort: `${hostile}:asc` }],
      [
        'l’id de colonne d’un filtre',
        { filters: [{ columnId: hostile, operator: 'equals', values: ['a'] }] },
      ],
      [
        'l’opérateur d’un filtre',
        { filters: [{ columnId: name, operator: hostile, values: ['a'] }] },
      ],
    ])('refuse %s hostile sans l’atteindre le SQL', async (_label, options) => {
      await api.list(options).expect(400);

      expect(await api.dataSource.query('SELECT count(*)::int AS n FROM cells')).toEqual([
        { n: BULK_COUNT * 4 - 50 },
      ]);
    });

    it('un nom de colonne hostile n’est qu’une étiquette : il n’entre jamais dans le SQL de liste', async () => {
      await api.createColumn(`${hostile} --`, 'text');

      const page = pageOf(await api.list({ sort: `${score}:asc`, limit: 1 }).expect(200));

      expect(page.total).toBe(BULK_COUNT);
    });
  });
});
