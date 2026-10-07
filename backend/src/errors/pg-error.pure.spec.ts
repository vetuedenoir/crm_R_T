import { translatePgError } from './pg-error.pure.js';

const pgError = (code: string): object => ({
  code,
  severity: 'ERROR',
  message: 'relation "cells" violates constraint secret_name',
});

describe('translatePgError', () => {
  it.each([
    ['22P02', 'BAD_REQUEST', 400],
    ['22003', 'VALIDATION_FAILED', 422],
    ['22007', 'VALIDATION_FAILED', 422],
    ['22008', 'VALIDATION_FAILED', 422],
    ['23503', 'CONFLICT', 409],
    ['23505', 'CONFLICT', 409],
  ])('SQLSTATE %s devient %s (%i)', (sqlState, code, status) => {
    expect(translatePgError(pgError(sqlState))).toMatchObject({ code, httpStatus: status });
  });

  it("lit l'erreur du pilote enveloppée par TypeORM", () => {
    expect(translatePgError({ driverError: pgError('23505') })).toMatchObject({ code: 'CONFLICT' });
  });

  it("n'expose rien du message PostgreSQL", () => {
    expect(translatePgError(pgError('23505'))?.message).not.toContain('secret_name');
  });

  it.each([
    ['un SQLSTATE non traduit', pgError('42P01')],
    ['une erreur système de 5 caractères', { code: 'EPIPE' }],
    ['une erreur ordinaire', new Error('boom')],
    ['une valeur non objet', 'texte'],
    ['null', null],
  ])('ignore %s', (_cas, error) => {
    expect(translatePgError(error)).toBeUndefined();
  });
});
