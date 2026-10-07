import { describe, expect, it } from 'vitest';

import { COLUMN_TYPE_UI } from './registry';

describe('comportement commun des types de colonnes', () => {
  it.each(['text', 'number', 'date', 'phone'] as const)(
    '[R6] un brouillon vide ou blanc vide la cellule pour le type %s',
    (type) => {
      expect(COLUMN_TYPE_UI[type].parseInput('')).toEqual({ ok: true, value: null });
      expect(COLUMN_TYPE_UI[type].parseInput('   ')).toEqual({ ok: true, value: null });
      expect(COLUMN_TYPE_UI[type].validate('')).toBeNull();
    },
  );

  it('[R16] validate renvoie le message de parseInput, ou null', () => {
    expect(COLUMN_TYPE_UI.number.validate('12')).toBeNull();
    expect(COLUMN_TYPE_UI.number.validate('x')).toBe('Le nombre est invalide');
  });
});

describe('valeurs de filtre', () => {
  it.each([
    ['text', 'contains', ['  ali '], ['ali']],
    ['text', 'equals', ['Alice'], ['Alice']],
    ['number', 'greaterThan', ['12,5'], [12.5]],
    ['number', 'between', ['1', '10'], [1, 10]],
    ['date', 'between', ['2024-01-01', '2024-12-31'], ['2024-01-01', '2024-12-31']],
    ['phone', 'contains', ['06 12'], ['0612']],
    ['phone', 'equals', ['06 12 34 56 78'], ['0612345678']],
    ['number', 'isEmpty', [], []],
  ] as const)('[R8] %s %s %j donne %j', (type, operator, drafts, operands) => {
    expect(COLUMN_TYPE_UI[type].parseFilterValues(operator, drafts)).toEqual({
      ok: true,
      value: operands,
    });
  });

  it.each([
    ['text', 'contains', [''], 'La recherche ne peut pas être vide'],
    ['phone', 'contains', ['abc'], 'La recherche ne peut pas être vide'],
    ['number', 'equals', [''], 'Une valeur est requise'],
    ['number', 'between', ['1'], "L'opérateur « between » attend 2 valeur(s), reçu 1"],
    ['date', 'contains', ['2024'], "L'opérateur « contains » n'existe pas pour le type « date »"],
    ['number', 'greaterThan', ['x'], 'Le nombre est invalide'],
  ] as const)('[R8] refuse %s %s %j : %s', (type, operator, drafts, message) => {
    expect(COLUMN_TYPE_UI[type].parseFilterValues(operator, drafts)).toEqual({
      ok: false,
      error: message,
    });
  });
});
