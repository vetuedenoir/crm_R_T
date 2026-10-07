import { describe, expect, it } from 'vitest';

import { COLUMN_TYPE_NAMES, FILTER_OPERATORS } from '../api';

import { FILTER_OPERATOR_ARITY, isSearchOperator } from './filter-arity.pure';
import { COLUMN_TYPE_UI } from './registry';

describe('arité des opérateurs de filtre', () => {
  it.each([
    ['isEmpty', 0],
    ['isNotEmpty', 0],
    ['equals', 1],
    ['contains', 1],
    ['between', 2],
  ] as const)('[R8] %s attend %i valeur(s)', (operator, arity) => {
    expect(FILTER_OPERATOR_ARITY[operator]).toBe(arity);
  });

  it('[R8] seuls « contient » et « commence par » sont des opérateurs de recherche', () => {
    expect(FILTER_OPERATORS.filter((operator) => isSearchOperator(operator))).toEqual([
      'contains',
      'startsWith',
    ]);
  });
});

describe('registre des types côté interface', () => {
  it.each(COLUMN_TYPE_NAMES)('[R13] le type %s est enregistré sous son propre nom', (type) => {
    expect(COLUMN_TYPE_UI[type].name).toBe(type);
  });

  it.each(COLUMN_TYPE_NAMES)(
    '[R8] le type %s n’annonce que des opérateurs connus, sans doublon, dont le test du vide',
    (type) => {
      const { filterOperators } = COLUMN_TYPE_UI[type];

      expect(new Set(filterOperators).size).toBe(filterOperators.length);
      expect(filterOperators.every((operator) => FILTER_OPERATORS.includes(operator))).toBe(true);
      expect(filterOperators).toContain('isEmpty');
      expect(filterOperators).toContain('isNotEmpty');
    },
  );
});
