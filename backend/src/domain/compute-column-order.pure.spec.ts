import { errorOf } from '../testing/error-of.js';
import { columnId } from '../testing/factories.js';

import { computeColumnOrder } from './compute-column-order.pure.js';

const [A, B, C] = [columnId(1), columnId(2), columnId(3)];

describe('computeColumnOrder', () => {
  it.each([
    ['conserve un ordre inchangé', [A, B, C], [A, B, C]],
    ['inverse les colonnes', [C, B, A], [A, B, C]],
    ['déplace une colonne en tête', [B, C, A], [A, B, C]],
    ['accepte une seule colonne', [A], [A]],
    ['accepte aucune colonne', [], []],
  ])('[R12] %s', (_cas, ordered, existing) => {
    expect(computeColumnOrder(ordered, existing)).toEqual({
      ok: true,
      value: ordered.map((id, position) => ({ id, position })),
    });
  });

  it('[R12] numérote de 0 à N-1 sans trou', () => {
    const result = computeColumnOrder([C, A, B], [A, B, C]);
    expect(result.ok ? result.value.map((column) => column.position) : []).toEqual([0, 1, 2]);
  });

  it.each([
    ['un identifiant inconnu', [A, columnId(99), B], 'UNKNOWN_COLUMN', columnId(99)],
    ['un doublon', [A, B, A, C], 'DUPLICATE_COLUMN', A],
    ['une colonne oubliée', [A, C], 'MISSING_COLUMN', B],
  ] as const)('[R12] refuse %s', (_cas, ordered, kind, concerned) => {
    const error = errorOf(computeColumnOrder(ordered, [A, B, C]));
    expect(error).toMatchObject({ kind, columnId: concerned });
    expect(error.message).toContain(concerned);
  });

  it("[R12] signale l'identifiant inconnu avant la colonne oubliée", () => {
    const result = computeColumnOrder([A, columnId(99)], [A, B]);
    expect(result).toMatchObject({ ok: false, error: { kind: 'UNKNOWN_COLUMN' } });
  });

  it("[R12] refuse tout ordre quand il n'existe aucune colonne", () => {
    expect(computeColumnOrder([A], [])).toMatchObject({
      ok: false,
      error: { kind: 'UNKNOWN_COLUMN' },
    });
  });

  it('[R12] ne modifie pas ses arguments', () => {
    const ordered = Object.freeze([C, A, B]);
    const existing = Object.freeze([A, B, C]);
    expect(computeColumnOrder(ordered, existing).ok).toBe(true);
    expect(ordered).toEqual([C, A, B]);
  });
});
