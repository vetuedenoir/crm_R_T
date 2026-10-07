import type { ColumnId, ContactId } from '../ids.pure.js';

import type { CellValue } from './cell.js';
import type { ColumnTypeName } from './column-type-name.js';

export interface Column {
  readonly id: ColumnId;
  readonly name: string;
  readonly type: ColumnTypeName;
  readonly position: number;
}

export interface Contact {
  readonly id: ContactId;
  // Une cellule vide n'a pas d'entrée : « pas de valeur » n'a qu'une seule représentation.
  readonly cells: Readonly<Record<ColumnId, CellValue>>;
}

// Ligne brute de la table `cells`. Les valeurs sont `unknown` jusqu'à validation par le type de la colonne.
// Le dépôt doit fournir `valueNumber` (chaîne ou nombre) et `valueDate` sous forme de texte `YYYY-MM-DD`.
export interface CellRow {
  readonly contactId: ContactId;
  readonly columnId: ColumnId;
  readonly valueText: unknown;
  readonly valueNumber: unknown;
  readonly valueDate: unknown;
}
