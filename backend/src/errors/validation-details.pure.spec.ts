import { flattenValidationErrors, requestValidationError } from './validation-details.pure.js';

describe('flattenValidationErrors', () => {
  it('produit un détail par contrainte violée', () => {
    expect(
      flattenValidationErrors([
        {
          property: 'limit',
          constraints: { max: 'limit trop grand', isInt: 'limit doit être entier' },
        },
      ]),
    ).toEqual([
      { field: 'limit', message: 'limit trop grand' },
      { field: 'limit', message: 'limit doit être entier' },
    ]);
  });

  it('préfixe le chemin des propriétés imbriquées', () => {
    expect(
      flattenValidationErrors([
        {
          property: 'filters',
          children: [
            {
              property: '0',
              children: [{ property: 'operator', constraints: { isIn: 'inconnu' } }],
            },
          ],
        },
      ]),
    ).toEqual([{ field: 'filters.0.operator', message: 'inconnu' }]);
  });

  it('retourne une liste vide sans erreur', () => {
    expect(flattenValidationErrors([])).toEqual([]);
  });
});

describe('requestValidationError', () => {
  it('construit une VALIDATION_FAILED (422) avec les détails', () => {
    const error = requestValidationError([
      { property: 'name', constraints: { isString: 'invalide' } },
    ]);

    expect(error).toMatchObject({
      code: 'VALIDATION_FAILED',
      httpStatus: 422,
      details: [{ field: 'name', message: 'invalide' }],
    });
  });
});
