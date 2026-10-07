import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import sharedCases from '../../../contract/column-type-cases.json';
import { COLUMN_TYPE_NAMES, FILTER_OPERATORS } from '../api';

import { COLUMN_TYPE_UI } from './registry';

// Jeu de cas commun avec le backend (`shared-cases.pure.spec.ts`) : les deux côtés doivent accepter et refuser
// les mêmes saisies. Le backend reste la source de vérité.
const casesSchema = z.object({
  cells: z.array(
    z.object({
      type: z.enum(COLUMN_TYPE_NAMES),
      input: z.string(),
      stored: z.union([z.string(), z.number(), z.null()]),
    }),
  ),
  filters: z.array(
    z.object({
      type: z.enum(COLUMN_TYPE_NAMES),
      operator: z.enum(FILTER_OPERATORS),
      inputs: z.array(z.string()),
      valid: z.boolean(),
    }),
  ),
});

const { cells, filters } = casesSchema.parse(sharedCases);

describe('test de contrat avec le backend', () => {
  it('le jeu de cas couvre chaque type de colonne', () => {
    for (const type of COLUMN_TYPE_NAMES) {
      expect(cells.some((c) => c.type === type && c.stored !== null)).toBe(true);
      if (type !== 'text') {
        expect(cells.some((c) => c.type === type && c.stored === null)).toBe(true);
      }
      expect(filters.some((f) => f.type === type && f.valid)).toBe(true);
      expect(filters.some((f) => f.type === type && !f.valid)).toBe(true);
    }
  });

  it.each(cells.map((c) => [c.type, c.input, c.stored] as const))(
    '[R16] %s : la saisie %j donne %j (null = refusée)',
    (type, input, stored) => {
      const parsed = COLUMN_TYPE_UI[type].parseInput(input);

      expect(parsed.ok ? parsed.value : null).toBe(stored);
      expect(COLUMN_TYPE_UI[type].validate(input) === null).toBe(stored !== null);
    },
  );

  it.each(filters.map((f) => [f.type, f.operator, f.inputs, f.valid] as const))(
    '[R8] %s %s %j : valide = %s',
    (type, operator, inputs, valid) => {
      expect(COLUMN_TYPE_UI[type].parseFilterValues(operator, inputs).ok).toBe(valid);
    },
  );
});
