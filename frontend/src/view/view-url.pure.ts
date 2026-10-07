import { z } from 'zod';

import {
  FILTER_OPERATORS,
  viewSearchParams,
  type Column,
  type ColumnTypeName,
  type ContactsView,
  type FilterSpec,
  type SortSpec,
} from '../api';
import type { ColumnTypeLogic } from '../column-types';

export type LogicOf = (type: ColumnTypeName) => ColumnTypeLogic;

// Forme d'un filtre dans l'URL ; son contenu (colonne, opérateur du type, valeurs) est validé ensuite.
const urlFilterSchema = z.object({
  columnId: z.string(),
  operator: z.enum(FILTER_OPERATORS),
  values: z.array(z.union([z.string(), z.number()])).default([]),
});

function parseSort(raw: string | null, columns: ReadonlyArray<Column>): SortSpec | null {
  if (raw === null) {
    return null;
  }
  const [columnId, direction, ...extra] = raw.split(':');
  const column = columns.find((candidate) => candidate.id === columnId);
  const validDirection = direction === 'asc' || direction === 'desc';
  return column === undefined || !validDirection || extra.length > 0
    ? null
    : { columnId: column.id, direction };
}

function parseFilter(
  item: unknown,
  columns: ReadonlyArray<Column>,
  logicOf: LogicOf,
): FilterSpec | null {
  const parsed = urlFilterSchema.safeParse(item);
  const column = parsed.success
    ? columns.find((candidate) => candidate.id === parsed.data.columnId)
    : undefined;
  if (!parsed.success || column === undefined) {
    return null;
  }
  // Les valeurs repassent par la validation du type : une URL modifiée à la main ne doit pas fabriquer
  // un filtre que l'interface ne saurait pas produire.
  const operands = logicOf(column.type).parseFilterValues(
    parsed.data.operator,
    parsed.data.values.map(String),
  );
  return operands.ok
    ? { columnId: column.id, operator: parsed.data.operator, values: operands.value }
    : null;
}

function parseJsonList(raw: string): ReadonlyArray<unknown> {
  try {
    const list = z.array(z.unknown()).safeParse(JSON.parse(raw));
    return list.success ? list.data : [];
  } catch {
    // Une URL altérée n'est pas une erreur de l'application : la vue repart sans ces filtres.
    return [];
  }
}

function parseFilters(
  raw: string | null,
  columns: ReadonlyArray<Column>,
  logicOf: LogicOf,
): ReadonlyArray<FilterSpec> {
  if (raw === null) {
    return [];
  }
  return parseJsonList(raw).flatMap((item) => {
    const filter = parseFilter(item, columns, logicOf);
    return filter === null ? [] : [filter];
  });
}

// Relit la vue depuis l'URL (R8, R7). L'URL est une entrée externe : tout ce qui ne correspond pas à une
// colonne et un opérateur existants est écarté, sans quoi l'API répondrait 400 à chaque chargement.
export function viewFromSearch(
  search: string,
  columns: ReadonlyArray<Column>,
  logicOf: LogicOf,
): ContactsView {
  const params = new URLSearchParams(search);
  return {
    sort: parseSort(params.get('sort'), columns),
    filters: parseFilters(params.get('filters'), columns, logicOf),
  };
}

// Remplace le tri et les filtres de `search` par ceux de `view`, sans toucher aux autres paramètres.
export function withViewSearch(search: string, view: ContactsView): string {
  const params = new URLSearchParams(search);
  params.delete('sort');
  params.delete('filters');
  for (const [name, value] of viewSearchParams(view)) {
    params.set(name, value);
  }
  return params.size === 0 ? '' : `?${params.toString()}`;
}
