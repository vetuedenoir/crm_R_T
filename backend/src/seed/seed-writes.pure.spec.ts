import { buildColumn, columnId } from '../testing/factories.js';

import type { SeedContact } from './generate-contacts.pure.js';
import { toSeedCellWrites } from './seed-writes.pure.js';

const columns = [
  buildColumn({ id: columnId(1), name: 'Nom', type: 'text' }),
  buildColumn({ id: columnId(2), name: 'Entreprise', type: 'text' }),
  buildColumn({ id: columnId(3), name: 'Téléphone', type: 'phone' }),
  buildColumn({ id: columnId(4), name: 'Date', type: 'date' }),
  buildColumn({ id: columnId(5), name: 'Score', type: 'number' }),
];

const contact: SeedContact = {
  name: 'Ada Lovelace',
  company: 'Analytical Engines',
  phone: '+33612345678',
  date: '2024-02-29',
  score: 42,
};

describe('toSeedCellWrites', () => {
  it('[R17] écrit une cellule par colonne, au format de stockage du type', () => {
    const result = toSeedCellWrites(contact, columns);

    expect(result).toEqual({
      ok: true,
      value: [
        { columnId: columnId(1), stored: { column: 'value_text', value: 'Ada Lovelace' } },
        { columnId: columnId(2), stored: { column: 'value_text', value: 'Analytical Engines' } },
        { columnId: columnId(3), stored: { column: 'value_text', value: '+33612345678' } },
        { columnId: columnId(4), stored: { column: 'value_date', value: '2024-02-29' } },
        { columnId: columnId(5), stored: { column: 'value_number', value: 42 } },
      ],
    });
  });

  it('[R17] une valeur absente ne produit aucune cellule (cellule vide = pas de ligne)', () => {
    const result = toSeedCellWrites({ ...contact, company: null, phone: null }, columns);

    expect(result.ok && result.value.map((write) => write.columnId)).toEqual([
      columnId(1),
      columnId(4),
      columnId(5),
    ]);
  });

  it('[R17] nomme les colonnes par défaut introuvables', () => {
    const result = toSeedCellWrites(contact, columns.slice(0, 3));

    expect(result).toEqual({
      ok: false,
      error: 'Colonnes par défaut introuvables : « Date » (date), « Score » (number)',
    });
  });

  it('[R17] ne retrouve pas une colonne qui a le bon nom mais un autre type', () => {
    const wrongType = columns.map((column) =>
      column.name === 'Score' ? { ...column, type: 'text' as const } : column,
    );

    expect(toSeedCellWrites(contact, wrongType).ok).toBe(false);
  });

  it('[R16] refuse une valeur que le registre de types rejette', () => {
    const result = toSeedCellWrites({ ...contact, date: '2024-02-30' }, columns);

    expect(result.ok).toBe(false);
  });
});
