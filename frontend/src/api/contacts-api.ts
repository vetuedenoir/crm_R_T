import { apiRequest } from './api-client';
import type { ContactsView } from './contacts-view';
import {
  contactSchema,
  contactsPageSchema,
  type CellValue,
  type Contact,
  type ContactId,
  type ContactsPage,
} from './schemas';
import { contactsSearchParams } from './url.pure';

export const PAGE_SIZE = 50;

export function fetchContactsPage(
  view: ContactsView,
  offset: number,
  signal?: AbortSignal,
): Promise<ContactsPage> {
  return apiRequest('/contacts', contactsPageSchema, {
    search: contactsSearchParams(view, offset, PAGE_SIZE),
    ...(signal === undefined ? {} : { signal }),
  });
}

// Valeurs à écrire, par id de colonne : `null` vide la cellule, une colonne absente est inchangée.
export type CellUpdates = Readonly<Record<string, CellValue | null>>;

// Le serveur renvoie le contact complet, valeurs normalisées : c'est lui qui fait foi (R4, R6).
export function updateContact(contactId: ContactId, values: CellUpdates): Promise<Contact> {
  return apiRequest(`/contacts/${contactId}`, contactSchema, {
    method: 'PATCH',
    body: { values },
  });
}
