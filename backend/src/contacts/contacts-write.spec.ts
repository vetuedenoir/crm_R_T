import request from 'supertest';

import { contactOf, pageOf, startContactsApi, type ContactsApi } from '../testing/contacts-api.js';
import { bodyOf, errorFieldsOf } from '../testing/response-body.js';
import { clearTables } from '../testing/test-database.js';

const MISSING_ID = '00000000-0000-4000-8000-000000000099';

describe('API des contacts : création, modification, suppression (PostgreSQL réel)', () => {
  let api: ContactsApi;
  let name: string;
  let score: string;
  let date: string;
  let phone: string;

  beforeAll(async () => {
    api = await startContactsApi();
  });

  beforeEach(async () => {
    await clearTables(api.dataSource);
    name = (await api.createColumn('Nom', 'text')).id;
    score = (await api.createColumn('Score', 'number')).id;
    date = (await api.createColumn('Date', 'date')).id;
    phone = (await api.createColumn('Téléphone', 'phone')).id;
  });

  afterAll(async () => {
    await clearTables(api.dataSource);
    await api.app.close();
  });

  function cellRows(contactId: string): Promise<ReadonlyArray<unknown>> {
    return api.dataSource.query('SELECT column_id FROM cells WHERE contact_id = $1', [contactId]);
  }

  describe('POST /api/contacts', () => {
    it('[R3] crée un contact vide quand aucune valeur n’est fournie', async () => {
      const response = await request(api.server()).post('/api/contacts').send({}).expect(201);

      expect(contactOf(response).cells).toEqual({});
    });

    it('[R3][R16] crée un contact avec des valeurs validées et normalisées par type', async () => {
      const created = await api.createContact({
        [name]: '  Ada Lovelace ',
        [score]: '12,5',
        [date]: '2024-02-29',
        [phone]: '06 12 34 56 78',
      });

      expect(created.cells).toEqual({
        [name]: 'Ada Lovelace',
        [score]: 12.5,
        [date]: '2024-02-29',
        [phone]: '0612345678',
      });
    });

    it('[R3][R14] le contact créé est relu par GET /contacts', async () => {
      const created = await api.createContact({ [name]: 'Ada' });

      const page = pageOf(await api.list().expect(200));

      expect(page).toMatchObject({ total: 1, items: [created] });
    });

    it('[R3] ignore une valeur null : pas de cellule', async () => {
      const created = await api.createContact({ [name]: 'Ada', [score]: null });

      expect(created.cells).toEqual({ [name]: 'Ada' });
      expect(await cellRows(created.id)).toHaveLength(1);
    });

    it('[R16] refuse les valeurs invalides avec un détail par colonne, et n’écrit rien', async () => {
      const response = await request(api.server())
        .post('/api/contacts')
        .send({ values: { [name]: 'Ada', [score]: 'abc', [date]: '2023-02-30', [phone]: '12' } })
        .expect(422);

      expect(bodyOf(response)).toMatchObject({ error: { code: 'VALIDATION_FAILED' } });
      expect(errorFieldsOf(response)).toEqual([score, date, phone]);
      expect(await api.dataSource.query('SELECT 1 FROM contacts')).toHaveLength(0);
    });

    it('[R16] refuse une colonne inconnue avec un 404 COLUMN_NOT_FOUND', async () => {
      const response = await request(api.server())
        .post('/api/contacts')
        .send({ values: { [MISSING_ID]: 'x' } })
        .expect(404);

      expect(bodyOf(response)).toMatchObject({ error: { code: 'COLUMN_NOT_FOUND' } });
      expect(await api.dataSource.query('SELECT 1 FROM contacts')).toHaveLength(0);
    });

    it.each([
      ['values qui n’est pas un objet', { values: 'x' }],
      ['values qui est une liste', { values: [] }],
      ['un champ inconnu', { values: {}, extra: 1 }],
    ])('refuse %s avec un 422', async (_label, body) => {
      await request(api.server()).post('/api/contacts').send(body).expect(422);
    });
  });

  describe('PATCH /api/contacts/:id', () => {
    it('[R4][R6] modifie une cellule sans toucher aux autres', async () => {
      const created = await api.createContact({ [name]: 'Ada', [score]: 10 });

      const response = await request(api.server())
        .patch(`/api/contacts/${created.id}`)
        .send({ values: { [score]: 11 } })
        .expect(200);

      expect(contactOf(response).cells).toEqual({ [name]: 'Ada', [score]: 11 });
    });

    it('[R4][R14] la modification est relue par GET /contacts', async () => {
      const created = await api.createContact({ [name]: 'Ada' });
      await request(api.server())
        .patch(`/api/contacts/${created.id}`)
        .send({ values: { [name]: 'Grace' } })
        .expect(200);

      const page = pageOf(await api.list().expect(200));

      expect(page.items[0]?.cells[name]).toBe('Grace');
    });

    it('[R4] ajoute une cellule jusque-là vide', async () => {
      const created = await api.createContact({ [name]: 'Ada' });

      const response = await request(api.server())
        .patch(`/api/contacts/${created.id}`)
        .send({ values: { [phone]: '+33 6 12 34 56 78' } })
        .expect(200);

      expect(contactOf(response).cells).toEqual({ [name]: 'Ada', [phone]: '+33612345678' });
    });

    it('[R4] une valeur null supprime la cellule : cellule vide = pas de ligne', async () => {
      const created = await api.createContact({ [name]: 'Ada', [score]: 10 });

      const response = await request(api.server())
        .patch(`/api/contacts/${created.id}`)
        .send({ values: { [score]: null } })
        .expect(200);

      expect(contactOf(response).cells).toEqual({ [name]: 'Ada' });
      expect(await cellRows(created.id)).toHaveLength(1);
    });

    it('[R4] met à jour `updated_at`', async () => {
      const created = await api.createContact({ [name]: 'Ada' });
      await api.dataSource.query(`UPDATE contacts SET updated_at = '2000-01-01' WHERE id = $1`, [
        created.id,
      ]);

      await request(api.server())
        .patch(`/api/contacts/${created.id}`)
        .send({ values: { [name]: 'Grace' } })
        .expect(200);

      const [row]: ReadonlyArray<{ readonly recent: boolean }> = await api.dataSource.query(
        `SELECT updated_at > '2000-01-02' AS recent FROM contacts WHERE id = $1`,
        [created.id],
      );
      expect(row?.recent).toBe(true);
    });

    it('[R16] une valeur invalide est refusée par colonne, sans écrire les valeurs valides', async () => {
      const created = await api.createContact({ [name]: 'Ada' });

      const response = await request(api.server())
        .patch(`/api/contacts/${created.id}`)
        .send({ values: { [name]: 'Grace', [score]: 'abc' } })
        .expect(422);

      expect(errorFieldsOf(response)).toEqual([score]);
      const page = pageOf(await api.list().expect(200));
      expect(page.items[0]?.cells[name]).toBe('Ada');
    });

    it('[R16] une chaîne vide n’est pas une façon de vider une cellule', async () => {
      const created = await api.createContact({ [name]: 'Ada' });

      await request(api.server())
        .patch(`/api/contacts/${created.id}`)
        .send({ values: { [name]: '' } })
        .expect(422);
    });

    it('[R16] une colonne inconnue donne un 404 COLUMN_NOT_FOUND', async () => {
      const created = await api.createContact();

      const response = await request(api.server())
        .patch(`/api/contacts/${created.id}`)
        .send({ values: { [MISSING_ID]: 'x' } })
        .expect(404);

      expect(bodyOf(response)).toMatchObject({ error: { code: 'COLUMN_NOT_FOUND' } });
    });

    it('un contact introuvable donne un 404 CONTACT_NOT_FOUND', async () => {
      const response = await request(api.server())
        .patch(`/api/contacts/${MISSING_ID}`)
        .send({ values: { [name]: 'x' } })
        .expect(404);

      expect(bodyOf(response)).toMatchObject({ error: { code: 'CONTACT_NOT_FOUND' } });
    });

    it.each([
      ['un id qui n’est pas un UUID', 'abc', { values: {} }],
      ['des valeurs absentes', MISSING_ID, {}],
    ])('refuse %s avec un 422', async (_label, id, body) => {
      await request(api.server()).patch(`/api/contacts/${id}`).send(body).expect(422);
    });
  });

  describe('DELETE /api/contacts/:id', () => {
    it('[R5] supprime le contact et ses cellules', async () => {
      const created = await api.createContact({ [name]: 'Ada', [score]: 1 });

      await request(api.server()).delete(`/api/contacts/${created.id}`).expect(204);

      expect(pageOf(await api.list().expect(200))).toMatchObject({ total: 0, items: [] });
      expect(await cellRows(created.id)).toHaveLength(0);
    });

    it('[R5] ne supprime que le contact visé', async () => {
      const kept = await api.createContact({ [name]: 'Ada' });
      const removed = await api.createContact({ [name]: 'Grace' });

      await request(api.server()).delete(`/api/contacts/${removed.id}`).expect(204);

      expect(pageOf(await api.list().expect(200)).items).toEqual([kept]);
    });

    it('un contact introuvable donne un 404 CONTACT_NOT_FOUND', async () => {
      const response = await request(api.server())
        .delete(`/api/contacts/${MISSING_ID}`)
        .expect(404);

      expect(bodyOf(response)).toMatchObject({ error: { code: 'CONTACT_NOT_FOUND' } });
    });

    it('refuse un id qui n’est pas un UUID avec un 422', async () => {
      await request(api.server()).delete('/api/contacts/abc').expect(422);
    });
  });

  describe('colonnes supprimées [R11]', () => {
    it('[R11] supprimer une colonne retire ses cellules, et la liste (tri, filtre) reste utilisable', async () => {
      const created = await api.createContact({ [name]: 'Ada', [score]: 10 });
      await request(api.server()).delete(`/api/columns/${score}`).expect(204);

      const page = pageOf(await api.list().expect(200));
      const stale = await api.list({ sort: `${score}:asc` }).expect(400);

      expect(page.items).toEqual([{ id: created.id, cells: { [name]: 'Ada' } }]);
      expect(bodyOf(stale)).toMatchObject({ error: { code: 'INVALID_SORT' } });
      expect(await cellRows(created.id)).toHaveLength(1);
    });
  });
});
