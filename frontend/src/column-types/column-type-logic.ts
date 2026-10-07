import type { CellValue, ColumnTypeName, FilterOperator } from '../api';
import type { Result } from '../shared';

export type Alignment = 'left' | 'right';

// Valeurs prêtes à partir dans `FilterSpec.values`.
export type FilterOperands = ReadonlyArray<string | number>;

// Partie du contrat d'un type de colonne qui ne dépend pas de React : affichage, saisie, validation.
// Le « brouillon » (`draft`) est ce que l'utilisateur a tapé, avant toute validation.
export interface ColumnTypeLogic<TType extends ColumnTypeName = ColumnTypeName> {
  readonly name: TType;
  readonly alignment: Alignment;
  // Miroir de `filterOperators` du backend, qui reste la source de vérité (vérifié par le test de contrat).
  readonly filterOperators: ReadonlyArray<FilterOperator>;
  // Texte affiché dans la cellule (format lisible, local).
  format(value: CellValue): string;
  // Brouillon initial de l'éditeur ; vide si la cellule n'a pas de valeur.
  toDraft(value: CellValue | undefined): string;
  // Brouillon -> valeur à envoyer à l'API. Un brouillon vide donne `null` : c'est « vider la cellule ».
  parseInput(draft: string): Result<CellValue | null, string>;
  // Message d'erreur à afficher pendant la saisie, ou `null` si le brouillon est acceptable.
  validate(draft: string): string | null;
  // Brouillons des champs d'un filtre -> `FilterSpec.values`, selon l'opérateur.
  parseFilterValues(
    operator: FilterOperator,
    drafts: ReadonlyArray<string>,
  ): Result<FilterOperands, string>;
}
