import type { Alignment } from './column-type-logic';

// Ce qui distingue l'élément `<input>` d'un type à l'autre. Les éditeurs de cellule et les champs de filtre
// d'un même type partagent cette description, donc la même saisie.
export interface InputAttrs {
  readonly type: 'text' | 'date' | 'tel';
  // Clavier proposé sur mobile ; `decimal` pour un nombre, qui doit accepter la virgule (donc pas `type="number"`).
  readonly inputMode: 'text' | 'decimal' | 'tel';
  readonly alignment: Alignment;
}
