import type { InfiniteData } from '@tanstack/react-query';

import type { CellValue, ColumnId, Contact, ContactId, ContactsPage } from '../api';

export type ContactsData = InfiniteData<ContactsPage, number>;

// Remplace le contact `contactId` partout où il apparaît. Les pages qui ne le contiennent pas gardent leur
// référence, tout comme `data` si aucune page ne le contient : React ne rend rien de plus.
function mapContact(
  data: ContactsData,
  contactId: ContactId,
  update: (contact: Contact) => Contact,
): ContactsData {
  if (!data.pages.some((page) => page.items.some((contact) => contact.id === contactId))) {
    return data;
  }
  return {
    ...data,
    pages: data.pages.map((page) =>
      page.items.some((contact) => contact.id === contactId)
        ? {
            ...page,
            items: page.items.map((contact) =>
              contact.id === contactId ? update(contact) : contact,
            ),
          }
        : page,
    ),
  };
}

function withoutCell(
  cells: Readonly<Record<string, CellValue>>,
  columnId: ColumnId,
): Readonly<Record<string, CellValue>> {
  return Object.fromEntries(Object.entries(cells).filter(([key]) => key !== columnId));
}

// Mise à jour optimiste (et retour arrière) d'une seule cellule : `null` ou `undefined` la vide.
// Elle ne touche pas aux autres cellules, donc deux modifications en vol ne s'écrasent pas.
export function withCellValue(
  data: ContactsData,
  contactId: ContactId,
  columnId: ColumnId,
  value: CellValue | null | undefined,
): ContactsData {
  return mapContact(data, contactId, (contact) => ({
    ...contact,
    cells:
      value === null || value === undefined
        ? withoutCell(contact.cells, columnId)
        : { ...contact.cells, [columnId]: value },
  }));
}

// Remplace un contact par la version du serveur, qui fait foi (un téléphone y est normalisé, par exemple).
export function withContact(data: ContactsData, contact: Contact): ContactsData {
  return mapContact(data, contact.id, () => contact);
}
