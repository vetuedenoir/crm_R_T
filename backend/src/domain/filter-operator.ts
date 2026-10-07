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
