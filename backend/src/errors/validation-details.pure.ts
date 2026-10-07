import { AppError, type ErrorDetail } from './app-error.js';

// Forme structurelle de `ValidationError` (class-validator) : le cœur pur n'en dépend pas.
export interface ValidationErrorLike {
  readonly property: string;
  readonly constraints?: Readonly<Record<string, string>> | undefined;
  readonly children?: ReadonlyArray<ValidationErrorLike> | undefined;
}

function flatten(error: ValidationErrorLike, parentPath: string): ReadonlyArray<ErrorDetail> {
  const field = parentPath === '' ? error.property : `${parentPath}.${error.property}`;
  const own = Object.values(error.constraints ?? {}).map((message) => ({ field, message }));
  return [...own, ...(error.children ?? []).flatMap((child) => flatten(child, field))];
}

export function flattenValidationErrors(
  errors: ReadonlyArray<ValidationErrorLike>,
): ReadonlyArray<ErrorDetail> {
  return errors.flatMap((error) => flatten(error, ''));
}

// À brancher sur `exceptionFactory` du ValidationPipe : une erreur de forme de requête est une
// `AppError` comme les autres, avec un détail par champ fautif.
export function requestValidationError(errors: ReadonlyArray<ValidationErrorLike>): AppError {
  return new AppError(
    'VALIDATION_FAILED',
    'La requête est invalide',
    flattenValidationErrors(errors),
  );
}
