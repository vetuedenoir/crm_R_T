import type { StorageColumn } from './cell.js';

export function placeholder(index: number): string {
  return `$${String(index)}`;
}

// Le texte se compare en minuscules, comme l'index `cells_text_idx` ; les autres types tels quels.
// `storage` vient d'une union fermée (jamais du client) : l'interpoler dans le SQL est sûr.
export function valueExpression(alias: string, storage: StorageColumn): string {
  return storage === 'value_text' ? `lower(${alias}.value_text)` : `${alias}.${storage}`;
}

// Un opérande est comparé à `valueExpression` : il subit la même transformation.
export function operandExpression(storage: StorageColumn, param: string): string {
  return storage === 'value_text' ? `lower(${param})` : param;
}
