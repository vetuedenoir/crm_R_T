import type { CellValue, FilterSpec } from '../api';
import { isSearchOperator } from '../column-types';

import { FILTER_OPERATOR_LABELS } from './operator-labels';

// Phrase lisible d'un filtre actif : « Score est supérieur à 10 ». `format` est celui du type de la colonne,
// pour que les dates et les téléphones s'affichent comme dans la grille.
export function describeFilter(
  columnName: string,
  { operator, values }: FilterSpec,
  format: (value: CellValue) => string,
): string {
  const operands = values.map((value) =>
    isSearchOperator(operator) ? `« ${String(value)} »` : format(value),
  );
  const operandText = operands.join(operator === 'between' ? ' et ' : ', ');
  return [columnName, FILTER_OPERATOR_LABELS[operator], operandText]
    .filter((part) => part !== '')
    .join(' ');
}
