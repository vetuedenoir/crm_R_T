import { describe, expect, it } from 'vitest';

import type { ContactsPage } from '../api';
import { buildContact } from '../mocks';

import { nextPageOffset } from './next-page-offset.pure';

function page(offset: number, count: number, total: number): ContactsPage {
  return {
    items: Array.from({ length: count }, (_unused, index) => buildContact(offset + index)),
    total,
    offset,
    limit: 50,
  };
}

describe('nextPageOffset', () => {
  it.each([
    ['première page d’une liste plus longue', page(0, 50, 120), 50],
    ['page intermédiaire', page(50, 50, 120), 100],
    ['dernière page, partielle', page(100, 20, 120), undefined],
    ['dernière page, pleine', page(50, 50, 100), undefined],
    ['liste vide', page(0, 0, 0), undefined],
    ['page vide alors que total en annonce encore', page(100, 0, 120), undefined],
  ])('%s', (_label, lastPage, expected) => {
    expect(nextPageOffset(lastPage)).toBe(expected);
  });
});
