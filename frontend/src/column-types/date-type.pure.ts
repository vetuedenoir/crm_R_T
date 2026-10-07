import { err, ok, type Result } from '../shared';

import { defineColumnType } from './define-column-type.pure';

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

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

function parseValue(draft: string): Result<string, string> {
  const parts = ISO_DATE_PATTERN.exec(draft);
  if (parts === null) {
    return err('La date doit avoir le format AAAA-MM-JJ');
  }
  return isRealDate(Number(parts[1]), Number(parts[2]), Number(parts[3]))
    ? ok(draft)
    : err("Cette date n'existe pas");
}

// Affichage JJ/MM/AAAA par découpage de la chaîne : passer par `Date` ferait dépendre le jour du fuseau.
// Une valeur qui n'a pas le format ISO s'affiche telle quelle.
function formatDate(value: string | number): string {
  const parts = typeof value === 'string' ? ISO_DATE_PATTERN.exec(value) : null;
  return parts === null
    ? String(value)
    : `${String(parts[3])}/${String(parts[2])}/${String(parts[1])}`;
}

// Le brouillon reste au format ISO : c'est la valeur d'un `<input type="date">`, qui affiche lui-même
// la date dans le format local du navigateur.
export const DATE_LOGIC = defineColumnType({
  name: 'date',
  alignment: 'left',
  filterOperators: ['equals', 'before', 'after', 'between', 'isEmpty', 'isNotEmpty'],
  format: formatDate,
  toDraft: (value) => String(value),
  parseValue,
});
