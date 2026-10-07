import type { Column, ColumnId, ColumnTypeName, FilterOperator, FilterSpec } from '../api';
import { FILTER_OPERATOR_ARITY, type FilterOperands } from '../column-types';
import { assertNever, ok, type Result } from '../shared';

// Filtre en cours de saisie. `null` signifie « premier choix possible » : tant que l'utilisateur n'a rien
// choisi, il n'y a pas de colonne ni d'opérateur à retenir, et ils restent valides si les colonnes changent.
export interface FilterDraft {
  readonly columnId: ColumnId | null;
  readonly operator: FilterOperator | null;
  // Un brouillon par champ de saisie, sans validation.
  readonly values: ReadonlyArray<string>;
  readonly error: string | null;
}

export type FilterDraftAction =
  | { readonly type: 'select-column'; readonly columnId: ColumnId }
  | { readonly type: 'select-operator'; readonly operator: FilterOperator }
  | { readonly type: 'change-values'; readonly values: ReadonlyArray<string> }
  | { readonly type: 'rejected'; readonly error: string }
  | { readonly type: 'filter-added' };

export const INITIAL_FILTER_DRAFT: FilterDraft = {
  columnId: null,
  operator: null,
  values: [],
  error: null,
};

// Changer de colonne ou d'opérateur change les champs de saisie : les anciens brouillons n'ont plus de sens.
export function filterDraftReducer(state: FilterDraft, action: FilterDraftAction): FilterDraft {
  switch (action.type) {
    case 'select-column':
      return { columnId: action.columnId, operator: null, values: [], error: null };
    case 'select-operator':
      return { ...state, operator: action.operator, values: [], error: null };
    case 'change-values':
      return { ...state, values: action.values, error: null };
    case 'rejected':
      return { ...state, error: action.error };
    case 'filter-added':
      // La colonne et l'opérateur restent : on enchaîne souvent plusieurs filtres sur la même colonne.
      return { ...state, values: [], error: null };
    default:
      return assertNever(action);
  }
}

export interface ResolvedDraft {
  readonly column: Column;
  readonly operator: FilterOperator;
}

// Colonne et opérateur effectifs du brouillon. Un choix qui n'existe plus (colonne supprimée, opérateur
// absent du nouveau type) retombe sur le premier proposé. `null` s'il n'y a rien à filtrer.
export function resolveDraft(
  draft: FilterDraft,
  columns: ReadonlyArray<Column>,
  operatorsFor: (type: ColumnTypeName) => ReadonlyArray<FilterOperator>,
): ResolvedDraft | null {
  const column = columns.find((candidate) => candidate.id === draft.columnId) ?? columns[0];
  if (column === undefined) {
    return null;
  }
  const operators = operatorsFor(column.type);
  const operator =
    draft.operator !== null && operators.includes(draft.operator) ? draft.operator : operators[0];
  return operator === undefined ? null : { column, operator };
}

export type ParseFilterValues = (
  operator: FilterOperator,
  drafts: ReadonlyArray<string>,
) => Result<FilterOperands, string>;

// Brouillons -> filtre prêt pour l'API, ou message à afficher. Les champs non remplis comptent comme vides,
// ce qui donne au type le message qui convient (« Une valeur est requise »).
export function buildFilter(
  column: Column,
  operator: FilterOperator,
  values: ReadonlyArray<string>,
  parse: ParseFilterValues,
): Result<FilterSpec, string> {
  const drafts = Array.from(
    { length: FILTER_OPERATOR_ARITY[operator] },
    (_unused, index) => values[index] ?? '',
  );
  const operands = parse(operator, drafts);
  return operands.ok ? ok({ columnId: column.id, operator, values: operands.value }) : operands;
}
