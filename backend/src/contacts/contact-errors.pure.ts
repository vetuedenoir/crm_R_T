import type { CellWriteError, QueryError } from '../domain/index.js';
import { AppError } from '../errors/index.js';
import type { ContactId } from '../ids.pure.js';

export function contactNotFound(id: ContactId): AppError {
  return new AppError('CONTACT_NOT_FOUND', 'Contact introuvable', [
    { field: 'id', message: `Aucun contact ${id}` },
  ]);
}

export function invalidField(field: string, message: string): AppError {
  return new AppError('VALIDATION_FAILED', 'La requête est invalide', [{ field, message }]);
}

// `QueryError.code` est déjà un `ErrorCode` : aucune traduction.
export function queryError(error: QueryError): AppError {
  return new AppError(error.code, error.message, [{ field: error.field, message: error.message }]);
}

// Une colonne inconnue est une ressource absente (404) ; sinon la valeur est refusée (422) avec un
// détail par cellule, dont le `field` est l'id de la colonne.
export function cellWriteError(errors: ReadonlyArray<CellWriteError>): AppError {
  const details = errors.map(({ field, message }) => ({ field, message }));
  return errors.some((error) => error.kind === 'UNKNOWN_COLUMN')
    ? new AppError('COLUMN_NOT_FOUND', 'Colonne introuvable', details)
    : new AppError('VALIDATION_FAILED', 'Certaines valeurs sont invalides', details);
}
