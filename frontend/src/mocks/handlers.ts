import { HttpResponse, http } from 'msw';

import { DEFAULT_COLUMNS, MOCK_CONTACTS } from './fixtures';

function intParam(url: URL, name: string, fallback: number): number {
  const value = Number(url.searchParams.get(name));
  return Number.isInteger(value) && url.searchParams.has(name) ? value : fallback;
}

// Partagés par les tests (serveur MSW Node) et le développement (`npm run dev:mock`, service worker).
// Ils respectent le contrat de l'API pour la pagination ; le tri et les filtres ne sont pas simulés.
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
];
