import type { ContactsPage } from '../api';

// Offset de la page suivante, ou `undefined` quand tout est chargé. Une page vide arrête aussi le
// chargement : si des contacts disparaissent pendant le défilement, `total` peut dépasser ce qui reste.
export function nextPageOffset(lastPage: ContactsPage): number | undefined {
  const loaded = lastPage.offset + lastPage.items.length;
  return lastPage.items.length > 0 && loaded < lastPage.total ? loaded : undefined;
}
