import { describe, expect, it } from 'vitest';

import { MAX_TEXT_LENGTH, TEXT_LOGIC } from './text-type.pure';

describe('type texte', () => {
  it('[R16] s’aligne à gauche', () => {
    expect(TEXT_LOGIC.alignment).toBe('left');
  });

  it.each([
    ['Alice', 'Alice'],
    ['Société 3', 'Société 3'],
  ])('[R16] affiche %j tel quel', (value, expected) => {
    expect(TEXT_LOGIC.format(value)).toBe(expected);
  });

  it('[R16] le brouillon d’une valeur est cette valeur, celui d’une cellule vide est vide', () => {
    expect(TEXT_LOGIC.toDraft('Alice')).toBe('Alice');
    expect(TEXT_LOGIC.toDraft(undefined)).toBe('');
  });

  it('[R16] retire les espaces autour de la saisie', () => {
    expect(TEXT_LOGIC.parseInput('  Alice  ')).toEqual({ ok: true, value: 'Alice' });
  });

  it('[R16] accepte exactement la longueur maximale et refuse au-delà', () => {
    expect(TEXT_LOGIC.validate('a'.repeat(MAX_TEXT_LENGTH))).toBeNull();
    expect(TEXT_LOGIC.validate('a'.repeat(MAX_TEXT_LENGTH + 1))).toContain('500 caractères');
  });
});
