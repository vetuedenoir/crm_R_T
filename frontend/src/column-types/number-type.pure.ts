import { err, ok, type Result } from '../shared';

import { defineColumnType } from './define-column-type.pure';

// Même borne que le backend : au-delà, un `number` JavaScript perd de la précision.
export const MAX_ABSOLUTE_NUMBER = Number.MAX_SAFE_INTEGER;

const DECIMAL_PATTERN = /^-?\d+(?:\.\d+)?$/;

// `maximumFractionDigits` évite l'arrondi à 3 décimales par défaut. L'affichage sépare les milliers
// (espace insécable), pas le brouillon.
const DISPLAY_FORMAT = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 20 });
const DRAFT_FORMAT = new Intl.NumberFormat('fr-FR', {
  maximumFractionDigits: 20,
  useGrouping: false,
});

// Accepte la virgule décimale (saisie française) ; refuse séparateurs de milliers et notation exponentielle.
function parseValue(draft: string): Result<number, string> {
  const candidate = draft.trim().replace(',', '.');
  const value = DECIMAL_PATTERN.test(candidate) ? Number(candidate) : NaN;
  if (!Number.isFinite(value)) {
    return err('Le nombre est invalide');
  }
  if (Math.abs(value) > MAX_ABSOLUTE_NUMBER) {
    return err(
      `Le nombre doit être compris entre -${String(MAX_ABSOLUTE_NUMBER)} et ${String(MAX_ABSOLUTE_NUMBER)}`,
    );
  }
  // -0 et 0 sont la même valeur pour l'utilisateur comme pour `numeric`.
  return ok(value === 0 ? 0 : value);
}

// Un nombre venu de l'API est un `number` ; toute autre valeur s'affiche telle quelle plutôt que de planter.
export const NUMBER_LOGIC = defineColumnType({
  name: 'number',
  alignment: 'right',
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
  format: (value) => (typeof value === 'number' ? DISPLAY_FORMAT.format(value) : value),
  // Sans séparateur de milliers, que `parseValue` refuserait au retour.
  toDraft: (value) => (typeof value === 'number' ? DRAFT_FORMAT.format(value) : value),
  parseValue,
});
