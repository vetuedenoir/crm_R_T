import { describe, expect, it } from 'vitest';

import {
  NetworkError,
  NotFoundError,
  RequestRejectedError,
  ServerError,
  UnexpectedResponseError,
  ValidationApiError,
} from '../api';

import { retryDelay, shouldRetry } from './retry-policy.pure';

const info = { message: 'x' };

describe('shouldRetry', () => {
  it.each([
    ['réseau', new NetworkError(info), true],
    ['serveur', new ServerError(info), true],
    ['introuvable', new NotFoundError(info), false],
    ['validation', new ValidationApiError(info, []), false],
    ['requête refusée', new RequestRejectedError(info), false],
    ['réponse inattendue', new UnexpectedResponseError(info), false],
    ['erreur inconnue', new Error('x'), false],
  ])('erreur %s au premier échec : %s', (_label, error, expected) => {
    expect(shouldRetry(0, error)).toBe(expected);
  });

  it.each([
    [0, true],
    [1, true],
    [2, false],
    [3, false],
  ])('après %i échec(s) d’une erreur réseau : %s', (failureCount, expected) => {
    expect(shouldRetry(failureCount, new NetworkError(info))).toBe(expected);
  });
});

describe('retryDelay', () => {
  it.each([
    [0, 1000],
    [1, 2000],
    [2, 4000],
    [3, 8000],
    [10, 8000],
  ])('essai %i : %i ms', (attempt, expected) => {
    expect(retryDelay(attempt)).toBe(expected);
  });
});
