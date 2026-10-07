import { ValidationApiError, type ColumnId } from '../api';
import { describeError } from '../ui';

// Le serveur rattache chaque refus à un id de colonne (`details[].field`) : on affiche celui de la cellule
// éditée, plus précis que le message général. Toute autre panne garde son texte habituel.
export function cellErrorMessage(error: unknown, columnId: ColumnId): string {
  return error instanceof ValidationApiError
    ? (error.messageFor(columnId) ?? describeError(error))
    : describeError(error);
}
