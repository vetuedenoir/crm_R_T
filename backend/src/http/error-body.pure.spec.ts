import { AppError } from '../errors/index.js';

import { toErrorBody } from './error-body.pure.js';

describe('toErrorBody', () => {
  it("produit l'enveloppe uniforme { error: { code, message, details, requestId } }", () => {
    const error = new AppError('VALIDATION_FAILED', 'Valeur invalide', [
      { field: 'abc', message: 'trop long' },
    ]);

    expect(toErrorBody(error, 'req-1')).toEqual({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Valeur invalide',
        details: [{ field: 'abc', message: 'trop long' }],
        requestId: 'req-1',
      },
    });
  });
});
