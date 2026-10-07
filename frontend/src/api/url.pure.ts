import { type ContactsView } from './contacts-view';

export const API_PREFIX = '/api';

// `origin` est passé en paramètre : cette fonction ne lit ni `window` ni l'environnement.
export function buildApiUrl(origin: string, path: string, search?: URLSearchParams): string {
  const query = search === undefined || search.size === 0 ? '' : `?${search.toString()}`;
  return `${origin}${API_PREFIX}${path}${query}`;
}

// Tri et filtres d'une vue, au format de `GET /contacts` (voir `ListContactsQueryDto`). Un tri ou des filtres
// vides sont omis. L'URL de la page reprend ce format : une vue partagée est lisible par l'API telle quelle.
export function viewSearchParams(view: ContactsView): URLSearchParams {
  const params = new URLSearchParams();
  if (view.sort !== null) {
    params.set('sort', `${view.sort.columnId}:${view.sort.direction}`);
  }
  if (view.filters.length > 0) {
    params.set('filters', JSON.stringify(view.filters));
  }
  return params;
}

export function contactsSearchParams(
  view: ContactsView,
  offset: number,
  limit: number,
): URLSearchParams {
  const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  for (const [name, value] of viewSearchParams(view)) {
    params.set(name, value);
  }
  return params;
}
