import type { CellValue, ColumnTypeName, FilterOperator } from '../api';
import { err, ok, type Result } from '../shared';

import type { Alignment, ColumnTypeLogic, FilterOperands } from './column-type-logic';
import { FILTER_OPERATOR_ARITY, isSearchOperator } from './filter-arity.pure';

// Ce que chaque type fournit ; `defineColumnType` en déduit le reste (cellule vide, validation, filtres)
// pour que ces règles soient écrites une seule fois.
export interface ColumnTypeSpec<TType extends ColumnTypeName> {
  readonly name: TType;
  readonly alignment: Alignment;
  readonly filterOperators: ReadonlyArray<FilterOperator>;
  readonly format: (value: CellValue) => string;
  readonly toDraft: (value: CellValue) => string;
  // Reçoit un brouillon non vide ; refuse ce que le backend refuserait.
  readonly parseValue: (draft: string) => Result<CellValue, string>;
  // Normalise la saisie des opérateurs « contient » et « commence par » ; identique au backend.
  readonly normalizeSearch?: (text: string) => string;
}

const EMPTY_SEARCH_MESSAGE = 'La recherche ne peut pas être vide';
const MISSING_VALUE_MESSAGE = 'Une valeur est requise';

function trim(text: string): string {
  return text.trim();
}

function parseInput<TType extends ColumnTypeName>(
  spec: ColumnTypeSpec<TType>,
  draft: string,
): Result<CellValue | null, string> {
  return draft.trim() === '' ? ok(null) : spec.parseValue(draft);
}

function parseOperand<TType extends ColumnTypeName>(
  spec: ColumnTypeSpec<TType>,
  operator: FilterOperator,
  draft: string,
): Result<string | number, string> {
  if (isSearchOperator(operator)) {
    const text = (spec.normalizeSearch ?? trim)(draft);
    return text === '' ? err(EMPTY_SEARCH_MESSAGE) : ok(text);
  }
  const parsed = parseInput(spec, draft);
  if (!parsed.ok) {
    return parsed;
  }
  return parsed.value === null ? err(MISSING_VALUE_MESSAGE) : ok(parsed.value);
}

function parseFilterValues<TType extends ColumnTypeName>(
  spec: ColumnTypeSpec<TType>,
  operator: FilterOperator,
  drafts: ReadonlyArray<string>,
): Result<FilterOperands, string> {
  if (!spec.filterOperators.includes(operator)) {
    return err(`L'opérateur « ${operator} » n'existe pas pour le type « ${spec.name} »`);
  }
  const arity = FILTER_OPERATOR_ARITY[operator];
  if (drafts.length !== arity) {
    return err(
      `L'opérateur « ${operator} » attend ${String(arity)} valeur(s), reçu ${String(drafts.length)}`,
    );
  }
  const operands: Array<string | number> = [];
  for (const draft of drafts) {
    const operand = parseOperand(spec, operator, draft);
    if (!operand.ok) {
      return operand;
    }
    operands.push(operand.value);
  }
  return ok(operands);
}

export function defineColumnType<TType extends ColumnTypeName>(
  spec: ColumnTypeSpec<TType>,
): ColumnTypeLogic<TType> {
  return {
    name: spec.name,
    alignment: spec.alignment,
    filterOperators: spec.filterOperators,
    format: spec.format,
    toDraft: (value) => (value === undefined ? '' : spec.toDraft(value)),
    parseInput: (draft) => parseInput(spec, draft),
    validate: (draft) => {
      const parsed = parseInput(spec, draft);
      return parsed.ok ? null : parsed.error;
    },
    parseFilterValues: (operator, drafts) => parseFilterValues(spec, operator, drafts),
  };
}
