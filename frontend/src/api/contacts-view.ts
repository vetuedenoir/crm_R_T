import type { ColumnId } from './schemas';

export const FILTER_OPERATORS = [
  'contains',
  'startsWith',
  'equals',
  'notEquals',
  'greaterThan',
  'greaterThanOrEqual',
  'lessThan',
  'lessThanOrEqual',
  'before',
  'after',
  'between',
  'isEmpty',
  'isNotEmpty',
] as const;

export type FilterOperator = (typeof FILTER_OPERATORS)[number];
export type SortDirection = 'asc' | 'desc';

export interface SortSpec {
  readonly columnId: ColumnId;
  readonly direction: SortDirection;
}

export interface FilterSpec {
  readonly columnId: ColumnId;
  readonly operator: FilterOperator;
  readonly values: ReadonlyArray<string | number>;
}

// Ce que l'utilisateur choisit d'afficher : tri et filtres s'appliquent à tout le jeu de données (R15).
// Cet objet fait partie de la clé de requête, donc tout changement repart de la première page.
export interface ContactsView {
  readonly sort: SortSpec | null;
  readonly filters: ReadonlyArray<FilterSpec>;
}

export const EMPTY_CONTACTS_VIEW: ContactsView = { sort: null, filters: [] };
