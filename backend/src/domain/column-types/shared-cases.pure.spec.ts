import { readFileSync } from 'node:fs';

import { parseColumnId } from '../../ids.pure.js';
import { COLUMN_TYPE_NAMES, type ColumnTypeName } from '../column-type-name.js';
import { resolveFilter } from '../filter-clause.pure.js';
import { FILTER_OPERATORS, type FilterOperator } from '../filter-operator.js';

import { parseCellValue, serializeCellValue } from './registry.pure.js';

// Jeu de cas commun avec le frontend (`ColumnTypeUi`) : le back reste la source de vérité, le front
// doit accepter et refuser les mêmes saisies.
const CASES_URL = new URL('../../../../contract/column-type-cases.json', import.meta.url);

interface CellCase {
  readonly type: ColumnTypeName;
  readonly input: string;
  readonly stored: string | number | null;
}

interface FilterCase {
  readonly type: ColumnTypeName;
  readonly operator: FilterOperator;
  readonly inputs: ReadonlyArray<string>;
  readonly valid: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isTypeName(value: unknown): value is ColumnTypeName {
  return COLUMN_TYPE_NAMES.some((name) => name === value);
}

function isOperator(value: unknown): value is FilterOperator {
  return FILTER_OPERATORS.some((operator) => operator === value);
}

function toCellCase(raw: unknown): CellCase {
  if (
    !isRecord(raw) ||
    !isTypeName(raw['type']) ||
    typeof raw['input'] !== 'string' ||
    !(
      raw['stored'] === null ||
      typeof raw['stored'] === 'string' ||
      typeof raw['stored'] === 'number'
    )
  ) {
    throw new Error(`cas de cellule invalide : ${JSON.stringify(raw)}`);
  }
  return { type: raw['type'], input: raw['input'], stored: raw['stored'] };
}

function toFilterCase(raw: unknown): FilterCase {
  const inputs = isRecord(raw) ? raw['inputs'] : undefined;
  if (
    !isRecord(raw) ||
    !isTypeName(raw['type']) ||
    !isOperator(raw['operator']) ||
    !Array.isArray(inputs) ||
    typeof raw['valid'] !== 'boolean'
  ) {
    throw new Error(`cas de filtre invalide : ${JSON.stringify(raw)}`);
  }
  return {
    type: raw['type'],
    operator: raw['operator'],
    inputs: inputs.map(String),
    valid: raw['valid'],
  };
}

function loadCases(): { cells: ReadonlyArray<CellCase>; filters: ReadonlyArray<FilterCase> } {
  const file: unknown = JSON.parse(readFileSync(CASES_URL, 'utf8'));
  const cells = isRecord(file) ? file['cells'] : undefined;
  const filters = isRecord(file) ? file['filters'] : undefined;
  if (!Array.isArray(cells) || !Array.isArray(filters)) {
    throw new Error('column-type-cases.json : « cells » et « filters » sont attendus');
  }
  return { cells: cells.map(toCellCase), filters: filters.map(toFilterCase) };
}

const { cells, filters } = loadCases();

const COLUMN_ID = parseColumnId('00000000-0000-4000-8000-000000000001');

describe('test de contrat avec le frontend', () => {
  it('le jeu de cas couvre chaque type de colonne', () => {
    for (const type of COLUMN_TYPE_NAMES) {
      expect(cells.some((c) => c.type === type && c.stored !== null)).toBe(true);
      // Un texte non vide n'est refusé que par sa longueur : pas de cas JSON, testé séparément.
      if (type !== 'text') {
        expect(cells.some((c) => c.type === type && c.stored === null)).toBe(true);
      }
      expect(filters.some((f) => f.type === type && f.valid)).toBe(true);
      expect(filters.some((f) => f.type === type && !f.valid)).toBe(true);
    }
  });

  it.each(cells.map((c) => [c.type, c.input, c.stored] as const))(
    '[R16] %s : la saisie %j est stockée comme %j (null = refusée)',
    (type, input, stored) => {
      const parsed = parseCellValue(type, input);
      expect(parsed.ok ? serializeCellValue(parsed.value).value : null).toBe(stored);
    },
  );

  it.each(filters.map((f) => [f.type, f.operator, f.inputs, f.valid] as const))(
    '[R8] %s %s %j : valide = %s',
    (type, operator, inputs, valid) => {
      if (!COLUMN_ID.ok) {
        throw new Error('identifiant de test invalide');
      }
      const resolved = resolveFilter(
        { columnId: COLUMN_ID.value, operator, values: inputs },
        type,
        'filters[0]',
      );
      expect(resolved.ok).toBe(valid);
    },
  );
});
