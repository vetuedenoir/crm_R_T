import type { FilterOperator } from '../api';

// Nombre de valeurs que chaque opérateur attend. Miroir de `OPERATOR_SQL` du backend (vérifié par le test de
// contrat) ; `Record` exhaustif : un nouvel opérateur sans arité ne compile pas.
export const FILTER_OPERATOR_ARITY: Readonly<Record<FilterOperator, 0 | 1 | 2>> = {
  contains: 1,
  startsWith: 1,
  equals: 1,
  notEquals: 1,
  greaterThan: 1,
  greaterThanOrEqual: 1,
  lessThan: 1,
  lessThanOrEqual: 1,
  before: 1,
  after: 1,
  between: 2,
  isEmpty: 0,
  isNotEmpty: 0,
};

// Les opérateurs de recherche portent sur un fragment de texte, pas sur une valeur complète du type.
const SEARCH_OPERATORS: ReadonlyArray<FilterOperator> = ['contains', 'startsWith'];

export function isSearchOperator(operator: FilterOperator): boolean {
  return SEARCH_OPERATORS.includes(operator);
}
