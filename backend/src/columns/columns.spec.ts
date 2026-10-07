import request from 'supertest';

import { columnOf, columnsOf, startColumnsApi, type ColumnsApi } from '../testing/columns-api.js';
import { bodyOf, errorFieldsOf } from '../testing/response-body.js';
import { clearTables } from '../testing/test-database.js';

const MISSING_ID = '00000000-0000-4000-8000-000000000099';

describe('API des colonnes : lecture, création, renommage (PostgreSQL réel)', () => {
  let api: ColumnsApi;

  beforeAll(async () => {
    api = await startColumnsApi();
  });

  beforeEach(async () => {
    await clearTables(api.dataSource);
  });

  afterAll(async () => {
    await api.app.close();
  });

  describe('GET /api/columns', () => {
    it('[R14] renvoie une liste vide quand il n’y a aucune colonne', async () => {
      await request(api.server()).get('/api/columns').expect(200, []);
    });

    it('[R14] liste les colonnes dans l’ordre de leurs positions', async () => {
      await api.create('A');
      await api.create('B', 'number');
      await api.create('C', 'date');

      const response = await request(api.server()).get('/api/columns').expect(200);

      expect(columnsOf(response)).toMatchObject([
        { name: 'A', type: 'text', position: 0 },
        { name: 'B', type: 'number', position: 1 },
        { name: 'C', type: 'date', position: 2 },
      ]);
    });
  });

  describe('POST /api/columns', () => {
    it.each(['text', 'number', 'date', 'phone'])(
      '[R9][R13] crée une colonne de type %s',
      async (type) => {
        const response = await request(api.server())
          .post('/api/columns')
          .send({ name: 'Nouvelle', type })
          .expect(201);

        expect(columnOf(response)).toMatchObject({ name: 'Nouvelle', type, position: 0 });
      },
    );

    it('[R9] place la nouvelle colonne en dernier', async () => {
      await api.create('A');

      expect((await api.create('B')).position).toBe(1);
    });

    it('[R9] retire les espaces autour du nom', async () => {
      expect((await api.create('  Ville  ')).name).toBe('Ville');
    });

    it('[R14] la colonne créée est relue par GET', async () => {
      const created = await api.create('Ville');

      const response = await request(api.server()).get('/api/columns').expect(200);

      expect(columnsOf(response)).toEqual([created]);
    });

    it.each([
      ['un nom vide', { name: '', type: 'text' }, 'name'],
      ['un nom d’espaces', { name: '   ', type: 'text' }, 'name'],
      ['un nom trop long', { name: 'a'.repeat(101), type: 'text' }, 'name'],
      ['un nom absent', { type: 'text' }, 'name'],
      ['un nom qui n’est pas du texte', { name: 12, type: 'text' }, 'name'],
      ['un type inconnu', { name: 'X', type: 'boolean' }, 'type'],
      ['un type absent', { name: 'X' }, 'type'],
      ['un champ inconnu', { name: 'X', type: 'text', color: 'red' }, 'color'],
    ])('[R9] refuse %s avec un 422 désignant le champ', async (_cas, body, field) => {
      const response = await request(api.server()).post('/api/columns').send(body).expect(422);

      expect(bodyOf(response)).toMatchObject({ error: { code: 'VALIDATION_FAILED' } });
      expect(errorFieldsOf(response)).toEqual([field]);
      expect(await api.names()).toEqual([]);
    });

    it.each([
      ['la même casse', 'Ville'],
      ['une autre casse', 'vILLE'],
      ['des espaces autour', '  Ville '],
    ])('[R9] refuse un doublon avec %s (409)', async (_cas, name) => {
      await api.create('Ville');

      const response = await request(api.server())
        .post('/api/columns')
        .send({ name, type: 'number' })
        .expect(409);

      expect(bodyOf(response)).toMatchObject({ error: { code: 'CONFLICT' } });
      expect(errorFieldsOf(response)).toEqual(['name']);
      expect(await api.names()).toEqual(['Ville']);
    });

    it('[R9] deux créations simultanées du même nom : une seule réussit, l’autre est un 409', async () => {
      const responses = await Promise.all([
        request(api.server()).post('/api/columns').send({ name: 'Ville', type: 'text' }),
        request(api.server()).post('/api/columns').send({ name: 'ville', type: 'text' }),
      ]);

      expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
      expect(await api.names()).toHaveLength(1);
    });

    it('[R9] n’expose ni SQL ni nom d’index dans l’erreur de doublon', async () => {
      await api.create('Ville');

      const response = await request(api.server())
        .post('/api/columns')
        .send({ name: 'Ville', type: 'text' })
        .expect(409);

      expect(JSON.stringify(bodyOf(response))).not.toMatch(
        /columns_name_lower_key|INSERT|duplicate/i,
      );
    });
  });

  describe('PATCH /api/columns/:id', () => {
    it('[R10] renomme la colonne sans toucher au type ni à la position', async () => {
      await api.create('Autre');
      const { id } = await api.create('Ancien', 'number');

      const response = await request(api.server())
        .patch(`/api/columns/${id}`)
        .send({ name: 'Nouveau' })
        .expect(200);

      expect(columnOf(response)).toEqual({ id, name: 'Nouveau', type: 'number', position: 1 });
      expect(await api.names()).toEqual(['Autre', 'Nouveau']);
    });

    it('[R10] autorise de ne changer que la casse du nom', async () => {
      const { id } = await api.create('ville');

      await request(api.server()).patch(`/api/columns/${id}`).send({ name: 'Ville' }).expect(200);

      expect(await api.names()).toEqual(['Ville']);
    });

    it('[R10] refuse le nom d’une autre colonne (409), sans rien modifier', async () => {
      await api.create('Ville');
      const { id } = await api.create('Pays');

      const response = await request(api.server())
        .patch(`/api/columns/${id}`)
        .send({ name: 'VILLE' })
        .expect(409);

      expect(bodyOf(response)).toMatchObject({ error: { code: 'CONFLICT' } });
      expect(await api.names()).toEqual(['Ville', 'Pays']);
    });

    it.each([
      ['un nom vide', { name: '' }, 'name'],
      ['un nom trop long', { name: 'a'.repeat(101) }, 'name'],
      ['un nom absent', {}, 'name'],
      ['un champ inconnu', { name: 'X', position: 3 }, 'position'],
    ])('[R10] refuse %s (422)', async (_cas, body, field) => {
      const { id } = await api.create('Ville');

      const response = await request(api.server())
        .patch(`/api/columns/${id}`)
        .send(body)
        .expect(422);

      expect(errorFieldsOf(response)).toEqual([field]);
      expect(await api.names()).toEqual(['Ville']);
    });

    it('[R13] refuse de changer le type (422 explicite), sans rien modifier', async () => {
      const { id } = await api.create('Ville', 'text');

      const response = await request(api.server())
        .patch(`/api/columns/${id}`)
        .send({ name: 'Ville', type: 'number' })
        .expect(422);

      expect(bodyOf(response)).toMatchObject({
        error: {
          code: 'VALIDATION_FAILED',
          details: [{ field: 'type', message: "Le type d'une colonne ne peut pas être modifié" }],
        },
      });
      const list = await request(api.server()).get('/api/columns').expect(200);
      expect(columnsOf(list)).toMatchObject([{ name: 'Ville', type: 'text' }]);
    });

    it('[R10] répond 404 COLUMN_NOT_FOUND pour une colonne inconnue', async () => {
      const response = await request(api.server())
        .patch(`/api/columns/${MISSING_ID}`)
        .send({ name: 'X' })
        .expect(404);

      expect(bodyOf(response)).toMatchObject({ error: { code: 'COLUMN_NOT_FOUND' } });
    });

    it('[R10] répond 422 pour un identifiant qui n’est pas un UUID', async () => {
      const response = await request(api.server())
        .patch('/api/columns/pas-un-uuid')
        .send({ name: 'X' })
        .expect(422);

      expect(errorFieldsOf(response)).toEqual(['id']);
    });
  });
});
