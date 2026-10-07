import { parseColumnId } from '../ids.pure.js';
import { columnId } from '../testing/factories.js';

import { planCellWrites } from './plan-cell-writes.pure.js';

const TEXT = columnId(1);
const NUMBER = columnId(2);
const DATE = columnId(3);
const PHONE = columnId(4);

const COLUMNS = [
  { id: TEXT, type: 'text' },
  { id: NUMBER, type: 'number' },
  { id: DATE, type: 'date' },
  { id: PHONE, type: 'phone' },
] as const;

describe('planCellWrites', () => {
  it('[R16] valide et normalise chaque valeur selon le type de sa colonne', () => {
    const plan = planCellWrites(
      { [TEXT]: '  Ada  ', [NUMBER]: '12,5', [DATE]: '2024-02-29', [PHONE]: '06 12 34 56 78' },
      COLUMNS,
    );

    expect(plan).toEqual({
      ok: true,
      value: {
        clears: [],
        upserts: [
          { columnId: TEXT, stored: { column: 'value_text', value: 'Ada' } },
          { columnId: NUMBER, stored: { column: 'value_number', value: 12.5 } },
          { columnId: DATE, stored: { column: 'value_date', value: '2024-02-29' } },
          { columnId: PHONE, stored: { column: 'value_text', value: '0612345678' } },
        ],
      },
    });
  });

  it('[R4] une valeur null vide la cellule', () => {
    expect(planCellWrites({ [TEXT]: null, [NUMBER]: 3 }, COLUMNS)).toEqual({
      ok: true,
      value: {
        clears: [TEXT],
        upserts: [{ columnId: NUMBER, stored: { column: 'value_number', value: 3 } }],
      },
    });
  });

  it('ne fait rien pour un corps vide', () => {
    expect(planCellWrites({}, COLUMNS)).toEqual({ ok: true, value: { upserts: [], clears: [] } });
  });

  it('[R16] rapporte toutes les valeurs invalides, une erreur par cellule', () => {
    const plan = planCellWrites({ [TEXT]: '', [NUMBER]: 'abc', [DATE]: '2023-02-30' }, COLUMNS);

    expect(plan.ok).toBe(false);
    expect(!plan.ok && plan.error.map((error) => [error.kind, error.field])).toEqual([
      ['INVALID_VALUE', TEXT],
      ['INVALID_VALUE', NUMBER],
      ['INVALID_VALUE', DATE],
    ]);
  });

  it('distingue une colonne inconnue d’une valeur invalide', () => {
    const unknown = columnId(99);

    const plan = planCellWrites({ [unknown]: 'x', [NUMBER]: 'abc' }, COLUMNS);

    expect(!plan.ok && plan.error.map((error) => [error.kind, error.field])).toEqual([
      ['UNKNOWN_COLUMN', unknown],
      ['INVALID_VALUE', NUMBER],
    ]);
  });

  it.each(['abc', '__proto__', ''])('refuse la clé « %s » qui n’est pas un UUID', (key) => {
    // Une clé calculée crée une propriété propre, y compris pour `__proto__` (comme `JSON.parse`).
    const plan = planCellWrites({ [key]: 'x' }, COLUMNS);

    expect(!plan.ok && plan.error).toEqual([
      { kind: 'INVALID_VALUE', field: key, message: "l'identifiant doit être un UUID" },
    ]);
  });

  it('refuse deux clés qui désignent la même colonne', () => {
    // Les chiffres seuls n'ont pas de casse : il faut un UUID contenant des lettres hexadécimales.
    const lower = '0000000a-0000-4000-8000-00000000000b';
    const parsed = parseColumnId(lower);
    if (!parsed.ok) {
      throw new Error(parsed.error);
    }

    const plan = planCellWrites({ [lower]: 'a', [lower.toUpperCase()]: 'b' }, [
      { id: parsed.value, type: 'text' },
    ]);

    expect(!plan.ok && plan.error).toEqual([
      { kind: 'INVALID_VALUE', field: lower.toUpperCase(), message: 'Colonne en double' },
    ]);
  });
});
