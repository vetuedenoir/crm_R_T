import { HttpException } from '@nestjs/common';

import { AppError } from './app-error.js';
import { translatePgError } from './pg-error.pure.js';

const CLIENT_ERROR_MIN = 400;
const CLIENT_ERROR_MAX = 499;
const NOT_FOUND = 404;

// Les erreurs d'Express (JSON mal formé, corps trop gros) portent un `status` sans être des HttpException.
function httpStatusOf(error: unknown): number | undefined {
  if (error instanceof HttpException) {
    return error.getStatus();
  }
  if (typeof error === 'object' && error !== null && 'status' in error) {
    return typeof error.status === 'number' ? error.status : undefined;
  }
  return undefined;
}

// Toute erreur devient une `AppError` : le message est choisi ici, jamais copié depuis l'erreur
// d'origine (SQL, chemin de fichier, stack...). L'erreur d'origine reste disponible pour les logs.
export function translateError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }
  const pgError = translatePgError(error);
  if (pgError !== undefined) {
    return pgError;
  }
  const status = httpStatusOf(error);
  if (status === NOT_FOUND) {
    return new AppError('NOT_FOUND', 'Ressource introuvable');
  }
  if (status !== undefined && status >= CLIENT_ERROR_MIN && status <= CLIENT_ERROR_MAX) {
    return new AppError('BAD_REQUEST', 'Requête invalide');
  }
  return new AppError('INTERNAL', 'Erreur interne du serveur');
}
