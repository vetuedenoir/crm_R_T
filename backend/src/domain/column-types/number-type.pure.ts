import { err, ok, type Result } from '../../result.js';
import type { ValidationError } from '../cell.js';
import type { ColumnTypeDefinition } from '../column-type-definition.js';

import { compareOrdered, trimSearch } from './compare.pure.js';

// Au-delà, un `number` JavaScript perd de la précision alors que `numeric` en base n'en perd pas.
export const MAX_ABSOLUTE_NUMBER = Number.MAX_SAFE_INTEGER;

const DECIMAL_PATTERN = /^-?\d+(?:\.\d+)?$/;

// Accepte la virgule décimale (saisie française) ; refuse séparateurs de milliers et notation exponentielle.
function toNumber(raw: unknown): number {
  if (typeof raw === 'number') {
    return raw;
  }
  if (typeof raw !== 'string') {
    return NaN;
  }
  const candidate = raw.trim().replace(',', '.');
  return DECIMAL_PATTERN.test(candidate) ? Number(candidate) : NaN;
}

function parse(raw: unknown): Result<number, ValidationError> {
  const value = toNumber(raw);
  if (!Number.isFinite(value)) {
    return err({ message: 'Le nombre est invalide' });
  }
  if (Math.abs(value) > MAX_ABSOLUTE_NUMBER) {
    return err({
      message: `Le nombre doit être compris entre -${String(MAX_ABSOLUTE_NUMBER)} et ${String(MAX_ABSOLUTE_NUMBER)}`,
    });
  }
  // -0 et 0 sont la même valeur pour l'utilisateur comme pour `numeric`.
  return ok(value === 0 ? 0 : value);
}

export const NUMBER_TYPE: ColumnTypeDefinition<'number', number> = {
  name: 'number',
  storage: 'value_number',
  filterOperators: [
    'equals',
    'notEquals',
    'greaterThan',
    'greaterThanOrEqual',
    'lessThan',
    'lessThanOrEqual',
    'between',
    'isEmpty',
    'isNotEmpty',
  ],
  parse,
  compare: compareOrdered,
  serialize: (value) => ({ column: 'value_number', value }),
  // Jamais appelé : aucun opérateur de recherche sur un nombre.
  normalizeSearch: trimSearch,
};
