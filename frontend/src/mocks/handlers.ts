import { HttpResponse, http } from 'msw';
import { z } from 'zod';

import { cellValueSchema, type CellValue } from '../api';

import { DEFAULT_COLUMNS, MOCK_CONTACTS } from './fixtures';

function intParam(url: URL, name: string, fallback: number): number {
  const value = Number(url.searchParams.get(name));
  return Number.isInteger(value) && url.searchParams.has(name) ? value : fallback;
}

const patchBodySchema = z.object({ values: z.record(z.string(), cellValueSchema.nullable()) });

// Applique `PATCH /contacts/:id` : `null` vide la cellule, les colonnes absentes restent inchangées.
function applyValues(
  cells: Readonly<Record<string, CellValue>>,
  values: Readonly<Record<string, CellValue | null>>,
): Record<string, CellValue> {
  const merged = { ...cells, ...values };
  return Object.fromEntries(
    Object.entries(merged).filter((entry): entry is [string, CellValue] => entry[1] !== null),
  );
}

// Partagés par les tests (serveur MSW Node) et le développement (`npm run dev:mock`, service worker).
// Ils respectent le contrat de l'API pour la pagination ; le tri et les filtres ne sont pas simulés.
// Une modification est renvoyée sans être mémorisée : un rechargement redonne les données d'origine.
export const handlers = [
  http.get('*/api/columns', () => HttpResponse.json(DEFAULT_COLUMNS)),

  http.get('*/api/contacts', ({ request }) => {
    const url = new URL(request.url);
    const offset = intParam(url, 'offset', 0);
    const limit = intParam(url, 'limit', 50);
    return HttpResponse.json({
      items: MOCK_CONTACTS.slice(offset, offset + limit),
      total: MOCK_CONTACTS.length,
      offset,
      limit,
    });
  }),

  http.patch('*/api/contacts/:id', async ({ params, request }) => {
    const contact = MOCK_CONTACTS.find((candidate) => candidate.id === params['id']);
    const body = patchBodySchema.safeParse(await request.json());
    if (contact === undefined || !body.success) {
      return new HttpResponse(null, { status: contact === undefined ? 404 : 400 });
    }
    return HttpResponse.json({
      id: contact.id,
      cells: applyValues(contact.cells, body.data.values),
    });
  }),
];
