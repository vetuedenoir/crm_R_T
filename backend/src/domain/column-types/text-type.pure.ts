import { err, ok, type Result } from '../../result.js';
import type { ValidationError } from '../cell.js';
import type { ColumnTypeDefinition } from '../column-type-definition.js';

import { compareOrdered, trimSearch } from './compare.pure.js';

export const MAX_TEXT_LENGTH = 500;

// Une cellule vide n'a pas de ligne en base : une chaîne vide n'est donc jamais une valeur.
function parse(raw: unknown): Result<string, ValidationError> {
  if (typeof raw !== 'string') {
    return err({ message: 'Le texte doit être une chaîne de caractères' });
  }
  const value = raw.trim();
  if (value === '') {
    return err({ message: 'Le texte ne peut pas être vide' });
  }
  return value.length > MAX_TEXT_LENGTH
    ? err({ message: `Le texte ne peut pas dépasser ${String(MAX_TEXT_LENGTH)} caractères` })
    : ok(value);
}

export const TEXT_TYPE: ColumnTypeDefinition<'text', string> = {
  name: 'text',
  storage: 'value_text',
  filterOperators: ['contains', 'equals', 'startsWith', 'isEmpty', 'isNotEmpty'],
  parse,
  // Insensible à la casse, comme l'index `lower(value_text)` utilisé par le tri SQL.
  compare: (a, b) => compareOrdered(a.toLowerCase(), b.toLowerCase()),
  serialize: (value) => ({ column: 'value_text', value }),
  normalizeSearch: trimSearch,
};
