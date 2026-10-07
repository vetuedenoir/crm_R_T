import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import {
  updateContact,
  type ApiError,
  type CellValue,
  type ColumnId,
  type Contact,
  type ContactId,
} from '../api';

import { withCellValue, withContact, type ContactsData } from './contacts-cache.pure';
import { queryKeys } from './query-keys.pure';

export interface UpdateCellVariables {
  readonly contactId: ContactId;
  readonly columnId: ColumnId;
  // `null` vide la cellule.
  readonly value: CellValue | null;
  // Valeur affichée avant la modification, pour le retour arrière si le serveur refuse.
  readonly previous: CellValue | undefined;
}

// Modification d'une cellule (R4, R6) avec mise à jour optimiste : la grille affiche la nouvelle valeur tout
// de suite, puis la valeur du serveur ; un refus remet l'ancienne. L'échec n'est pas notifié par un toast
// (`inlineError`) : la grille l'affiche dans la cellule (RULES §5).
export function useUpdateCell(): UseMutationResult<Contact, ApiError, UpdateCellVariables> {
  const queryClient = useQueryClient();

  // Atteint toutes les vues en cache (tri, filtres) : le contact peut figurer dans plusieurs.
  function patch(update: (data: ContactsData) => ContactsData): void {
    queryClient.setQueriesData<ContactsData>({ queryKey: queryKeys.allContacts() }, (data) =>
      data === undefined ? data : update(data),
    );
  }

  return useMutation({
    meta: { inlineError: true },
    mutationFn: ({ contactId, columnId, value }) => updateContact(contactId, { [columnId]: value }),
    onMutate: ({ contactId, columnId, value }) => {
      patch((data) => withCellValue(data, contactId, columnId, value));
    },
    onError: (_error, { contactId, columnId, previous }) => {
      patch((data) => withCellValue(data, contactId, columnId, previous));
    },
    onSuccess: (contact) => {
      patch((data) => withContact(data, contact));
    },
  });
}
