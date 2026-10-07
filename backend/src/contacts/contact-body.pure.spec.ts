import { parseCellValue, type CellValue, type Contact } from '../domain/index.js';
import { columnId, contactId } from '../testing/factories.js';

import { toContactBody } from './contact-body.pure.js';

// Les valeurs nominales (`IsoDate`, `PhoneNumber`) ne se fabriquent que par le registre.
function cell(type: 'text' | 'number' | 'date' | 'phone', raw: unknown): CellValue {
  const parsed = parseCellValue(type, raw);
  if (!parsed.ok) {
    throw new Error(parsed.error.message);
  }
  return parsed.value;
}

describe('toContactBody', () => {
  it('[R1] expose la valeur brute de chaque cellule, indexée par colonne', () => {
    const contact: Contact = {
      id: contactId(1),
      cells: {
        [columnId(1)]: cell('text', 'Ada'),
        [columnId(2)]: cell('number', 12.5),
        [columnId(3)]: cell('date', '2024-02-29'),
        [columnId(4)]: cell('phone', '+33 6 12 34 56 78'),
      },
    };

    expect(toContactBody(contact)).toEqual({
      id: contactId(1),
      cells: {
        [columnId(1)]: 'Ada',
        [columnId(2)]: 12.5,
        [columnId(3)]: '2024-02-29',
        [columnId(4)]: '+33612345678',
      },
    });
  });

  it('[R1] un contact sans cellule a un objet `cells` vide', () => {
    expect(toContactBody({ id: contactId(1), cells: {} })).toEqual({
      id: contactId(1),
      cells: {},
    });
  });
});
