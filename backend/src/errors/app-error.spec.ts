import { AppError, ERROR_CODES, HTTP_STATUS_BY_CODE, type ErrorCode } from './index.js';

describe('AppError', () => {
  it.each([
    ['VALIDATION_FAILED', 422],
    ['COLUMN_NOT_FOUND', 404],
    ['CONTACT_NOT_FOUND', 404],
    ['INVALID_FILTER', 400],
    ['INVALID_SORT', 400],
    ['CONFLICT', 409],
    ['INTERNAL', 500],
  ] satisfies ReadonlyArray<readonly [ErrorCode, number]>)(
    '%s correspond au statut HTTP %i',
    (code, status) => {
      expect(new AppError(code, 'message').httpStatus).toBe(status);
    },
  );

  it('associe un statut HTTP à chaque code déclaré', () => {
    expect(Object.keys(HTTP_STATUS_BY_CODE).sort()).toEqual([...ERROR_CODES].sort());
  });

  it('est une Error portant le code, le message et les détails', () => {
    const details = [{ field: 'abc', message: 'trop long' }];
    const error = new AppError('VALIDATION_FAILED', 'Valeur invalide', details);

    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({
      name: 'AppError',
      code: 'VALIDATION_FAILED',
      message: 'Valeur invalide',
      details,
    });
  });

  it('a une liste de détails vide par défaut', () => {
    expect(new AppError('CONFLICT', 'Doublon').details).toEqual([]);
  });
});
