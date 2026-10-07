export const COLUMN_TYPE_NAMES = ['text', 'number', 'date', 'phone'] as const;

export type ColumnTypeName = (typeof COLUMN_TYPE_NAMES)[number];
