import { describe, expect, it } from 'vitest';

import {
  NetworkError,
  NotFoundError,
  RequestRejectedError,
  ServerError,
  UnexpectedResponseError,
  ValidationApiError,
} from '../api';

import { describeError } from './describe-error.pure';

describe('describeError', () => {
  it.each([
    [
      'réseau',
      new NetworkError({ message: 'technique' }),
      'Le serveur est injoignable. Vérifiez votre connexion.',
    ],
    [
      'introuvable',
      new NotFoundError({ message: 'technique' }),
      'Élément introuvable : il a peut-être été supprimé.',
    ],
    [
      'serveur',
      new ServerError({ message: 'technique' }),
      'Le serveur a rencontré une erreur. Réessayez dans un instant.',
    ],
    [
      'réponse inattendue',
      new UnexpectedResponseError({ message: 'technique' }),
      'Le serveur a envoyé une réponse inattendue.',
    ],
    ['validation', new ValidationApiError({ message: 'Nom vide' }, []), 'Nom vide'],
    [
      'requête refusée',
      new RequestRejectedError({ message: 'Nom déjà utilisé' }),
      'Nom déjà utilisé',
    ],
    ['erreur inconnue', new TypeError('boom'), 'Une erreur inattendue est survenue.'],
    ['valeur non-erreur', 'texte', 'Une erreur inattendue est survenue.'],
  ])('erreur %s', (_label, error, expected) => {
    expect(describeError(error)).toBe(expected);
  });
});
