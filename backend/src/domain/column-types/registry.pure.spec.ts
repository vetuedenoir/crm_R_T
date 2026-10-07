import type { CellValue } from '../cell.js';
import { COLUMN_TYPE_NAMES } from '../column-type-name.js';
import { FILTER_OPERATORS } from '../filter-operator.js';

import { COLUMN_TYPES, parseCellValue, serializeCellValue } from './registry.pure.js';

describe('registre des types de colonnes', () => {
  it.each(COLUMN_TYPE_NAMES)('[R13] le type %s est enregistré sous son propre nom', (type) => {
    expect(COLUMN_TYPES[type].name).toBe(type);
  });

  it.each(COLUMN_TYPE_NAMES)(
    "[R8] le type %s n'annonce que des opérateurs connus, sans doublon",
    (type) => {
      const operators = COLUMN_TYPES[type].filterOperators;
      expect(new Set(operators).size).toBe(operators.length);
      for (const operator of operators) {
        expect(FILTER_OPERATORS).toContain(operator);
      }
    },
  );

  it.each(COLUMN_TYPE_NAMES)('[R8] le type %s permet de tester le vide', (type) => {
    const operators = COLUMN_TYPES[type].filterOperators;
    expect(operators).toContain('isEmpty');
    expect(operators).toContain('isNotEmpty');
  });

  it.each([
    ['text', 'Alice', { type: 'text', value: 'Alice' }],
    ['number', '12,5', { type: 'number', value: 12.5 }],
    ['date', '2024-06-15', { type: 'date', value: '2024-06-15' }],
    ['phone', '06 12 34 56 78', { type: 'phone', value: '0612345678' }],
  ] as const)('[R16] parseCellValue étiquette une valeur %s', (type, raw, attendu) => {
    expect(parseCellValue(type, raw)).toEqual({ ok: true, value: attendu });
  });

  it.each([
    ['text', ''],
    ['number', 'abc'],
    ['date', '2024-02-30'],
    ['phone', '12'],
  ] as const)("[R16] parseCellValue transmet l'erreur du type %s", (type, raw) => {
    const result = parseCellValue(type, raw);
    expect(result.ok).toBe(false);
    expect(result.ok ? '' : result.error.message).not.toBe('');
  });

  it.each([
    ['text', 'Alice'],
    ['number', 12.5],
    ['date', '2024-06-15'],
    ['phone', '+33612345678'],
  ] as const)('[R14] une valeur %s survit à un aller-retour serialize puis parse', (type, raw) => {
    const parsed = parseCellValue(type, raw);
    if (!parsed.ok) {
      throw new Error('valeur de test invalide');
    }
    const stored = serializeCellValue(parsed.value);
    expect(parseCellValue(type, stored.value)).toEqual(parsed);
  });

  it.each([
    [{ type: 'text', value: 'Alice' }, 'value_text'],
    [{ type: 'number', value: 1 }, 'value_number'],
    [{ type: 'phone', value: '0612345678' }, 'value_text'],
  ] as const)('[R13] serializeCellValue range %j dans %s', (cell, column) => {
    const parsed = parseCellValue(cell.type, cell.value);
    expect(parsed.ok ? serializeCellValue(parsed.value).column : null).toBe(column);
  });

  it('[R13] serializeCellValue range une date dans value_date', () => {
    const parsed = parseCellValue('date', '2024-06-15');
    const cell: CellValue | null = parsed.ok ? parsed.value : null;
    expect(cell === null ? null : serializeCellValue(cell)).toEqual({
      column: 'value_date',
      value: '2024-06-15',
    });
  });
});
