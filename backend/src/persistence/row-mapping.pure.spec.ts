import { toCellRow, toColumn } from './row-mapping.pure.js';

const ID = '00000000-0000-4000-8000-000000000001';

describe('toColumn', () => {
  it('convertit une ligne en colonne du domaine', () => {
    expect(toColumn({ id: ID, name: 'Nom', type: 'text', position: 0 })).toEqual({
      id: ID,
      name: 'Nom',
      type: 'text',
      position: 0,
    });
  });

  it.each([
    ['un id qui n’est pas un UUID', { id: 'abc', name: 'Nom', type: 'text', position: 0 }],
    ['un type inconnu', { id: ID, name: 'Nom', type: 'boolean', position: 0 }],
  ])('signale une base incohérente: %s', (_label, row) => {
    expect(() => toColumn(row)).toThrow();
  });
});

describe('toCellRow', () => {
  it('conserve les valeurs brutes pour que le domaine les valide', () => {
    const row = {
      contactId: ID.toUpperCase(),
      columnId: ID,
      valueText: null,
      valueNumber: '42.50',
      valueDate: null,
    };

    expect(toCellRow(row)).toEqual({ ...row, contactId: ID });
  });

  it('signale un id de contact invalide', () => {
    expect(() =>
      toCellRow({
        contactId: 'x',
        columnId: ID,
        valueText: null,
        valueNumber: null,
        valueDate: null,
      }),
    ).toThrow();
  });
});
