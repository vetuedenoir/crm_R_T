import { errorOf } from '../testing/error-of.js';
import { columnId } from '../testing/factories.js';

import type { ColumnTypeName } from './column-type-name.js';
import { COLUMN_TYPES } from './column-types/registry.pure.js';
import type { FilterSpec } from './contacts-query.js';
import { renderFilter, resolveFilter } from './filter-clause.pure.js';
import { FILTER_OPERATORS, type FilterOperator } from './filter-operator.js';

const COLUMN = columnId(7);

function spec(operator: FilterOperator, ...values: ReadonlyArray<unknown>): FilterSpec {
  return { columnId: COLUMN, operator, values };
}

function exists(condition?: string, keyword = 'EXISTS'): string {
  const base = 'f0.contact_id = c.id AND f0.column_id = $1';
  const full = condition === undefined ? base : `${base} AND ${condition}`;
  return `${keyword} (SELECT 1 FROM cells f0 WHERE ${full})`;
}

function render(type: ColumnTypeName, filter: FilterSpec): { sql: string; params: unknown } {
  const resolved = resolveFilter(filter, type, 'filters[0]');
  if (!resolved.ok) {
    throw new Error(resolved.error.message);
  }
  return renderFilter(resolved.value, 0, 1);
}

const LIKE = "LIKE lower($2) ESCAPE '\\'";

describe('clause de filtre', () => {
  it.each([
    ['text', spec('contains', ' ali '), `lower(f0.value_text) ${LIKE}`, '%ali%'],
    ['text', spec('startsWith', 'Al'), `lower(f0.value_text) ${LIKE}`, 'Al%'],
    ['text', spec('equals', 'Alice'), 'lower(f0.value_text) = lower($2)', 'Alice'],
    ['number', spec('equals', 5), 'f0.value_number = $2', 5],
    ['number', spec('notEquals', 5), 'f0.value_number <> $2', 5],
    ['number', spec('greaterThan', 5), 'f0.value_number > $2', 5],
    ['number', spec('greaterThanOrEqual', 5), 'f0.value_number >= $2', 5],
    ['number', spec('lessThan', 5), 'f0.value_number < $2', 5],
    ['number', spec('lessThanOrEqual', 5), 'f0.value_number <= $2', 5],
    ['number', spec('greaterThan', '5,5'), 'f0.value_number > $2', 5.5],
    ['date', spec('equals', '2024-06-15'), 'f0.value_date = $2', '2024-06-15'],
    ['date', spec('before', '2024-06-15'), 'f0.value_date < $2', '2024-06-15'],
    ['date', spec('after', '2024-06-15'), 'f0.value_date > $2', '2024-06-15'],
    ['phone', spec('contains', '06 12'), `lower(f0.value_text) ${LIKE}`, '%0612%'],
    ['phone', spec('equals', '06 12 34 56 78'), 'lower(f0.value_text) = lower($2)', '0612345678'],
  ] as const)('[R8] %s / %j produit « %s »', (type, filter, condition, operand) => {
    expect(render(type, filter)).toEqual({ sql: exists(condition), params: [COLUMN, operand] });
  });

  it.each([
    ['number', spec('between', 1, 10), 'f0.value_number BETWEEN $2 AND $3', [1, 10]],
    ['number', spec('between', '1,5', '10'), 'f0.value_number BETWEEN $2 AND $3', [1.5, 10]],
    [
      'date',
      spec('between', '2024-01-01', '2024-12-31'),
      'f0.value_date BETWEEN $2 AND $3',
      ['2024-01-01', '2024-12-31'],
    ],
  ] as const)('[R8] %s / %j borne les deux côtés', (type, filter, condition, operands) => {
    expect(render(type, filter)).toEqual({ sql: exists(condition), params: [COLUMN, ...operands] });
  });

  it.each(['text', 'number', 'date', 'phone'] as const)(
    '[R8] « vide » devient une absence de ligne, « non vide » une présence (%s)',
    (type) => {
      expect(render(type, spec('isEmpty'))).toEqual({
        sql: exists(undefined, 'NOT EXISTS'),
        params: [COLUMN],
      });
      expect(render(type, spec('isNotEmpty'))).toEqual({ sql: exists(), params: [COLUMN] });
    },
  );

  it('[R8] numérote les paramètres à partir du premier indice libre', () => {
    const resolved = resolveFilter(spec('between', 1, 10), 'number', 'filters[0]');
    if (!resolved.ok) {
      throw new Error(resolved.error.message);
    }
    expect(renderFilter(resolved.value, 2, 4).sql).toBe(
      'EXISTS (SELECT 1 FROM cells f2 WHERE f2.contact_id = c.id AND f2.column_id = $4 AND f2.value_number BETWEEN $5 AND $6)',
    );
  });

  it.each([
    ['%', '%\\%%'],
    ['_', '%\\_%'],
    ['\\', '%\\\\%'],
    ['50%_\\', '%50\\%\\_\\\\%'],
  ])('[R8] les jokers LIKE de la saisie %s restent littéraux', (saisie, motif) => {
    expect(render('text', spec('contains', saisie)).params).toEqual([COLUMN, motif]);
  });

  it('[R8] une valeur hostile reste un paramètre lié, jamais du SQL', () => {
    const hostile = "'; DROP TABLE cells; --";
    const rendered = render('text', spec('equals', hostile));
    expect(rendered.sql).not.toContain('DROP');
    expect(rendered.params).toEqual([COLUMN, hostile]);
  });

  it.each([
    ['contains', 'number'],
    ['startsWith', 'date'],
    ['between', 'text'],
    ['before', 'number'],
    ['greaterThan', 'phone'],
    ['startsWith', 'phone'],
  ] as const)("[R16] refuse l'opérateur %s sur une colonne %s", (operator, type) => {
    const error = errorOf(resolveFilter(spec(operator, 'x', 'y'), type, 'filters[3]'));
    expect(error).toMatchObject({ code: 'INVALID_FILTER', field: 'filters[3]' });
    expect(error.message).toContain(operator);
  });

  it('[R8] refuse un opérateur inconnu venu du client', () => {
    // @ts-expect-error un client malveillant n'est pas tenu de respecter l'union
    const resolved = resolveFilter(spec('1=1; --', 'x'), 'text', 'filters[0]');
    expect(resolved.ok).toBe(false);
  });

  it.each([
    ['text', spec('equals')],
    ['number', spec('between', 1)],
    ['number', spec('equals', 1, 2)],
    ['text', spec('isEmpty', 'x')],
  ] as const)('[R8] refuse un nombre de valeurs incorrect (%s, %j)', (type, filter) => {
    const error = errorOf(resolveFilter(filter, type, 'filters[0]'));
    expect(error).toMatchObject({ code: 'INVALID_FILTER', field: 'filters[0]' });
    expect(error.message).toContain('valeur');
  });

  it.each([
    ['number', spec('equals', 'abc')],
    ['number', spec('between', 1, 'abc')],
    ['date', spec('equals', '2024-02-30')],
    ['date', spec('after', '15/06/2024')],
    ['phone', spec('equals', '12')],
    ['text', spec('equals', '')],
    ['text', spec('contains', '   ')],
    ['text', spec('contains', 42)],
    ['phone', spec('contains', 'abc')],
  ] as const)('[R16] refuse une valeur invalide pour le type (%s, %j)', (type, filter) => {
    const resolved = resolveFilter(filter, type, 'filters[1]');
    expect(resolved.ok).toBe(false);
    expect(resolved.ok ? null : resolved.error).toMatchObject({
      code: 'INVALID_FILTER',
      field: 'filters[1]',
    });
  });

  it.each(FILTER_OPERATORS)("[R8] l'opérateur %s est utilisé par au moins un type", (operator) => {
    const types = Object.values(COLUMN_TYPES);
    expect(types.some((type) => type.filterOperators.includes(operator))).toBe(true);
  });
});
