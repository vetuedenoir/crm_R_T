import { readContactIds, readCount, toCellRow, toColumn } from './row-mapping.pure.js';

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

describe('readContactIds', () => {
  it('convertit les lignes en identifiants, dans l’ordre reçu', () => {
    const other = '00000000-0000-4000-8000-000000000002';

    expect(readContactIds([{ id: other.toUpperCase() }, { id: ID }])).toEqual([other, ID]);
  });

  it.each([
    ['un résultat qui n’est pas une liste', { id: ID }],
    ['une ligne sans id', [{ name: 'x' }]],
    ['un id qui n’est pas un UUID', [{ id: 'abc' }]],
  ])('signale une réponse inattendue: %s', (_label, raw) => {
    expect(() => readContactIds(raw)).toThrow();
  });
});

describe('readCount', () => {
  it.each([
    ['une chaîne (bigint du pilote)', [{ total: '500' }], 500],
    ['zéro', [{ total: '0' }], 0],
  ])('lit le total depuis %s', (_label, raw, expected) => {
    expect(readCount(raw)).toBe(expected);
  });

  it.each([
    ['aucune ligne', []],
    ['un total absent', [{}]],
    ['un total négatif', [{ total: '-1' }]],
    ['un total non numérique', [{ total: 'beaucoup' }]],
  ])('signale une réponse inattendue: %s', (_label, raw) => {
    expect(() => readCount(raw)).toThrow();
  });
});
