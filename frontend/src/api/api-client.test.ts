import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '../mocks/server';
import { errorBody } from '../test/error-body';

import { apiRequest } from './api-client';
import {
  NetworkError,
  NotFoundError,
  ServerError,
  UnexpectedResponseError,
  ValidationApiError,
} from './api-errors';
import { fetchColumns } from './columns-api';
import { fetchContactsPage } from './contacts-api';
import { EMPTY_CONTACTS_VIEW } from './contacts-view';
import { columnsSchema } from './schemas';

async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error: unknown) {
    return error;
  }
  throw new Error('La promesse aurait dû être rejetée');
}

describe('apiRequest', () => {
  it('retourne les colonnes de l’API, typées par leur schéma', async () => {
    const columns = await fetchColumns();

    expect(columns.map((column) => column.name)).toEqual([
      'Nom',
      'Entreprise',
      'Téléphone',
      'Date',
      'Score',
    ]);
  });

  it('demande la page à l’offset indiqué', async () => {
    const page = await fetchContactsPage(EMPTY_CONTACTS_VIEW, 100);

    expect(page).toMatchObject({ offset: 100, limit: 50, total: 120 });
    expect(page.items).toHaveLength(20);
  });

  it('transforme un 404 en NotFoundError', async () => {
    server.use(
      http.get('*/api/columns', () =>
        HttpResponse.json(errorBody('NOT_FOUND', 'Introuvable'), { status: 404 }),
      ),
    );

    expect(await rejectionOf(fetchColumns())).toBeInstanceOf(NotFoundError);
  });

  it('transforme un 422 en ValidationApiError avec le détail par champ', async () => {
    server.use(
      http.get('*/api/columns', () =>
        HttpResponse.json(
          errorBody('VALIDATION_FAILED', 'Valeur invalide', [
            { field: 'c1', message: 'Pas un nombre' },
          ]),
          { status: 422 },
        ),
      ),
    );

    const error = await rejectionOf(fetchColumns());

    expect(error).toBeInstanceOf(ValidationApiError);
    expect(error).toMatchObject({ details: [{ field: 'c1', message: 'Pas un nombre' }] });
  });

  it('transforme une page HTML 502 (proxy) en ServerError', async () => {
    server.use(
      http.get(
        '*/api/columns',
        () => new HttpResponse('<html>Bad Gateway</html>', { status: 502 }),
      ),
    );

    const error = await rejectionOf(fetchColumns());

    expect(error).toBeInstanceOf(ServerError);
    expect(error).toMatchObject({ status: 502 });
  });

  it('transforme une coupure réseau en NetworkError', async () => {
    server.use(http.get('*/api/columns', () => HttpResponse.error()));

    expect(await rejectionOf(fetchColumns())).toBeInstanceOf(NetworkError);
  });

  it.each([
    ['une forme inattendue', { not: 'a list' }],
    [
      'une colonne au type inconnu',
      [{ id: '00000000-0000-4000-8000-000000000001', name: 'X', type: 'color', position: 0 }],
    ],
    ['un identifiant invalide', [{ id: 'pas-un-uuid', name: 'X', type: 'text', position: 0 }]],
  ])('rejette une réponse 200 avec %s au lieu de la laisser circuler', async (_label, body) => {
    server.use(http.get('*/api/columns', () => HttpResponse.json(body)));

    const error = await rejectionOf(apiRequest('/columns', columnsSchema));

    expect(error).toBeInstanceOf(UnexpectedResponseError);
  });

  it('rejette une réponse 200 qui n’est pas du JSON', async () => {
    server.use(http.get('*/api/columns', () => new HttpResponse('pas du json', { status: 200 })));

    expect(await rejectionOf(fetchColumns())).toBeInstanceOf(UnexpectedResponseError);
  });
});
