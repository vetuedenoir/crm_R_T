import type { ComponentType } from 'react';

import type { ColumnTypeName, FilterOperator } from '../api';

import type { ColumnTypeLogic } from './column-type-logic';

export interface CellEditorProps {
  // Ce que l'utilisateur a tapé ; l'état vit chez l'appelant (réducteur de grille, phase 11).
  readonly draft: string;
  // Nom accessible du champ : le nom de la colonne.
  readonly label: string;
  readonly invalid: boolean;
  readonly onDraftChange: (draft: string) => void;
  // Entrée valide la saisie, Échap l'annule.
  readonly onCommit: () => void;
  readonly onCancel: () => void;
}

export interface FilterInputProps {
  readonly operator: FilterOperator;
  // Un brouillon par champ ; leur nombre suit l'arité de l'opérateur (0, 1 ou 2).
  readonly values: ReadonlyArray<string>;
  readonly label: string;
  readonly onChange: (values: ReadonlyArray<string>) => void;
}

// Contrat complet d'un type de colonne côté interface : la logique pure et ses deux composants.
// C'est le pendant de `ColumnTypeDefinition` du backend (PLAN §5.5).
export interface ColumnTypeUi<
  TType extends ColumnTypeName = ColumnTypeName,
> extends ColumnTypeLogic<TType> {
  readonly Editor: ComponentType<CellEditorProps>;
  readonly FilterInput: ComponentType<FilterInputProps>;
}
