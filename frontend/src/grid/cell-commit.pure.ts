import type { CellValue } from '../api';
import type { ColumnTypeLogic } from '../column-types';

export type CommitPlan =
  | { readonly kind: 'invalid'; readonly message: string }
  | { readonly kind: 'unchanged' }
  // `value: null` vide la cellule.
  | { readonly kind: 'update'; readonly value: CellValue | null };

// Décide quoi faire d'un brouillon validé : le refuser, l'ignorer s'il ne change rien (pas de requête
// inutile), ou l'envoyer. Un brouillon vide vaut « vider la cellule » (`parseInput` donne `null`).
export function planCommit(
  type: ColumnTypeLogic,
  previous: CellValue | undefined,
  draft: string,
): CommitPlan {
  const parsed = type.parseInput(draft);
  if (!parsed.ok) {
    return { kind: 'invalid', message: parsed.error };
  }
  const unchanged = parsed.value === null ? previous === undefined : parsed.value === previous;
  return unchanged ? { kind: 'unchanged' } : { kind: 'update', value: parsed.value };
}
