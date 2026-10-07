import type { ColumnId, ContactId } from '../api';

// Une cellule se désigne par ses identifiants et non par sa position : la virtualisation, le chargement de
// pages et les rechargements déplacent les lignes, mais jamais l'identité d'une cellule.
export interface CellAddress {
  readonly contactId: ContactId;
  readonly columnId: ColumnId;
}

export function sameAddress(a: CellAddress | null, b: CellAddress | null): boolean {
  return a !== null && b !== null && a.contactId === b.contactId && a.columnId === b.columnId;
}

// Identifiant DOM de la cellule, pour `aria-activedescendant` de la grille.
export function cellDomId({ contactId, columnId }: CellAddress): string {
  return `cell-${contactId}-${columnId}`;
}
