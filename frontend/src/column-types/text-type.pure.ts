import { err, ok } from '../shared';

import { defineColumnType } from './define-column-type.pure';

// Même limite que le backend : la refuser ici évite un aller-retour pour un 422 prévisible.
export const MAX_TEXT_LENGTH = 500;

export const TEXT_LOGIC = defineColumnType({
  name: 'text',
  alignment: 'left',
  filterOperators: ['contains', 'equals', 'startsWith', 'isEmpty', 'isNotEmpty'],
  format: (value) => String(value),
  toDraft: (value) => String(value),
  parseValue: (draft) => {
    const value = draft.trim();
    return value.length > MAX_TEXT_LENGTH
      ? err(`Le texte ne peut pas dépasser ${String(MAX_TEXT_LENGTH)} caractères`)
      : ok(value);
  },
});
