import type { ColumnId } from '../ids.pure.js';
import { err, ok, type Result } from '../result.js';

import type { StorageColumn, ValidationError } from './cell.js';
import type { ColumnTypeName } from './column-type-name.js';
import { COLUMN_TYPES, parseCellValue, serializeCellValue } from './column-types/registry.pure.js';
import type { FilterSpec, QueryError, SqlStatement } from './contacts-query.js';
import type { FilterOperator } from './filter-operator.js';
import { operandExpression, placeholder, valueExpression } from './sql-fragments.pure.js';

type Predicate = (value: string, operand: string, upper: string) => string;

interface OperatorSql {
  // Nombre de valeurs attendues du client.
  readonly arity: 0 | 1 | 2;
  // « Vide » = absence de ligne (cellule vide = pas de ligne), donc `NOT EXISTS`.
  readonly presence: 'exists' | 'not-exists';
  readonly predicate: Predicate | null;
  // Les opérateurs de recherche transforment la saisie (déjà échappée) en motif `LIKE`.
  readonly pattern: ((escaped: string) => string) | null;
}

function comparison(symbol: string): OperatorSql {
  return {
    arity: 1,
    presence: 'exists',
    predicate: (value, operand) => `${value} ${symbol} ${operand}`,
    pattern: null,
  };
}

function search(pattern: (escaped: string) => string): OperatorSql {
  return {
    arity: 1,
    presence: 'exists',
    predicate: (value, operand) => `${value} LIKE ${operand} ESCAPE '\\'`,
    pattern,
  };
}

// `Record` exhaustif : ajouter un opérateur sans son SQL ne compile pas.
const OPERATOR_SQL: Readonly<Record<FilterOperator, OperatorSql>> = {
  contains: search((escaped) => `%${escaped}%`),
  startsWith: search((escaped) => `${escaped}%`),
  equals: comparison('='),
  notEquals: comparison('<>'),
  greaterThan: comparison('>'),
  greaterThanOrEqual: comparison('>='),
  lessThan: comparison('<'),
  lessThanOrEqual: comparison('<='),
  before: comparison('<'),
  after: comparison('>'),
  between: {
    arity: 2,
    presence: 'exists',
    predicate: (value, operand, upper) => `${value} BETWEEN ${operand} AND ${upper}`,
    pattern: null,
  },
  isEmpty: { arity: 0, presence: 'not-exists', predicate: null, pattern: null },
  isNotEmpty: { arity: 0, presence: 'exists', predicate: null, pattern: null },
};

// Filtre validé : les opérandes sont déjà les paramètres liés qui iront à PostgreSQL.
export interface ResolvedFilter {
  readonly columnId: ColumnId;
  readonly operator: FilterOperator;
  readonly storage: StorageColumn;
  readonly operands: ReadonlyArray<string | number>;
}

// `%`, `_` et `\` sont des jokers de `LIKE` : saisis par l'utilisateur, ils doivent rester littéraux.
function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, '\\$&');
}

function parseOperand(
  type: ColumnTypeName,
  operator: FilterOperator,
  raw: unknown,
): Result<string | number, ValidationError> {
  const { pattern } = OPERATOR_SQL[operator];
  if (pattern === null) {
    const parsed = parseCellValue(type, raw);
    return parsed.ok ? ok(serializeCellValue(parsed.value).value) : parsed;
  }
  const text = typeof raw === 'string' ? COLUMN_TYPES[type].normalizeSearch(raw) : '';
  return text === ''
    ? err({ message: 'La recherche ne peut pas être vide' })
    : ok(pattern(escapeLike(text)));
}

function parseOperands(
  type: ColumnTypeName,
  operator: FilterOperator,
  values: ReadonlyArray<unknown>,
): Result<ReadonlyArray<string | number>, ValidationError> {
  const operands: Array<string | number> = [];
  for (const raw of values) {
    const operand = parseOperand(type, operator, raw);
    if (!operand.ok) {
      return operand;
    }
    operands.push(operand.value);
  }
  return ok(operands);
}

function invalidFilter(field: string, message: string): Result<never, QueryError> {
  return err({ code: 'INVALID_FILTER', field, message });
}

export function resolveFilter(
  spec: FilterSpec,
  type: ColumnTypeName,
  field: string,
): Result<ResolvedFilter, QueryError> {
  const definition = COLUMN_TYPES[type];
  // Contrôle d'appartenance au registre : un opérateur inconnu du client n'atteint jamais `OPERATOR_SQL`.
  if (!definition.filterOperators.includes(spec.operator)) {
    return invalidFilter(
      field,
      `L'opérateur « ${spec.operator} » n'existe pas pour le type « ${type} »`,
    );
  }
  const { arity } = OPERATOR_SQL[spec.operator];
  if (spec.values.length !== arity) {
    return invalidFilter(
      field,
      `L'opérateur « ${spec.operator} » attend ${String(arity)} valeur(s), reçu ${String(spec.values.length)}`,
    );
  }
  const operands = parseOperands(type, spec.operator, spec.values);
  return operands.ok
    ? ok({
        columnId: spec.columnId,
        operator: spec.operator,
        storage: definition.storage,
        operands: operands.value,
      })
    : invalidFilter(field, operands.error.message);
}

// `firstParam` est l'indice du premier paramètre libre : le même filtre est rendu dans la requête
// de la page et dans celle du total, avec une numérotation différente.
export function renderFilter(
  filter: ResolvedFilter,
  index: number,
  firstParam: number,
): SqlStatement {
  const alias = `f${String(index)}`;
  const { presence, predicate } = OPERATOR_SQL[filter.operator];
  const [operand = '', upper = ''] = filter.operands.map((_, offset) =>
    operandExpression(filter.storage, placeholder(firstParam + 1 + offset)),
  );
  const conditions = [
    `${alias}.contact_id = c.id`,
    `${alias}.column_id = ${placeholder(firstParam)}`,
    ...(predicate === null
      ? []
      : [predicate(valueExpression(alias, filter.storage), operand, upper)]),
  ];
  const keyword = presence === 'exists' ? 'EXISTS' : 'NOT EXISTS';
  return {
    sql: `${keyword} (SELECT 1 FROM cells ${alias} WHERE ${conditions.join(' AND ')})`,
    params: [filter.columnId, ...filter.operands],
  };
}
