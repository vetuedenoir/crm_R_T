import { describe, expect, it } from 'vitest';

import { NUMBER_LOGIC } from './number-type.pure';

describe('type nombre', () => {
  it('[R16] s’aligne à droite', () => {
    expect(NUMBER_LOGIC.alignment).toBe('right');
  });

  it.each([
    [87, '87'],
    [12.5, '12,5'],
    [-3, '-3'],
    [0.30000000000000004, '0,30000000000000004'],
    [1234567.5, '1 234 567,5'],
  ])('[R16] affiche %j en format français : %j', (value, expected) => {
    expect(NUMBER_LOGIC.format(value)).toBe(expected);
  });

  it('[R16] affiche telle quelle une valeur qui n’est pas un nombre', () => {
    expect(NUMBER_LOGIC.format('n/a')).toBe('n/a');
  });

  it.each([
    [12.5, '12,5'],
    [1234567.5, '1234567,5'],
    [1e-7, '0,0000001'],
    [undefined, ''],
  ])('[R16] le brouillon de %j est %j, sans séparateur de milliers', (value, expected) => {
    expect(NUMBER_LOGIC.toDraft(value)).toBe(expected);
  });

  it.each([12.5, 1234567.5, 1e-7, -0.5, 9007199254740991])(
    '[R16] le brouillon de %j se relit à l’identique',
    (value) => {
      expect(NUMBER_LOGIC.parseInput(NUMBER_LOGIC.toDraft(value))).toEqual({ ok: true, value });
    },
  );

  it.each([
    ['9', 9],
    ['10', 10],
    ['12,5', 12.5],
    ['-0', 0],
  ])('[R7] la saisie %j devient le nombre %j, comparable numériquement', (draft, expected) => {
    expect(NUMBER_LOGIC.parseInput(draft)).toEqual({ ok: true, value: expected });
  });

  it('[R16] refuse un nombre au-delà de la précision de JavaScript', () => {
    expect(NUMBER_LOGIC.validate('9007199254740992')).toContain('compris entre');
  });

  it('[R16] refuse une saisie qui n’est pas un nombre', () => {
    expect(NUMBER_LOGIC.validate('abc')).toBe('Le nombre est invalide');
  });
});
