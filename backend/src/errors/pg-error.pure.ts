import { AppError } from './app-error.js';

const SQLSTATE_PATTERN = /^[0-9A-Z]{5}$/;

// Messages statiques : le message de PostgreSQL contient noms de tables, de colonnes et valeurs.
const PG_ERRORS: Readonly<Record<string, () => AppError>> = {
  '22P02': () => new AppError('BAD_REQUEST', 'Une valeur a un format invalide'),
  '22003': () => new AppError('VALIDATION_FAILED', 'Une valeur numérique est hors limites'),
  '22007': () => new AppError('VALIDATION_FAILED', 'Une date est invalide'),
  '22008': () => new AppError('VALIDATION_FAILED', 'Une date est invalide'),
  '23503': () => new AppError('CONFLICT', "L'opération référence une ressource inexistante"),
  '23505': () => new AppError('CONFLICT', 'Cette ressource existe déjà'),
};

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}

// TypeORM enveloppe l'erreur du pilote dans `driverError`.
function unwrapDriverError(error: unknown): unknown {
  return isRecord(error) && 'driverError' in error ? error.driverError : error;
}

// `severity` distingue une erreur PostgreSQL d'une erreur système (`EPIPE` a aussi 5 caractères).
function sqlStateOf(error: unknown): string | undefined {
  const driverError = unwrapDriverError(error);
  if (!isRecord(driverError) || typeof driverError['severity'] !== 'string') {
    return undefined;
  }
  const code = driverError['code'];
  return typeof code === 'string' && SQLSTATE_PATTERN.test(code) ? code : undefined;
}

export function translatePgError(error: unknown): AppError | undefined {
  const sqlState = sqlStateOf(error);
  return sqlState === undefined ? undefined : PG_ERRORS[sqlState]?.();
}
