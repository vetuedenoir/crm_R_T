import { columnId, contactId } from '../testing/factories.js';

import { buildCellsUpsert, type NewCell } from './cells-upsert.pure.js';

const text: NewCell = {
  contactId: contactId(1),
  columnId: columnId(1),
  stored: { column: 'value_text', value: 'Ada' },
};
const number: NewCell = {
  contactId: contactId(1),
  columnId: columnId(2),
  stored: { column: 'value_number', value: 42 },
};
const date: NewCell = {
  contactId: contactId(2),
  columnId: columnId(3),
  stored: { column: 'value_date', value: '2024-02-29' },
};

describe('buildCellsUpsert', () => {
  it('ne produit aucune requête pour zéro cellule', () => {
    expect(buildCellsUpsert([])).toBeNull();
  });

  it.each([
    ['texte', text, ['Ada', null, null]],
    ['nombre', number, [null, 42, null]],
    ['date', date, [null, null, '2024-02-29']],
  ])('ne renseigne que la colonne de valeur du type %s', (_label, cell, values) => {
    expect(buildCellsUpsert([cell])?.params).toEqual([cell.contactId, cell.columnId, ...values]);
  });

  it('groupe toutes les cellules dans un seul INSERT avec des paramètres liés', () => {
    const statement = buildCellsUpsert([text, number, date]);

    expect(statement?.sql).toContain(
      'VALUES ($1, $2, $3, $4, $5), ($6, $7, $8, $9, $10), ($11, $12, $13, $14, $15)',
    );
    expect(statement?.params).toHaveLength(15);
  });

  it('ne met jamais une valeur dans le texte du SQL', () => {
    const hostile: NewCell = {
      ...text,
      stored: { column: 'value_text', value: "'); DROP TABLE cells;--" },
    };

    expect(buildCellsUpsert([hostile])?.sql).not.toContain('DROP');
  });
});
