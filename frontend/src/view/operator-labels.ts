import type { FilterOperator } from '../api';

// `Record` exhaustif : un nouvel opérateur sans libellé ne compile pas.
export const FILTER_OPERATOR_LABELS: Readonly<Record<FilterOperator, string>> = {
  contains: 'contient',
  startsWith: 'commence par',
  equals: 'est égal à',
  notEquals: 'est différent de',
  greaterThan: 'est supérieur à',
  greaterThanOrEqual: 'est supérieur ou égal à',
  lessThan: 'est inférieur à',
  lessThanOrEqual: 'est inférieur ou égal à',
  before: 'est avant',
  after: 'est après',
  between: 'est entre',
  isEmpty: 'est vide',
  isNotEmpty: "n'est pas vide",
};
