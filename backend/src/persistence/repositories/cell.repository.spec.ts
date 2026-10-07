import type { DataSource } from 'typeorm';

import { clearTables, createTestDataSource } from '../../testing/test-database.js';

import { CellRepository } from './cell.repository.js';
import { ColumnRepository } from './column.repository.js';
import { ContactRepository } from './contact.repository.js';

describe('CellRepository (PostgreSQL réel)', () => {
  let dataSource: DataSource;
  let cells: CellRepository;
  let columns: ColumnRepository;
  let contacts: ContactRepository;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    cells = new CellRepository(dataSource);
    columns = new ColumnRepository(dataSource);
    contacts = new ContactRepository(dataSource);
  });

  beforeEach(async () => {
    await clearTables(dataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  async function setup() {
    const text = await columns.insert({ name: 'Nom', type: 'text', position: 0 });
    const number = await columns.insert({ name: 'Score', type: 'number', position: 1 });
    const date = await columns.insert({ name: 'Date', type: 'date', position: 2 });
    return { text, number, date, contact: await contacts.insert() };
  }

  it('[R14] relit chaque type de valeur sous la forme attendue par le domaine', async () => {
    const { text, number, date, contact } = await setup();

    await cells.upsertMany([
      { contactId: contact, columnId: text.id, stored: { column: 'value_text', value: 'Ada' } },
      { contactId: contact, columnId: number.id, stored: { column: 'value_number', value: 0.1 } },
      {
        contactId: contact,
        columnId: date.id,
        stored: { column: 'value_date', value: '2024-02-29' },
      },
    ]);

    const rows = await cells.findByContactIds([contact]);
    const byColumn = new Map(rows.map((row) => [row.columnId, row] as const));
    expect(byColumn.get(text.id)?.valueText).toBe('Ada');
    // `numeric` revient en chaîne exacte (pas de 0.1 + 0.2 flottant) ; `date` en `YYYY-MM-DD`, sans fuseau.
    expect(byColumn.get(number.id)?.valueNumber).toBe('0.1');
    expect(byColumn.get(date.id)?.valueDate).toBe('2024-02-29');
  });

  it('[R6] remplace la valeur existante au lieu d’ajouter une ligne', async () => {
    const { text, contact } = await setup();
    const write = (value: string) =>
      cells.upsertMany([
        { contactId: contact, columnId: text.id, stored: { column: 'value_text', value } },
      ]);

    await write('Ada');
    await write('Grace');

    const rows = await cells.findByContactIds([contact]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.valueText).toBe('Grace');
  });

  it('[R14] ne renvoie que les cellules des contacts demandés', async () => {
    const { text, contact } = await setup();
    const other = await contacts.insert();
    await cells.upsertMany([
      { contactId: contact, columnId: text.id, stored: { column: 'value_text', value: 'A' } },
      { contactId: other, columnId: text.id, stored: { column: 'value_text', value: 'B' } },
    ]);

    const rows = await cells.findByContactIds([other]);

    expect(rows.map((row) => row.valueText)).toEqual(['B']);
    expect(await cells.findByContactIds([])).toEqual([]);
  });

  it('ne fait rien pour une liste de cellules vide', async () => {
    await expect(cells.upsertMany([])).resolves.toBeUndefined();
  });

  it('[R6] vider une cellule supprime sa ligne', async () => {
    const { text, number, contact } = await setup();
    await cells.upsertMany([
      { contactId: contact, columnId: text.id, stored: { column: 'value_text', value: 'A' } },
      { contactId: contact, columnId: number.id, stored: { column: 'value_number', value: 1 } },
    ]);

    await cells.deleteMany(contact, [text.id]);

    const rows = await cells.findByContactIds([contact]);
    expect(rows.map((row) => row.columnId)).toEqual([number.id]);
  });

  it('[R11] supprimer une colonne efface ses cellules en cascade', async () => {
    const { text, number, contact } = await setup();
    await cells.upsertMany([
      { contactId: contact, columnId: text.id, stored: { column: 'value_text', value: 'A' } },
      { contactId: contact, columnId: number.id, stored: { column: 'value_number', value: 1 } },
    ]);

    await columns.deleteById(text.id);

    const rows = await cells.findByContactIds([contact]);
    expect(rows.map((row) => row.columnId)).toEqual([number.id]);
  });

  it('[R5] supprimer un contact efface ses cellules en cascade', async () => {
    const { text, contact } = await setup();
    await cells.upsertMany([
      { contactId: contact, columnId: text.id, stored: { column: 'value_text', value: 'A' } },
    ]);

    await contacts.deleteById(contact);

    expect(await cells.findByContactIds([contact])).toEqual([]);
  });

  it('refuse une injection : la valeur hostile est stockée telle quelle, sans effet', async () => {
    const { text, contact } = await setup();
    const hostile = "'); DROP TABLE cells;--";

    await cells.upsertMany([
      { contactId: contact, columnId: text.id, stored: { column: 'value_text', value: hostile } },
    ]);

    expect((await cells.findByContactIds([contact]))[0]?.valueText).toBe(hostile);
  });
});
