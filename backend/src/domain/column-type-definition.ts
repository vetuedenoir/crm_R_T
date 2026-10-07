import type { Result } from '../result.js';

import type { StorageColumn, StoredCell, ValidationError } from './cell.js';
import type { ColumnTypeName } from './column-type-name.js';
import type { FilterOperator } from './filter-operator.js';

// Contrat unique d'un type de colonne : c'est le seul endroit où un type est défini.
export interface ColumnTypeDefinition<TType extends ColumnTypeName, TValue> {
  readonly name: TType;
  readonly storage: StorageColumn;
  readonly filterOperators: ReadonlyArray<FilterOperator>;
  // Valide et normalise. Une valeur stockée est aussi une entrée valide : `parse` relit la base.
  parse(raw: unknown): Result<TValue, ValidationError>;
  // Même ordre que le tri SQL, pour que le front et le back s'accordent.
  compare(a: TValue, b: TValue): number;
  serialize(value: TValue): StoredCell;
  // Normalise la saisie des opérateurs de recherche (contient, commence par).
  normalizeSearch(text: string): string;
}
