import { err, ok, type Result } from '../../result.js';
import type { PhoneNumber, ValidationError } from '../cell.js';
import type { ColumnTypeDefinition } from '../column-type-definition.js';

import { compareOrdered } from './compare.pure.js';

export const MIN_PHONE_DIGITS = 6;
export const MAX_PHONE_DIGITS = 15;

const SEPARATORS_PATTERN = /[\s.\-()]/g;
const NORMALIZED_PATTERN = /^\+?\d+$/;

// Seul point de création d'un `PhoneNumber` : la chaîne vient d'être normalisée et validée.
function toPhoneNumber(value: string): PhoneNumber {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return value as PhoneNumber;
}

function parse(raw: unknown): Result<PhoneNumber, ValidationError> {
  if (typeof raw !== 'string') {
    return err({ message: 'Le numéro de téléphone doit être une chaîne de caractères' });
  }
  const normalized = raw.replace(SEPARATORS_PATTERN, '');
  if (!NORMALIZED_PATTERN.test(normalized)) {
    return err({ message: 'Le numéro ne peut contenir que des chiffres et un « + » initial' });
  }
  const digits = normalized.replace('+', '').length;
  return digits >= MIN_PHONE_DIGITS && digits <= MAX_PHONE_DIGITS
    ? ok(toPhoneNumber(normalized))
    : err({
        message: `Le numéro doit avoir entre ${String(MIN_PHONE_DIGITS)} et ${String(MAX_PHONE_DIGITS)} chiffres`,
      });
}

export const PHONE_TYPE: ColumnTypeDefinition<'phone', PhoneNumber> = {
  name: 'phone',
  storage: 'value_text',
  filterOperators: ['contains', 'equals', 'isEmpty', 'isNotEmpty'],
  parse,
  compare: compareOrdered,
  serialize: (value) => ({ column: 'value_text', value }),
  // Le numéro est stocké sans séparateurs : on cherche sur les chiffres saisis, quel que soit leur format.
  normalizeSearch: (text) => text.replace(/\D/g, ''),
};
