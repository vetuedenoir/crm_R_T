import { describe, expect, it } from 'vitest';

import { errorBody } from '../test/error-body';

import {
  NotFoundError,
  RequestRejectedError,
  ServerError,
  ValidationApiError,
  type ApiError,
} from './api-errors';
import { errorFromResponse } from './error-from-response.pure';

describe('errorFromResponse', () => {
  it.each<[number, string, new (...args: never[]) => ApiError, ApiError['kind']]>([
    [400, 'INVALID_SORT', RequestRejectedError, 'rejected'],
    [404, 'COLUMN_NOT_FOUND', NotFoundError, 'not-found'],
    [409, 'CONFLICT', RequestRejectedError, 'rejected'],
    [422, 'VALIDATION_FAILED', ValidationApiError, 'validation'],
    [500, 'INTERNAL', ServerError, 'server'],
    [503, 'UNAVAILABLE', ServerError, 'server'],
  ])('HTTP %i (%s) devient le bon type d’erreur', (status, code, errorClass, kind) => {
    const error = errorFromResponse(status, errorBody(code, 'Message du serveur'));

    expect(error).toBeInstanceOf(errorClass);
    expect(error.kind).toBe(kind);
    expect(error).toMatchObject({
      message: 'Message du serveur',
      status,
      code,
      requestId: 'req-1',
    });
  });

  it('conserve le détail par champ d’une erreur de validation', () => {
    const error = errorFromResponse(
      422,
      errorBody('VALIDATION_FAILED', 'Valeur invalide', [
        { field: 'col-1', message: 'Pas un nombre' },
      ]),
    );

    expect(error).toBeInstanceOf(ValidationApiError);
    expect(error instanceof ValidationApiError && error.messageFor('col-1')).toBe('Pas un nombre');
    expect(error instanceof ValidationApiError && error.messageFor('autre')).toBeNull();
  });

  it.each([
    ['un corps absent', undefined],
    ['une page HTML', '<html>502 Bad Gateway</html>'],
    ['un JSON hors contrat', { error: 'oups' }],
    ['un corps illisible', { unreadable: 'SyntaxError' }],
  ])('retombe sur le statut HTTP avec %s', (_label, body) => {
    const error = errorFromResponse(502, body);

    expect(error).toBeInstanceOf(ServerError);
    expect(error.message).toContain('HTTP 502');
    expect(error.code).toBeNull();
    expect(error.requestId).toBeNull();
  });
});
