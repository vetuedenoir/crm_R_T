import { err, ok, type Result } from '../shared';

import { defineColumnType } from './define-column-type.pure';

// Mêmes bornes que le backend.
export const MIN_PHONE_DIGITS = 6;
export const MAX_PHONE_DIGITS = 15;

const SEPARATORS_PATTERN = /[\s.\-()]/g;
const NORMALIZED_PATTERN = /^\+?\d+$/;
const FRENCH_NATIONAL_PATTERN = /^0\d{9}$/;
const FRENCH_INTERNATIONAL_PATTERN = /^\+33\d{9}$/;

function parseValue(draft: string): Result<string, string> {
  const normalized = draft.replace(SEPARATORS_PATTERN, '');
  if (!NORMALIZED_PATTERN.test(normalized)) {
    return err('Le numéro ne peut contenir que des chiffres et un « + » initial');
  }
  const digits = normalized.replace('+', '').length;
  return digits >= MIN_PHONE_DIGITS && digits <= MAX_PHONE_DIGITS
    ? ok(normalized)
    : err(
        `Le numéro doit avoir entre ${String(MIN_PHONE_DIGITS)} et ${String(MAX_PHONE_DIGITS)} chiffres`,
      );
}

function inPairs(digits: string): string {
  return digits.replace(/(\d{2})(?=\d)/g, '$1 ');
}

// On ne regroupe que les numéros français, dont le découpage est connu. Les autres, sans bibliothèque de
// numéros internationaux (PLAN §10), restent tels que stockés plutôt que d'être mal découpés.
function formatPhone(value: string | number): string {
  const phone = String(value);
  if (FRENCH_NATIONAL_PATTERN.test(phone)) {
    return inPairs(phone);
  }
  return FRENCH_INTERNATIONAL_PATTERN.test(phone)
    ? `+33 ${phone.slice(3, 4)} ${inPairs(phone.slice(4))}`
    : phone;
}

export const PHONE_LOGIC = defineColumnType({
  name: 'phone',
  alignment: 'left',
  filterOperators: ['contains', 'equals', 'isEmpty', 'isNotEmpty'],
  format: formatPhone,
  toDraft: formatPhone,
  parseValue,
  // Le numéro est stocké sans séparateurs : on cherche sur les chiffres saisis, quel que soit leur format.
  normalizeSearch: (text) => text.replace(/\D/g, ''),
});
