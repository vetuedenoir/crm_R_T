import type { Brand } from '../brand.js';

export type IsoDate = Brand<string, 'IsoDate'>;
export type PhoneNumber = Brand<string, 'PhoneNumber'>;

// Valeur d'une cellule, étiquetée par le type de sa colonne : un `switch` sur `type` doit être exhaustif.
export type CellValue =
  | { readonly type: 'text'; readonly value: string }
  | { readonly type: 'number'; readonly value: number }
  | { readonly type: 'date'; readonly value: IsoDate }
  | { readonly type: 'phone'; readonly value: PhoneNumber };

export const STORAGE_COLUMNS = ['value_text', 'value_number', 'value_date'] as const;

export type StorageColumn = (typeof STORAGE_COLUMNS)[number];

// Forme d'une cellule telle qu'elle est écrite en base : une seule colonne de valeur est renseignée.
export type StoredCell =
  | { readonly column: 'value_text'; readonly value: string }
  | { readonly column: 'value_number'; readonly value: number }
  | { readonly column: 'value_date'; readonly value: string };

// Le message est rattaché à un champ (id de colonne) par l'appelant, qui connaît le contexte.
export interface ValidationError {
  readonly message: string;
}
