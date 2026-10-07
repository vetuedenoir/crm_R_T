import { err, ok, type Result } from '../result.js';

import type { StorageColumn } from './cell.js';
import type { ColumnTypeName } from './column-type-name.js';
import { COLUMN_TYPES } from './column-types/registry.pure.js';
import type { Column } from './column.js';
import type {
  ContactsQuery,
  ContactsSql,
  QueryError,
  SortDirection,
  SortSpec,
  SqlStatement,
} from './contacts-query.js';
import { renderFilter, resolveFilter, type ResolvedFilter } from './filter-clause.pure.js';
import { placeholder, valueExpression } from './sql-fragments.pure.js';

export type QueryColumn = Pick<Column, 'id' | 'type'>;

type ColumnTypes = ReadonlyMap<QueryColumn['id'], ColumnTypeName>;

interface ResolvedSort {
  readonly columnId: SortSpec['columnId'];
  readonly storage: StorageColumn;
  readonly direction: SortDirection;
}

function isNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

function checkPagination(query: ContactsQuery): Result<null, QueryError> {
  if (!Number.isInteger(query.limit) || query.limit < 1) {
    return err({
      code: 'BAD_REQUEST',
      field: 'limit',
      message: 'limit doit être un entier supérieur ou égal à 1',
    });
  }
  return isNonNegativeInteger(query.offset)
    ? ok(null)
    : err({
        code: 'BAD_REQUEST',
        field: 'offset',
        message: 'offset doit être un entier positif ou nul',
      });
}

function resolveSort(
  sort: SortSpec | null,
  types: ColumnTypes,
): Result<ResolvedSort | null, QueryError> {
  if (sort === null) {
    return ok(null);
  }
  const type = types.get(sort.columnId);
  return type === undefined
    ? err({
        code: 'INVALID_SORT',
        field: 'sort',
        message: `Colonne de tri inconnue : ${sort.columnId}`,
      })
    : ok({
        columnId: sort.columnId,
        storage: COLUMN_TYPES[type].storage,
        direction: sort.direction,
      });
}

function resolveFilters(
  query: ContactsQuery,
  types: ColumnTypes,
): Result<ReadonlyArray<ResolvedFilter>, QueryError> {
  const resolved: ResolvedFilter[] = [];
  for (const [index, spec] of query.filters.entries()) {
    const field = `filters[${String(index)}]`;
    const type = types.get(spec.columnId);
    if (type === undefined) {
      return err({
        code: 'INVALID_FILTER',
        field,
        message: `Colonne de filtre inconnue : ${spec.columnId}`,
      });
    }
    const filter = resolveFilter(spec, type, field);
    if (!filter.ok) {
      return filter;
    }
    resolved.push(filter.value);
  }
  return ok(resolved);
}

// Clauses indépendantes combinées en `AND` ; la numérotation des paramètres se poursuit d'une clause à l'autre.
function renderWhere(filters: ReadonlyArray<ResolvedFilter>, firstParam: number): SqlStatement {
  const fragments: SqlStatement[] = [];
  let next = firstParam;
  for (const [index, filter] of filters.entries()) {
    const fragment = renderFilter(filter, index, next);
    fragments.push(fragment);
    next += fragment.params.length;
  }
  return {
    sql: fragments.length === 0 ? '' : `WHERE ${fragments.map((f) => f.sql).join('\n  AND ')}`,
    params: fragments.flatMap((fragment) => fragment.params),
  };
}

// Valeurs vides en dernier dans les deux sens ; l'id départage les égalités pour une pagination stable.
// Sans tri explicite, l'ordre de création place les nouveaux contacts en bas de la grille.
function renderOrderBy(sort: ResolvedSort | null): string {
  if (sort === null) {
    return 'ORDER BY c.created_at ASC, c.id ASC';
  }
  const direction = sort.direction === 'desc' ? 'DESC' : 'ASC';
  return `ORDER BY ${valueExpression('s', sort.storage)} ${direction} NULLS LAST, c.id ASC`;
}

function renderIds(
  query: ContactsQuery,
  sort: ResolvedSort | null,
  filters: ReadonlyArray<ResolvedFilter>,
): SqlStatement {
  const sortParams = sort === null ? [] : [sort.columnId];
  const where = renderWhere(filters, sortParams.length + 1);
  const limitIndex = sortParams.length + where.params.length + 1;
  const lines = [
    'SELECT c.id',
    'FROM contacts c',
    sort === null
      ? ''
      : `LEFT JOIN cells s ON s.contact_id = c.id AND s.column_id = ${placeholder(1)}`,
    where.sql,
    renderOrderBy(sort),
    `LIMIT ${placeholder(limitIndex)} OFFSET ${placeholder(limitIndex + 1)}`,
  ];
  return {
    sql: lines.filter((line) => line !== '').join('\n'),
    params: [...sortParams, ...where.params, query.limit, query.offset],
  };
}

function renderCount(filters: ReadonlyArray<ResolvedFilter>): SqlStatement {
  const where = renderWhere(filters, 1);
  return {
    sql: ['SELECT count(*) AS total', 'FROM contacts c', where.sql]
      .filter((line) => line !== '')
      .join('\n'),
    params: where.params,
  };
}

// Seule source du SQL de liste. Les identifiants viennent du registre et de `columns`, jamais du
// client ; toute valeur du client est un paramètre lié.
export function buildContactsQuery(
  query: ContactsQuery,
  columns: ReadonlyArray<QueryColumn>,
): Result<ContactsSql, QueryError> {
  const types: ColumnTypes = new Map(columns.map((column) => [column.id, column.type] as const));
  const pagination = checkPagination(query);
  if (!pagination.ok) {
    return pagination;
  }
  const sort = resolveSort(query.sort, types);
  if (!sort.ok) {
    return sort;
  }
  const filters = resolveFilters(query, types);
  if (!filters.ok) {
    return filters;
  }
  return ok({
    ids: renderIds(query, sort.value, filters.value),
    count: renderCount(filters.value),
  });
}
