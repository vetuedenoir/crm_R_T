import type { ColumnOrderError } from '../domain/index.js';
import { AppError } from '../errors/index.js';
import type { ColumnId } from '../ids.pure.js';

export function columnNotFound(id: ColumnId): AppError {
  return new AppError('COLUMN_NOT_FOUND', 'Colonne introuvable', [
    { field: 'id', message: `Aucune colonne ${id}` },
  ]);
}

export function invalidField(field: string, message: string): AppError {
  return new AppError('VALIDATION_FAILED', 'La requête est invalide', [{ field, message }]);
}

export function duplicateName(name: string): AppError {
  return new AppError('CONFLICT', `Une colonne nommée « ${name} » existe déjà`, [
    { field: 'name', message: 'Ce nom est déjà utilisé' },
  ]);
}

// Une colonne inconnue est une ressource absente (404) ; une liste incomplète signale un client
// désynchronisé (409) ; un doublon est une erreur de saisie (422).
export function orderError(error: ColumnOrderError): AppError {
  const detail = [{ field: 'ids', message: error.message }];
  switch (error.kind) {
    case 'UNKNOWN_COLUMN':
      return new AppError('COLUMN_NOT_FOUND', 'Colonne introuvable', detail);
    case 'DUPLICATE_COLUMN':
      return new AppError('VALIDATION_FAILED', "L'ordre des colonnes est invalide", detail);
    case 'MISSING_COLUMN':
      return new AppError('CONFLICT', "L'ordre doit contenir toutes les colonnes", detail);
  }
}
