import type { Contact } from '../domain/index.js';

// Forme JSON d'un contact : `cells` associe l'id d'une colonne à sa valeur. Le type de la valeur est
// celui de la colonne (nombre pour `number`, texte sinon) ; une cellule vide est absente.
export interface ContactBody {
  readonly id: string;
  readonly cells: Readonly<Record<string, string | number>>;
}

export function toContactBody(contact: Contact): ContactBody {
  return {
    id: contact.id,
    cells: Object.fromEntries(
      Object.entries(contact.cells).map(([columnId, cell]) => [columnId, cell.value]),
    ),
  };
}
