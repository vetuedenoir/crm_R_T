import type { ErrorCode } from '../errors/index.js';
import type { ColumnId } from '../ids.pure.js';

import type { FilterOperator } from './filter-operator.js';

export type SortDirection = 'asc' | 'desc';

export interface SortSpec {
  readonly columnId: ColumnId;
  readonly direction: SortDirection;
}

// `values` est brut (`unknown`) : il vient du client et n'est validé que par le type de la colonne.
export interface FilterSpec {
  readonly columnId: ColumnId;
  readonly operator: FilterOperator;
  readonly values: ReadonlyArray<unknown>;
}

export interface ContactsQuery {
  readonly offset: number;
  readonly limit: number;
  readonly sort: SortSpec | null;
  readonly filters: ReadonlyArray<FilterSpec>;
}

export interface SqlStatement {
  readonly sql: string;
  readonly params: ReadonlyArray<unknown>;
}

// `ids` donne la page ; `count` le nombre total de contacts correspondant aux mêmes filtres.
// Une seule fonction produit les deux pour qu'ils ne puissent pas diverger.
export interface ContactsSql {
  readonly ids: SqlStatement;
  readonly count: SqlStatement;
}

// `code` est directement un `ErrorCode` : le service en fait une `AppError` sans traduction.
export interface QueryError {
  readonly code: Extract<ErrorCode, 'INVALID_SORT' | 'INVALID_FILTER' | 'BAD_REQUEST'>;
  readonly field: string;
  readonly message: string;
}
