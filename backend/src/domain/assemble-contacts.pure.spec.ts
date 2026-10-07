import { errorOf } from '../testing/error-of.js';
import { buildColumn, columnId, contactId } from '../testing/factories.js';

import { assembleContacts } from './assemble-contacts.pure.js';
import type { CellRow, Column } from './column.js';

const NAME = buildColumn({ id: columnId(1), type: 'text' });
const SCORE = buildColumn({ id: columnId(2), type: 'number' });
const BIRTH = buildColumn({ id: columnId(3), type: 'date' });
const PHONE = buildColumn({ id: columnId(4), type: 'phone' });
const COLUMNS = [NAME, SCORE, BIRTH, PHONE];

const FIELD_BY_TYPE: Readonly<Record<Column['type'], 'valueText' | 'valueNumber' | 'valueDate'>> = {
  text: 'valueText',
  phone: 'valueText',
  number: 'valueNumber',
  date: 'valueDate',
};

// La valeur va dans la seule colonne de valeur propre au type, comme en base (CHECK ≤ 1 renseignée).
function row(contact: number, column: Column, value: unknown): CellRow {
  const empty = { valueText: null, valueNumber: null, valueDate: null };
  return {
    contactId: contactId(contact),
    columnId: column.id,
    ...empty,
    [FIELD_BY_TYPE[column.type]]: value,
  };
}

describe('assembleContacts', () => {
  it('[R1] regroupe les cellules de chaque contact et les étiquette par type', () => {
    const result = assembleContacts(
      [contactId(10)],
      [
        row(10, NAME, 'Alice'),
        row(10, SCORE, '12.50'),
        row(10, BIRTH, '1990-04-12'),
        row(10, PHONE, '+33612345678'),
      ],
      COLUMNS,
    );
    expect(result).toEqual({
      ok: true,
      value: [
        {
          id: contactId(10),
          cells: {
            [NAME.id]: { type: 'text', value: 'Alice' },
            [SCORE.id]: { type: 'number', value: 12.5 },
            [BIRTH.id]: { type: 'date', value: '1990-04-12' },
            [PHONE.id]: { type: 'phone', value: '+33612345678' },
          },
        },
      ],
    });
  });

  it("[R15] respecte l'ordre des ids reçus, pas l'ordre des lignes", () => {
    const result = assembleContacts(
      [contactId(3), contactId(1), contactId(2)],
      [row(1, NAME, 'un'), row(2, NAME, 'deux'), row(3, NAME, 'trois')],
      COLUMNS,
    );
    expect(result.ok ? result.value.map((contact) => contact.id) : []).toEqual([
      contactId(3),
      contactId(1),
      contactId(2),
    ]);
    expect(result.ok ? result.value[0]?.cells[NAME.id] : null).toEqual({
      type: 'text',
      value: 'trois',
    });
  });

  it("[R14] une cellule vide n'a pas d'entrée, un contact sans cellule reste présent", () => {
    const result = assembleContacts([contactId(1), contactId(2)], [row(1, NAME, 'Alice')], COLUMNS);
    expect(result).toEqual({
      ok: true,
      value: [
        { id: contactId(1), cells: { [NAME.id]: { type: 'text', value: 'Alice' } } },
        { id: contactId(2), cells: {} },
      ],
    });
  });

  it('[R1] sans contact, retourne une liste vide', () => {
    expect(assembleContacts([], [], COLUMNS)).toEqual({ ok: true, value: [] });
  });

  it("[R11] ignore les cellules d'une colonne absente de l'instantané et d'un contact hors page", () => {
    const result = assembleContacts(
      [contactId(1)],
      [row(1, NAME, 'Alice'), row(1, SCORE, 5), row(2, NAME, 'Bob')],
      [NAME],
    );
    expect(result).toEqual({
      ok: true,
      value: [{ id: contactId(1), cells: { [NAME.id]: { type: 'text', value: 'Alice' } } }],
    });
  });

  it.each([
    ['une valeur illisible pour le type', row(1, SCORE, 'abc')],
    ['une date impossible', row(1, BIRTH, '2024-02-30')],
    ['une cellule sans valeur', row(1, NAME, null)],
    [
      "une cellule dont la colonne de valeur est celle d'un autre type",
      {
        ...row(1, SCORE, null),
        valueText: '12',
      },
    ],
  ])("[R16] signale %s au lieu de l'omettre en silence", (_cas, corrupted) => {
    const result = assembleContacts([contactId(1)], [row(1, NAME, 'Alice'), corrupted], COLUMNS);
    const error = errorOf(result);
    expect(error).toMatchObject({ contactId: contactId(1), columnId: corrupted.columnId });
    expect(error.message).not.toBe('');
  });
});
