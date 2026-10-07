export { assembleContacts, type AssembleError } from './assemble-contacts.pure.js';
export { buildContactsQuery, type QueryColumn } from './build-contacts-query.pure.js';
export {
  STORAGE_COLUMNS,
  type CellValue,
  type IsoDate,
  type PhoneNumber,
  type StorageColumn,
  type StoredCell,
  type ValidationError,
} from './cell.js';
export type { CellRow, Column, Contact } from './column.js';
export type { ColumnTypeDefinition } from './column-type-definition.js';
export { findNameConflict, MAX_COLUMN_NAME_LENGTH, parseColumnName } from './column-name.pure.js';
export { COLUMN_TYPE_NAMES, type ColumnTypeName } from './column-type-name.js';
export { COLUMN_TYPES, parseCellValue, serializeCellValue } from './column-types/registry.pure.js';
export {
  computeColumnOrder,
  type ColumnOrderError,
  type ColumnPosition,
} from './compute-column-order.pure.js';
export type {
  ContactsQuery,
  ContactsSql,
  FilterSpec,
  QueryError,
  SortDirection,
  SortSpec,
  SqlStatement,
} from './contacts-query.js';
export { FILTER_OPERATORS, type FilterOperator } from './filter-operator.js';
export { nextColumnPosition } from './next-column-position.pure.js';
