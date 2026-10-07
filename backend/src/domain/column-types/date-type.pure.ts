import { err, ok, type Result } from '../../result.js';
import type { IsoDate, ValidationError } from '../cell.js';
import type { ColumnTypeDefinition } from '../column-type-definition.js';

import { compareOrdered, trimSearch } from './compare.pure.js';

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

// Seul point de création d'un `IsoDate` : la chaîne vient d'être validée comme date réelle.
function toIsoDate(value: string): IsoDate {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return value as IsoDate;
}

// `Date` corrige silencieusement les jours impossibles (30 février -> 2 mars) : on relit la date construite.
// `setUTCFullYear` évite que `Date.UTC` interprète les années 0 à 99 comme 1900 à 1999.
function isRealDate(year: number, month: number, day: number): boolean {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return (
    year >= 1 &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function parse(raw: unknown): Result<IsoDate, ValidationError> {
  const parts = typeof raw === 'string' ? ISO_DATE_PATTERN.exec(raw) : null;
  if (parts === null) {
    return err({ message: 'La date doit avoir le format AAAA-MM-JJ' });
  }
  return isRealDate(Number(parts[1]), Number(parts[2]), Number(parts[3]))
    ? ok(toIsoDate(parts[0]))
    : err({ message: "Cette date n'existe pas" });
}

export const DATE_TYPE: ColumnTypeDefinition<'date', IsoDate> = {
  name: 'date',
  storage: 'value_date',
  filterOperators: ['equals', 'before', 'after', 'between', 'isEmpty', 'isNotEmpty'],
  parse,
  // Le format AAAA-MM-JJ à largeur fixe se trie chronologiquement comme du texte.
  compare: compareOrdered,
  serialize: (value) => ({ column: 'value_date', value }),
  // Jamais appelé : aucun opérateur de recherche sur une date.
  normalizeSearch: trimSearch,
};
