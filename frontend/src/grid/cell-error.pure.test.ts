import { describe, expect, it } from 'vitest';

import { NetworkError, NotFoundError, ServerError, ValidationApiError } from '../api';
import { buildColumn } from '../mocks';

import { cellErrorMessage } from './cell-error.pure';

const COLUMN = buildColumn({ position: 4 }).id;
const OTHER_COLUMN = buildColumn({ position: 1 }).id;

describe('cellErrorMessage', () => {
  it('[R16] affiche le message du serveur rattaché à la colonne éditée', () => {
    const error = new ValidationApiError({ message: 'Certaines valeurs sont invalides' }, [
      { field: OTHER_COLUMN, message: 'Autre colonne' },
      { field: COLUMN, message: 'Le nombre est invalide' },
    ]);

    expect(cellErrorMessage(error, COLUMN)).toBe('Le nombre est invalide');
  });

  it('[R16] retombe sur le message général si aucun détail ne vise la colonne', () => {
    const error = new ValidationApiError({ message: 'Certaines valeurs sont invalides' }, []);

    expect(cellErrorMessage(error, COLUMN)).toBe('Certaines valeurs sont invalides');
  });

  it.each([
    [
      'réseau coupé',
      new NetworkError({ message: 'x' }),
      'Le serveur est injoignable. Vérifiez votre connexion.',
    ],
    [
      'contact supprimé',
      new NotFoundError({ message: 'x' }),
      'Élément introuvable : il a peut-être été supprimé.',
    ],
    [
      'panne serveur',
      new ServerError({ message: 'x' }),
      'Le serveur a rencontré une erreur. Réessayez dans un instant.',
    ],
    ['erreur inconnue', new Error('boom'), 'Une erreur inattendue est survenue.'],
  ])('%s', (_label, error, expected) => {
    expect(cellErrorMessage(error, COLUMN)).toBe(expected);
  });
});
