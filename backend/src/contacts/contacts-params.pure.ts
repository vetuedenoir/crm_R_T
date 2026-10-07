import {
  FILTER_OPERATORS,
  type ContactsQuery,
  type FilterOperator,
  type FilterSpec,
  type QueryError,
  type SortSpec,
} from '../domain/index.js';
import { parseColumnId } from '../ids.pure.js';
import { err, ok, type Result } from '../result.js';

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;

// Paramètres de la requête `GET /contacts`, tels que la couche HTTP les a validés (forme seulement).
export interface ContactsParams {
  readonly offset?: number;
  readonly limit?: number;
  // `<id de colonne>:asc` ou `<id de colonne>:desc`.
  readonly sort?: string;
  // Tableau JSON de `{ columnId, operator, values }`.
  readonly filters?: string;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFilterOperator(value: unknown): value is FilterOperator {
  return FILTER_OPERATORS.some((operator) => operator === value);
}

function invalidSort(message: string): Result<never, QueryError> {
  return err({ code: 'INVALID_SORT', field: 'sort', message });
}

function invalidFilter(field: string, message: string): Result<never, QueryError> {
  return err({ code: 'INVALID_FILTER', field, message });
}

function parseSort(raw: string | undefined): Result<SortSpec | null, QueryError> {
  if (raw === undefined) {
    return ok(null);
  }
  const [rawId, direction, ...extra] = raw.split(':');
  const columnId = parseColumnId(rawId);
  if (!columnId.ok) {
    return invalidSort(`Colonne de tri invalide : ${columnId.error}`);
  }
  if ((direction !== 'asc' && direction !== 'desc') || extra.length > 0) {
    return invalidSort('Le tri doit avoir la forme <id de colonne>:asc ou <id de colonne>:desc');
  }
  return ok({ columnId: columnId.value, direction });
}

function parseFilter(raw: unknown, field: string): Result<FilterSpec, QueryError> {
  if (!isRecord(raw)) {
    return invalidFilter(field, 'Un filtre doit être un objet');
  }
  const columnId = parseColumnId(raw['columnId']);
  if (!columnId.ok) {
    return invalidFilter(field, `Colonne de filtre invalide : ${columnId.error}`);
  }
  const operator = raw['operator'];
  if (!isFilterOperator(operator)) {
    return invalidFilter(field, 'Opérateur de filtre inconnu');
  }
  // `values` est omis pour les opérateurs sans opérande (`isEmpty`, `isNotEmpty`).
  const values = raw['values'] ?? [];
  return Array.isArray(values)
    ? ok({ columnId: columnId.value, operator, values })
    : invalidFilter(field, 'values doit être une liste');
}

function parseJson(raw: string): Result<unknown, QueryError> {
  try {
    return ok(JSON.parse(raw));
  } catch (error: unknown) {
    return invalidFilter('filters', `filters n'est pas un JSON valide : ${String(error)}`);
  }
}

function parseFilters(raw: string | undefined): Result<ReadonlyArray<FilterSpec>, QueryError> {
  if (raw === undefined) {
    return ok([]);
  }
  const json = parseJson(raw);
  if (!json.ok) {
    return json;
  }
  if (!Array.isArray(json.value)) {
    return invalidFilter('filters', 'filters doit être une liste de filtres');
  }
  const specs: FilterSpec[] = [];
  for (const [index, item] of json.value.entries()) {
    const spec = parseFilter(item, `filters[${String(index)}]`);
    if (!spec.ok) {
      return spec;
    }
    specs.push(spec.value);
  }
  return ok(specs);
}

// Traduit les paramètres HTTP en `ContactsQuery`. Le tri et les filtres ne sont ici que bien formés :
// leur cohérence avec les colonnes (id connu, opérateur valide pour le type, valeurs) est vérifiée par
// `buildContactsQuery`, qui connaît les colonnes.
export function parseContactsParams(params: ContactsParams): Result<ContactsQuery, QueryError> {
  const sort = parseSort(params.sort);
  if (!sort.ok) {
    return sort;
  }
  const filters = parseFilters(params.filters);
  if (!filters.ok) {
    return filters;
  }
  return ok({
    offset: params.offset ?? 0,
    limit: params.limit ?? DEFAULT_PAGE_SIZE,
    sort: sort.value,
    filters: filters.value,
  });
}
