import { type ContactsView } from './contacts-view';

export const API_PREFIX = '/api';

// `origin` est passé en paramètre : cette fonction ne lit ni `window` ni l'environnement.
export function buildApiUrl(origin: string, path: string, search?: URLSearchParams): string {
  const query = search === undefined || search.size === 0 ? '' : `?${search.toString()}`;
  return `${origin}${API_PREFIX}${path}${query}`;
}

// Paramètres de `GET /contacts` (voir `ListContactsQueryDto`). Un tri ou des filtres vides sont omis.
export function contactsSearchParams(
  view: ContactsView,
  offset: number,
  limit: number,
): URLSearchParams {
  const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  if (view.sort !== null) {
    params.set('sort', `${view.sort.columnId}:${view.sort.direction}`);
  }
  if (view.filters.length > 0) {
    params.set('filters', JSON.stringify(view.filters));
  }
  return params;
}
