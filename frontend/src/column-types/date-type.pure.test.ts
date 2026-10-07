import { describe, expect, it } from 'vitest';

import { DATE_LOGIC } from './date-type.pure';

describe('type date', () => {
  it.each([
    ['2024-06-15', '15/06/2024'],
    ['2024-01-05', '05/01/2024'],
    ['0001-01-01', '01/01/0001'],
  ])('[R16] affiche %j au format local : %j', (value, expected) => {
    expect(DATE_LOGIC.format(value)).toBe(expected);
  });

  it('[R16] affiche telle quelle une valeur qui n’a pas le format ISO', () => {
    expect(DATE_LOGIC.format('hier')).toBe('hier');
  });

  it('[R16] le brouillon reste au format ISO, celui d’un sélecteur de date', () => {
    expect(DATE_LOGIC.toDraft('2024-06-15')).toBe('2024-06-15');
    expect(DATE_LOGIC.toDraft(undefined)).toBe('');
  });

  it('[R16] accepte une date du 29 février d’une année bissextile', () => {
    expect(DATE_LOGIC.parseInput('2024-02-29')).toEqual({ ok: true, value: '2024-02-29' });
  });

  it.each([
    ['2023-02-29', "Cette date n'existe pas"],
    ['2024-04-31', "Cette date n'existe pas"],
    ['2024-13-01', "Cette date n'existe pas"],
    ['15/06/2024', 'La date doit avoir le format AAAA-MM-JJ'],
  ])('[R16] refuse %j', (draft, message) => {
    expect(DATE_LOGIC.validate(draft)).toBe(message);
  });
});
