import type { ColumnTypeName } from '../api';

// `Record` exhaustif : un nouveau type de colonne sans libellé ne compile pas.
export const COLUMN_TYPE_LABELS: Readonly<Record<ColumnTypeName, string>> = {
  text: 'Texte',
  number: 'Nombre',
  date: 'Date',
  phone: 'Téléphone',
};
