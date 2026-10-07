import { describe, expect, it } from 'vitest';

import type { ContactsPage } from '../api';
import { buildColumn, buildContact } from '../mocks';

import { withCellValue, withContact, type ContactsData } from './contacts-cache.pure';

const NAME = buildColumn({ position: 0 }).id;
const SCORE = buildColumn({ position: 4 }).id;

function page(offset: number, ...indexes: ReadonlyArray<number>): ContactsPage {
  return {
    items: indexes.map((index) =>
      buildContact(index, { [NAME]: `Contact ${String(index)}`, [SCORE]: index }),
    ),
    total: 4,
    offset,
    limit: 2,
  };
}

function data(): ContactsData {
  return { pages: [page(0, 1, 2), page(2, 3, 4)], pageParams: [0, 2] };
}

describe('withCellValue', () => {
  it('[R6] change une cellule sans toucher aux autres', () => {
    const result = withCellValue(data(), buildContact(3).id, NAME, 'Ada');

    expect(result.pages[1]?.items[0]?.cells).toEqual({ [NAME]: 'Ada', [SCORE]: 3 });
    expect(result.pages[1]?.items[1]).toEqual(data().pages[1]?.items[1]);
  });

  it.each([null, undefined])('[R6] %s vide la cellule : la clé disparaît', (empty) => {
    const result = withCellValue(data(), buildContact(1).id, SCORE, empty);

    expect(result.pages[0]?.items[0]?.cells).toEqual({ [NAME]: 'Contact 1' });
  });

  it('[R6] garde les références de ce qui ne change pas', () => {
    const before = data();
    const result = withCellValue(before, buildContact(3).id, NAME, 'Ada');

    expect(result.pages[0]).toBe(before.pages[0]);
    expect(result.pages[1]?.items[1]).toBe(before.pages[1]?.items[1]);
  });

  it('[R6] rend les mêmes données si le contact n’est pas chargé', () => {
    const before = data();

    expect(withCellValue(before, buildContact(99).id, NAME, 'Ada')).toBe(before);
  });

  it('[R6] ne modifie pas les données reçues', () => {
    const before = data();
    withCellValue(before, buildContact(1).id, NAME, 'Ada');

    expect(before).toEqual(data());
  });
});

describe('withContact', () => {
  it('[R6] remplace le contact par la version du serveur', () => {
    const fromServer = buildContact(2, { [NAME]: 'Normalisé' });

    const result = withContact(data(), fromServer);

    expect(result.pages[0]?.items[1]).toBe(fromServer);
    expect(result.pages[0]?.items[0]).toEqual(data().pages[0]?.items[0]);
  });
});
