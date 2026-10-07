import { contactId } from '../testing/factories.js';

import { cellWriteError, contactNotFound, queryError } from './contact-errors.pure.js';

describe('erreurs des contacts', () => {
  it('[R5] un contact absent est une 404 CONTACT_NOT_FOUND', () => {
    expect(contactNotFound(contactId(1))).toMatchObject({
      code: 'CONTACT_NOT_FOUND',
      httpStatus: 404,
    });
  });

  it.each([
    ['INVALID_SORT', 400],
    ['INVALID_FILTER', 400],
    ['BAD_REQUEST', 400],
  ] as const)('[R7][R8] une requête %s donne le statut %i', (code, status) => {
    const error = queryError({ code, field: 'sort', message: 'm' });

    expect(error).toMatchObject({ code, httpStatus: status, details: [{ field: 'sort' }] });
  });

  it('[R16] des valeurs invalides donnent une 422 avec un détail par cellule', () => {
    const error = cellWriteError([
      { kind: 'INVALID_VALUE', field: 'a', message: 'ma' },
      { kind: 'INVALID_VALUE', field: 'b', message: 'mb' },
    ]);

    expect(error).toMatchObject({
      code: 'VALIDATION_FAILED',
      httpStatus: 422,
      details: [
        { field: 'a', message: 'ma' },
        { field: 'b', message: 'mb' },
      ],
    });
  });

  it('une colonne inconnue l’emporte : 404 COLUMN_NOT_FOUND', () => {
    const error = cellWriteError([
      { kind: 'INVALID_VALUE', field: 'a', message: 'ma' },
      { kind: 'UNKNOWN_COLUMN', field: 'b', message: 'mb' },
    ]);

    expect(error).toMatchObject({ code: 'COLUMN_NOT_FOUND', httpStatus: 404 });
    expect(error.details).toHaveLength(2);
  });
});
