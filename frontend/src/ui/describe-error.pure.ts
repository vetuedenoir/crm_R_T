import { isApiError } from '../api';
import { assertNever } from '../shared';

const UNKNOWN_ERROR_MESSAGE = 'Une erreur inattendue est survenue.';

// Message affiché à l'utilisateur pour une erreur quelconque. Les erreurs que le serveur a rédigées
// (validation, requête refusée) sont reprises telles quelles ; les autres ont un texte propre à leur cause.
export function describeError(error: unknown): string {
  if (!isApiError(error)) {
    return UNKNOWN_ERROR_MESSAGE;
  }
  switch (error.kind) {
    case 'network':
      return 'Le serveur est injoignable. Vérifiez votre connexion.';
    case 'validation':
    case 'rejected':
      return error.message;
    case 'not-found':
      return 'Élément introuvable : il a peut-être été supprimé.';
    case 'server':
      return 'Le serveur a rencontré une erreur. Réessayez dans un instant.';
    case 'unexpected-response':
      return 'Le serveur a envoyé une réponse inattendue.';
    default:
      return assertNever(error.kind);
  }
}
