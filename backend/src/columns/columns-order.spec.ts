import request from 'supertest';

import { columnsOf, startColumnsApi, type ColumnsApi } from '../testing/columns-api.js';
import { bodyOf, errorFieldsOf } from '../testing/response-body.js';
import { clearTables } from '../testing/test-database.js';

const MISSING_ID = '00000000-0000-4000-8000-000000000099';

describe('API des colonnes : suppression et ordre (PostgreSQL réel)', () => {
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

  describe('DELETE /api/columns/:id', () => {
    it('[R11] supprime la colonne et répond 204', async () => {
      await api.create('A');
      const { id } = await api.create('B');

      await request(api.server()).delete(`/api/columns/${id}`).expect(204);

      expect(await api.names()).toEqual(['A']);
    });

    it('[R11] supprime les cellules de la colonne, pas celles des autres', async () => {
      const kept = await api.create('Gardée');
      const dropped = await api.create('Supprimée');
      await api.dataSource.query('INSERT INTO contacts (id) VALUES ($1)', [MISSING_ID]);
      await api.dataSource.query(
        `INSERT INTO cells (contact_id, column_id, value_text) VALUES ($1, $2, 'a'), ($1, $3, 'b')`,
        [MISSING_ID, kept.id, dropped.id],
      );

      await request(api.server()).delete(`/api/columns/${dropped.id}`).expect(204);

      const cells: ReadonlyArray<{ readonly column_id: string }> = await api.dataSource.query(
        'SELECT column_id FROM cells',
      );
      expect(cells).toEqual([{ column_id: kept.id }]);
    });

    it('[R11][R12] recompacte les positions restantes (0 à N-1, sans trou)', async () => {
      await api.create('A');
      const { id } = await api.create('B');
      await api.create('C');

      await request(api.server()).delete(`/api/columns/${id}`).expect(204);

      const response = await request(api.server()).get('/api/columns').expect(200);
      expect(columnsOf(response)).toMatchObject([
        { name: 'A', position: 0 },
        { name: 'C', position: 1 },
      ]);
    });

    it('[R11] permet de recréer une colonne du même nom après suppression', async () => {
      const { id } = await api.create('Ville');
      await request(api.server()).delete(`/api/columns/${id}`).expect(204);

      expect((await api.create('Ville')).position).toBe(0);
    });

    it('[R11] répond 404 COLUMN_NOT_FOUND pour une colonne déjà supprimée', async () => {
      const { id } = await api.create('A');
      await request(api.server()).delete(`/api/columns/${id}`).expect(204);

      const response = await request(api.server()).delete(`/api/columns/${id}`).expect(404);

      expect(bodyOf(response)).toMatchObject({ error: { code: 'COLUMN_NOT_FOUND' } });
    });

    it('[R11] répond 422 pour un identifiant qui n’est pas un UUID', async () => {
      await request(api.server()).delete('/api/columns/12').expect(422);
    });
  });

  describe('PUT /api/columns/order', () => {
    it('[R12] applique le nouvel ordre et le renvoie', async () => {
      const a = await api.create('A');
      const b = await api.create('B');
      const c = await api.create('C');

      const response = await request(api.server())
        .put('/api/columns/order')
        .send({ ids: [c.id, a.id, b.id] })
        .expect(200);

      expect(columnsOf(response)).toMatchObject([
        { name: 'C', position: 0 },
        { name: 'A', position: 1 },
        { name: 'B', position: 2 },
      ]);
    });

    it('[R12][R14] l’ordre survit à une nouvelle connexion à la base', async () => {
      const a = await api.create('A');
      const b = await api.create('B');
      await request(api.server())
        .put('/api/columns/order')
        .send({ ids: [b.id, a.id] })
        .expect(200);

      // Même effet qu'un redémarrage : plus aucun état en mémoire, on relit tout depuis PostgreSQL.
      await api.dataSource.destroy();
      await api.dataSource.initialize();

      expect(await api.names()).toEqual(['B', 'A']);
    });

    it('[R12] accepte l’ordre actuel (opération idempotente)', async () => {
      const a = await api.create('A');
      const b = await api.create('B');

      await request(api.server())
        .put('/api/columns/order')
        .send({ ids: [a.id, b.id] })
        .expect(200);

      expect(await api.names()).toEqual(['A', 'B']);
    });

    it('[R12] une nouvelle colonne vient après les colonnes réordonnées', async () => {
      const a = await api.create('A');
      const b = await api.create('B');
      await request(api.server())
        .put('/api/columns/order')
        .send({ ids: [b.id, a.id] })
        .expect(200);

      await api.create('C');

      expect(await api.names()).toEqual(['B', 'A', 'C']);
    });

    it('[R12] refuse un identifiant inconnu (404), sans rien modifier', async () => {
      const a = await api.create('A');
      const b = await api.create('B');

      const response = await request(api.server())
        .put('/api/columns/order')
        .send({ ids: [b.id, MISSING_ID, a.id] })
        .expect(404);

      expect(bodyOf(response)).toMatchObject({ error: { code: 'COLUMN_NOT_FOUND' } });
      expect(await api.names()).toEqual(['A', 'B']);
    });

    it('[R12] refuse un doublon (422), sans rien modifier', async () => {
      const a = await api.create('A');
      await api.create('B');

      const response = await request(api.server())
        .put('/api/columns/order')
        .send({ ids: [a.id, a.id] })
        .expect(422);

      expect(errorFieldsOf(response)).toEqual(['ids']);
      expect(await api.names()).toEqual(['A', 'B']);
    });

    it('[R12] refuse une liste incomplète (409), sans rien modifier', async () => {
      const a = await api.create('A');
      await api.create('B');

      const response = await request(api.server())
        .put('/api/columns/order')
        .send({ ids: [a.id] })
        .expect(409);

      expect(bodyOf(response)).toMatchObject({ error: { code: 'CONFLICT' } });
      expect(await api.names()).toEqual(['A', 'B']);
    });

    it.each([
      ['ids absent', {}],
      ['ids qui n’est pas une liste', { ids: 'abc' }],
      ['un élément qui n’est pas du texte', { ids: [1] }],
      ['un élément qui n’est pas un UUID', { ids: ['abc'] }],
    ])('[R12] refuse %s (422)', async (_cas, body) => {
      await api.create('A');

      const response = await request(api.server()).put('/api/columns/order').send(body).expect(422);

      expect(errorFieldsOf(response)).toEqual(['ids']);
    });
  });
});
