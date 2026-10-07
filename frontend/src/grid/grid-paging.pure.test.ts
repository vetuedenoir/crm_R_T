import { describe, expect, it } from 'vitest';

import { buildContact } from '../mocks';

import { formatContactCount } from './contact-count.pure';
import {
  PREFETCH_THRESHOLD,
  flattenPages,
  latestTotal,
  shouldFetchNextPage,
  virtualRowCount,
  type PagingState,
} from './grid-paging.pure';

const IDLE: PagingState = {
  lastVisibleIndex: 0,
  loadedCount: 50,
  hasNextPage: true,
  isFetching: false,
  hasFetchError: false,
};

describe('shouldFetchNextPage', () => {
  it.each<readonly [string, Partial<PagingState>, boolean]>([
    ['loin du bas', { lastVisibleIndex: 10 }, false],
    ['juste avant le seuil', { lastVisibleIndex: 50 - PREFETCH_THRESHOLD - 1 }, false],
    ['au seuil', { lastVisibleIndex: 50 - PREFETCH_THRESHOLD }, true],
    ['sur une ligne squelette', { lastVisibleIndex: 200 }, true],
    ['tout est chargé', { lastVisibleIndex: 49, hasNextPage: false }, false],
    ['un chargement est déjà en cours', { lastVisibleIndex: 49, isFetching: true }, false],
    ['la page précédente a échoué', { lastVisibleIndex: 49, hasFetchError: true }, false],
    ['aucune ligne rendue mais peu de données', { lastVisibleIndex: -1, loadedCount: 5 }, true],
    ['aucune ligne rendue, beaucoup de données', { lastVisibleIndex: -1 }, false],
  ])('[R2] %s', (_label, overrides, expected) => {
    expect(shouldFetchNextPage({ ...IDLE, ...overrides })).toBe(expected);
  });
});

describe('virtualRowCount', () => {
  it.each([
    [{ loadedCount: 50, total: 1000, hasNextPage: true }, 1000],
    [{ loadedCount: 1000, total: 1000, hasNextPage: false }, 1000],
    [{ loadedCount: 0, total: 0, hasNextPage: false }, 0],
    // Des contacts supprimés pendant le défilement : pas de lignes squelette orphelines.
    [{ loadedCount: 98, total: 100, hasNextPage: false }, 98],
    // Des contacts ajoutés : le total d'une page plus ancienne ne doit pas masquer des lignes chargées.
    [{ loadedCount: 52, total: 50, hasNextPage: true }, 52],
  ])('[R2] %j -> %i lignes', (input, expected) => {
    expect(virtualRowCount(input)).toBe(expected);
  });
});

describe('flattenPages et latestTotal', () => {
  const page = (offset: number, total: number, indexes: ReadonlyArray<number>) => ({
    items: indexes.map((index) => buildContact(index)),
    total,
    offset,
    limit: 2,
  });

  it('[R2] concatène les pages dans l’ordre et retient le total le plus récent', () => {
    const pages = [page(0, 4, [1, 2]), page(2, 5, [3, 4])];

    expect(flattenPages(pages).map((contact) => contact.id)).toEqual(
      [1, 2, 3, 4].map((index) => buildContact(index).id),
    );
    expect(latestTotal(pages)).toBe(5);
  });

  it('[R2] ne contient rien tant qu’aucune page n’est chargée', () => {
    expect(flattenPages([])).toEqual([]);
    expect(latestTotal([])).toBe(0);
  });
});

describe('formatContactCount', () => {
  it.each([
    [0, '0 contact'],
    [1, '1 contact'],
    [2, '2 contacts'],
    [1000, '1 000 contacts'],
  ])('[R1] %i -> « %s »', (total, expected) => {
    expect(formatContactCount(total)).toBe(expected);
  });
});
