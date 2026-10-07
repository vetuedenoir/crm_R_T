import { describe, expect, it } from 'vitest';

import { PHONE_LOGIC } from './phone-type.pure';

describe('type téléphone', () => {
  it.each([
    ['0612345678', '06 12 34 56 78'],
    ['+33612345678', '+33 6 12 34 56 78'],
    ['+4915112345678', '+4915112345678'],
    ['123456', '123456'],
  ])('[R16] affiche %j de façon lisible : %j', (value, expected) => {
    expect(PHONE_LOGIC.format(value)).toBe(expected);
  });

  it.each(['0612345678', '+33612345678', '+4915112345678'])(
    '[R16] le brouillon de %j se relit à l’identique',
    (stored) => {
      expect(PHONE_LOGIC.parseInput(PHONE_LOGIC.toDraft(stored))).toEqual({
        ok: true,
        value: stored,
      });
    },
  );

  it('[R16] normalise la saisie : séparateurs retirés, « + » initial conservé', () => {
    expect(PHONE_LOGIC.parseInput('+33 (0)6.12-34 56 78')).toEqual({
      ok: true,
      value: '+330612345678',
    });
  });

  it.each([
    ['12345', 'Le numéro doit avoir entre 6 et 15 chiffres'],
    ['1234567890123456', 'Le numéro doit avoir entre 6 et 15 chiffres'],
    ['06 12 ab 56', 'Le numéro ne peut contenir que des chiffres et un « + » initial'],
  ])('[R16] refuse %j', (draft, message) => {
    expect(PHONE_LOGIC.validate(draft)).toBe(message);
  });
});
