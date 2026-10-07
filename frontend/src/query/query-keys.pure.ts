import type { ContactsView } from '../api';

// Tri et filtres font partie de la clé : changer de vue repart d'une liste neuve depuis la page 1.
export const queryKeys = {
  columns: () => ['columns'] as const,
  contacts: (view: ContactsView) => ['contacts', view] as const,
};
