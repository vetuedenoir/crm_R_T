import { apiRequest } from './api-client';
import type { ContactsView } from './contacts-view';
import { contactsPageSchema, type ContactsPage } from './schemas';
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
